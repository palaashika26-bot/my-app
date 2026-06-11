'use client';
import React, { useState } from 'react';
import Image from 'next/image';

interface CatalogImageProps {
  src: string;
  alt: string;
  /** Applied to both the next/image and the native <img> fallback (object-fit etc.). */
  className?: string;
  /** Responsive sizes hint so the optimizer serves a small variant on mobile. */
  sizes?: string;
  /** Above-the-fold images can opt out of lazy loading. */
  priority?: boolean;
  onClick?: () => void;
}

// next/image only helps for http(s) sources whose host is allow-listed in
// next.config images.remotePatterns — it resizes them and serves modern formats
// (WebP/AVIF), which is the actual mobile win on the catalog's large product
// photos. base64 `data:`/`blob:` URLs (locally-stored catalog uploads) and empty
// values can't be optimized, so they fall back to a plain lazy <img>. If the
// optimizer ever rejects a URL at runtime, onError degrades to the same <img>,
// so a missing remotePattern can never blank out an image.
export default function CatalogImage({
  src,
  alt,
  className = '',
  sizes = '(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw',
  priority = false,
  onClick,
}: CatalogImageProps) {
  const [optimizerFailed, setOptimizerFailed] = useState(false);
  const optimizable = typeof src === 'string' && /^https?:\/\//i.test(src);

  if (!optimizable || optimizerFailed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onClick={onClick}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      priority={priority}
      onClick={onClick}
      onError={() => setOptimizerFailed(true)}
    />
  );
}
