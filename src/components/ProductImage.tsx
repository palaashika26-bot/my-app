'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Package, Upload } from 'lucide-react';

function toKey(name: string) {
  return 'product-image-' + name.toLowerCase().replace(/\s+/g, '-');
}

interface ProductImageProps {
  productName: string;
  canUpload: boolean;
  /** Fill mode: renders absolutely inside a relative parent; placeholder hidden so parent bg shows */
  fill?: boolean;
  onUpload?: (base64: string) => void;
}

export default function ProductImage({ productName, canUpload, fill = false, onUpload }: ProductImageProps) {
  const [img, setImg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(toKey(productName));
    setImg(stored || null);
  }, [productName]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = ev.target?.result as string;
      localStorage.setItem(toKey(productName), base64);
      setImg(base64);
      onUpload?.(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  if (fill) {
    return (
      <>
        {img && (
          <img src={img} alt={productName} className="absolute inset-0 w-full h-full object-cover" />
        )}
        {canUpload && (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title="Upload product image"
              className="absolute inset-0 w-full h-full flex items-end justify-center pb-1 opacity-0 hover:opacity-100 transition-opacity z-10 hover:bg-black/30"
            >
              <span className="text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded">📷 Change</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </>
        )}
      </>
    );
  }

  if (!canUpload) {
    return img ? (
      <img src={img} alt={productName} className="w-12 h-12 rounded object-cover" />
    ) : (
      <div className="w-12 h-12 rounded bg-muted border border-border flex items-center justify-center">
        <span className="text-2xl">📦</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        title="Click to upload product image"
        className="group relative w-10 h-10 rounded-lg overflow-hidden border border-border hover:border-[#4A3B52] transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
      >
        {img ? (
          <>
            <img src={img} alt={productName} className="w-full h-full object-cover" />
            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Upload className="w-3.5 h-3.5 text-white" />
            </span>
          </>
        ) : (
          <span className="w-full h-full bg-muted flex items-center justify-center group-hover:bg-[#4A3B52]/10 transition-colors">
            <Package className="w-5 h-5 text-muted-foreground group-hover:text-[#4A3B52] transition-colors" />
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="text-[10px] text-muted-foreground hover:text-[#4A3B52] transition-colors"
      >
        📷 Change
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
