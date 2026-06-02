'use client';
import React from 'react';
import { createPortal } from 'react-dom';
import { X, Download } from 'lucide-react';

interface ImageLightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export default function ImageLightbox({ src, alt = 'Enlarged image', onClose }: ImageLightboxProps) {
  if (!src || typeof window === 'undefined') return null;

  const isHostedUrl = src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:');

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 z-10 text-white/80 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
        <img
          src={src}
          alt={alt}
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        />
        {isHostedUrl && (
          <a
            href={src}
            download
            target="_blank"
            rel="noreferrer"
            className="block mt-2 text-center text-white/70 hover:text-white underline text-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5 inline mr-1" />
            Download Full Image
          </a>
        )}
      </div>
    </div>,
    document.body
  );
}
