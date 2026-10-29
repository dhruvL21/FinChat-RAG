'use server';

import crypto from 'crypto';

export interface CachedDocumentData {
  hash: string;
  filename: string;
  schemaMapping: {
    dateColumnIndex: number;
    descriptionColumnIndex: number;
    amountColumnIndex: number;
    categoryColumnIndex: number;
    explanation: string;
  };
  transactions: Array<{
    date: string;
    description: string;
    amount: number;
    category: string;
  }>;
  cachedAt: string;
}

// Global in-memory cache fallback for instant zero-config caching
const memoryCache = new Map<string, { data: CachedDocumentData; expiresAt: number }>();
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Generate SHA-256 hash of document content
 */
export async function hashDocumentContent(content: string): Promise<string> {
  try {
    return crypto.createHash('sha256').update(content.trim()).digest('hex');
  } catch {
    return Math.random().toString(36).substring(2);
  }
}

/**
 * Get document data from Redis cache or memory fallback
 */
export async function getCachedDocument(contentHash: string): Promise<CachedDocumentData | null> {
  const cacheKey = `doc:${contentHash}`;

  try {
    // 1. Check Upstash / Redis if env is configured
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (redisUrl && redisToken) {
      try {
        const res = await fetch(`${redisUrl}/get/${cacheKey}`, {
          headers: {
            Authorization: `Bearer ${redisToken}`
          },
          cache: 'no-store'
        });
        if (res.ok) {
          const json = await res.json();
          if (json.result) {
            const parsed = typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
            return parsed as CachedDocumentData;
          }
        }
      } catch (err) {
        console.warn("Upstash Redis lookup failed, using memory cache fallback:", err);
      }
    }

    // 2. Memory cache fallback lookup
    const entry = memoryCache.get(cacheKey);
    if (entry) {
      if (Date.now() < entry.expiresAt) {
        return entry.data;
      } else {
        memoryCache.delete(cacheKey);
      }
    }
  } catch (err) {
    console.warn("Error reading cached document:", err);
  }

  return null;
}

/**
 * Save document schema & processed data into Redis cache
 */
export async function setCachedDocument(data: CachedDocumentData, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
  try {
    const cacheKey = `doc:${data.hash}`;

    // 1. Save to Upstash / Redis if configured
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (redisUrl && redisToken) {
      try {
        // Use POST with JSON array to safely transmit large data payloads
        await fetch(`${redisUrl}/set/${cacheKey}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${redisToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([JSON.stringify(data), 'EX', ttlSeconds]),
          cache: 'no-store'
        });
      } catch (err) {
        console.warn("Upstash Redis save failed, using memory fallback:", err);
      }
    }

    // 2. Save to memory cache fallback
    memoryCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });
  } catch (err) {
    console.warn("Error caching document:", err);
  }
}
