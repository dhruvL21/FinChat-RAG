'use client';

import React from 'react';
import Image from 'next/image';

interface FinchatLogoProps {
  size?: number;
  className?: string;
  alt?: string;
}

/**
 * Official Brand Logo for Finchat
 * Features the signature stylized 'F' financial growth emblem with trend bars and node.
 */
export function FinchatLogo({
  size = 32,
  className = 'w-8 h-8 object-contain',
  alt = 'Finchat Logo'
}: FinchatLogoProps) {
  return (
    <Image
      src="/brand-logo.png"
      width={size}
      height={size}
      alt={alt}
      className={className}
      priority
      unoptimized
    />
  );
}

/**
 * Badge emblem variant for navbar, headers, and app indicators.
 * Uses the high-contrast dark squircle app tile.
 */
export function FinchatBadgeLogo({
  size = 36,
  className = 'w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain',
  alt = 'Finchat'
}: FinchatLogoProps) {
  return (
    <Image
      src="/brand-tile-dark.png"
      width={size}
      height={size}
      alt={alt}
      className={className}
      priority
      unoptimized
    />
  );
}
