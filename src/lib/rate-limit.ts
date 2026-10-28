'use server';

import { logger } from './logger';

interface RateLimitConfig {
  windowMs: number; // Time window in ms (e.g. 60,000ms = 1 min)
  maxRequests: number; // Max allowed requests per window
}

interface RateLimitTracker {
  count: number;
  resetTime: number;
}

// In-memory sliding window fallback map
const memoryStore = new Map<string, RateLimitTracker>();

// Default configuration: 10 requests per minute
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 10
};

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
  error?: string;
}

/**
 * Check and enforce rate limits for client identifiers (IP, User ID, Session Token)
 */
export async function checkRateLimit(
  identifier: string,
  config: Partial<RateLimitConfig> = {}
): Promise<RateLimitResult> {
  const { windowMs, maxRequests } = { ...DEFAULT_CONFIG, ...config };
  const key = `ratelimit:${identifier}`;
  const now = Date.now();

  // 1. Try Upstash Redis if configured
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const windowSeconds = Math.ceil(windowMs / 1000);
      const res = await fetch(`${redisUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, windowSeconds]
        ]),
        cache: 'no-store'
      });

      if (res.ok) {
        const data = await res.json();
        const count = data[0]?.result || 1;
        
        if (count > maxRequests) {
          logger.warn('RateLimit', `Rate limit exceeded for ${identifier}`, { count, maxRequests });
          return {
            success: false,
            limit: maxRequests,
            remaining: 0,
            resetInSeconds: windowSeconds,
            error: `Rate limit exceeded. Maximum ${maxRequests} requests per minute allowed. Please try again in a few seconds.`
          };
        }

        return {
          success: true,
          limit: maxRequests,
          remaining: Math.max(0, maxRequests - count),
          resetInSeconds: windowSeconds
        };
      }
    } catch (err) {
      logger.warn('RateLimit', 'Upstash Redis rate limit failed, using memory store fallback', {}, err);
    }
  }

  // 2. Memory Store Fallback
  const currentTracker = memoryStore.get(key);

  if (!currentTracker || now > currentTracker.resetTime) {
    // Initialize new window
    const resetTime = now + windowMs;
    memoryStore.set(key, { count: 1, resetTime });
    
    // Clean up expired keys periodically
    if (memoryStore.size > 1000) {
      for (const [k, v] of memoryStore.entries()) {
        if (now > v.resetTime) memoryStore.delete(k);
      }
    }

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetInSeconds: Math.ceil(windowMs / 1000)
    };
  }

  // Existing active window
  if (currentTracker.count >= maxRequests) {
    const resetInSeconds = Math.ceil((currentTracker.resetTime - now) / 1000);
    logger.warn('RateLimit', `Memory rate limit exceeded for ${identifier}`, {
      count: currentTracker.count,
      maxRequests,
      resetInSeconds
    });

    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      resetInSeconds,
      error: `Rate limit exceeded. Maximum ${maxRequests} requests per minute allowed. Please try again in ${resetInSeconds} seconds.`
    };
  }

  currentTracker.count += 1;
  const remaining = maxRequests - currentTracker.count;
  const resetInSeconds = Math.ceil((currentTracker.resetTime - now) / 1000);

  return {
    success: true,
    limit: maxRequests,
    remaining,
    resetInSeconds
  };
}
