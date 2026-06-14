import axiosClient from './api/axiosClient';
import { getBrowserSupabase } from './supabaseClient';

// Direct-to-storage uploads. The browser asks the backend for a short-lived signed
// upload URL, uploads the bytes straight to Supabase Storage (never through the
// API server), and persists only the resulting object PATH. The backend converts
// paths to signed read URLs on read. A small webp thumbnail is generated client-
// side for list/preview use.

export type UploadScope = 'request-item' | 'payment-proof' | 'dispute';

export interface UploadedFile {
  /** Storage object path to persist (backend signs it on read). */
  url: string;
  /** Storage object path for the generated thumbnail (images only). */
  thumbUrl?: string;
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
// Raw byte cap (no longer base64-inflated). Generous since bytes go straight to storage.
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

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

/**
 * Downscale an image File to a compact JPEG data URL for inline preview/local
 * persistence. iPhone camera photos are 8–13 MB; storing the raw base64 in
 * web storage throws Safari's QuotaExceededError. Downscaling first keeps the
 * preview UX while producing a payload small enough to persist. HEIC decodes
 * natively on Safari (where iPhone capture happens); if a browser cannot decode
 * the image, the original File is returned as a data URL as a best-effort
 * fallback. Never throws.
 */
export async function downscaleImageToDataUrl(
  file: File,
  maxDim = 1280,
  quality = 0.8,
): Promise<string> {
  const readAsDataUrl = (f: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error ?? new Error('read failed'));
      reader.readAsDataURL(f);
    });

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (blob) return await readAsDataUrl(blob);
  } catch {
    // Fall through to returning the original file as a data URL.
  }
  return readAsDataUrl(file);
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
  const thumb = await makeThumbnail(file);
  const contentTypes = [file.type, ...(thumb ? ['image/webp'] : [])];
  const { bucket, uploads } = await requestSignedUploads(scope, contentTypes);
  if (!uploads.length) throw new Error('No upload URL returned by the server');

  await putToSignedUrl(bucket, uploads[0], file, file.type);

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
