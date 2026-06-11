import axiosClient from './api/axiosClient';
import { getBrowserSupabase } from './supabaseClient';

// Direct-to-storage uploads. The browser asks the backend for a short-lived signed
// upload URL, uploads the bytes straight to Supabase Storage (never through the
// API server), and persists only the resulting object PATH. The backend converts
// paths to signed read URLs on read. A small webp thumbnail is generated client-
// side for list/preview use.

export type UploadScope =
  | 'request-item'
  | 'payment-proof'
  | 'dispute'
  | 'support'
  | 'catalog'
  | 'warehouse'
  | 'logistics-packing'
  | 'logistics-slip';

export interface UploadedFile {
  /** Storage object path to persist (backend signs it on read). */
  url: string;
  /** Storage object path for the generated thumbnail (images only). */
  thumbUrl?: string;
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
// Raw byte cap measured BEFORE compression. Images are re-encoded to WebP client-
// side before upload, so what actually lands in storage is typically well under 1 MB.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

interface SignedUpload {
  path: string;
  token: string;
  signedUrl: string;
}

async function requestSignedUploads(
  scope: UploadScope,
  contentTypes: string[]
): Promise<{ bucket: string; uploads: SignedUpload[] }> {
  const res = await axiosClient.post('/uploads/sign', { scope, contentTypes });
  const data = res.data?.data ?? {};
  return { bucket: data.bucket, uploads: data.uploads ?? [] };
}

// Re-encode an image to WebP via canvas, downscaling so its longest edge is at
// most maxDim. A typical 8-12MP phone photo (3-5 MB JPEG) lands around 300-600 KB.
// Returns the original file unchanged for non-images, or if the browser cannot
// decode/encode it (compression is best-effort and must never block the upload).
async function compressToWebP(file: File, maxDim = 1920, quality = 0.85): Promise<{ body: Blob; contentType: string }> {
  if (!file.type.startsWith('image/')) return { body: file, contentType: file.type };
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { body: file, contentType: file.type };
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const webp = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality)
    );
    if (!webp) return { body: file, contentType: file.type };
    return { body: webp, contentType: 'image/webp' };
  } catch {
    return { body: file, contentType: file.type };
  }
}

// Downscale an image to a small webp thumbnail via canvas. Returns null for
// non-images or if the browser cannot decode the file (thumbnail is best-effort).
async function makeThumbnail(file: File, maxDim = 320, quality = 0.7): Promise<Blob | null> {
  if (!file.type.startsWith('image/')) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality)
    );
  } catch {
    return null;
  }
}

async function putToSignedUrl(
  bucket: string,
  upload: SignedUpload,
  body: Blob,
  contentType: string
): Promise<void> {
  const supabase = getBrowserSupabase();
  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(upload.path, upload.token, body, { contentType });
  if (error) throw error;
}

/**
 * Upload one file (image or short video) plus a generated thumbnail for images.
 * Returns the storage PATHS to persist.
 */
export async function uploadFile(file: File, scope: UploadScope): Promise<UploadedFile> {
  // Compress the full image to WebP (best-effort) and build a small thumbnail.
  // Only the compressed bytes are uploaded — raw base64 is never stored anywhere.
  const main = await compressToWebP(file);
  const thumb = await makeThumbnail(file);
  const contentTypes = [main.contentType, ...(thumb ? ['image/webp'] : [])];
  const { bucket, uploads } = await requestSignedUploads(scope, contentTypes);
  if (!uploads.length) throw new Error('No upload URL returned by the server');

  await putToSignedUrl(bucket, uploads[0], main.body, main.contentType);

  let thumbUrl: string | undefined;
  if (thumb && uploads[1]) {
    try {
      await putToSignedUrl(bucket, uploads[1], thumb, 'image/webp');
      thumbUrl = uploads[1].path;
    } catch {
      // Thumbnail is best-effort; the full image is used as a fallback on read.
    }
  }

  return { url: uploads[0].path, thumbUrl };
}

/** Upload several files sequentially (keeps signed-URL requests small and ordered). */
export async function uploadFiles(files: File[], scope: UploadScope): Promise<UploadedFile[]> {
  const out: UploadedFile[] = [];
  for (const file of files) out.push(await uploadFile(file, scope));
  return out;
}
