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

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
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

// Convert HEIC/HEIF images to JPEG before processing
// Returns the original file if conversion isn't needed or fails (best-effort)
async function convertHeicToJpeg(file: File): Promise<File> {
  // Check if this is an HEIC/HEIF file
  if (!file.type.includes('heic') && !file.type.includes('heif')) {
    return file;
  }

  try {
    // Use canvas to convert HEIC to JPEG
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('[upload] Could not get canvas context for HEIC conversion, using original');
      return file;
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close?.();

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.warn('[upload] HEIC to JPEG conversion failed, using original');
            resolve(file);
            return;
          }
          // Create a new File from the blob with .jpg extension
          const newFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
            type: 'image/jpeg',
            lastModified: file.lastModified,
          });
          console.log(`[upload] HEIC converted: ${file.name} (${file.size} bytes) → JPEG (${newFile.size} bytes)`);
          resolve(newFile);
        },
        'image/jpeg',
        0.95 // High quality JPEG
      );
    });
  } catch (err) {
    console.warn(`[upload] HEIC conversion failed: ${err instanceof Error ? err.message : 'Unknown error'}, using original`);
    return file;
  }
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
  contentType: string,
  fileName: string = 'unknown'
): Promise<void> {
  const supabase = getBrowserSupabase();
  
  // Log upload attempt for debugging
  console.log(`[upload] Starting upload: ${fileName} (${body.size} bytes, ${contentType})`);
  
  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(upload.path, upload.token, body, { contentType });
  if (error) {
    // Page-level handlers swallow upload errors with a bare catch + toast, so log
    // the real cause here. Includes the FRONTEND Supabase host (NEXT_PUBLIC_*),
    // which is separate from the backend's SUPABASE_URL — a wrong/suffixed value
    // here is the usual reason a signed upload silently fails after /sign succeeds.
    console.error(
      `[upload] uploadToSignedUrl failed for ${fileName} — host="${process.env.NEXT_PUBLIC_SUPABASE_URL}" ` +
        `bucket="${bucket}" path="${upload.path}" size=${body.size} contentType=${contentType} :: ${error.message}`,
      error
    );
    throw error;
  }
  console.log(`[upload] Upload completed: ${fileName}`);
}

/**
 * Upload one file (image or short video) plus a generated thumbnail for images.
 * Returns the storage PATHS to persist.
 */
export async function uploadFile(file: File, scope: UploadScope, onProgress?: (progress: number) => void): Promise<UploadedFile> {
  const originalFileName = file.name;
  const originalSize = file.size;
  
  try {
    // Log upload start
    console.log(`[upload] Starting file: ${originalFileName} (${originalSize} bytes, type: ${file.type})`);
    onProgress?.(5);
    
    // Convert HEIC to JPEG if needed
    let processedFile = file;
    if (file.type.includes('heic') || file.type.includes('heif')) {
      console.log(`[upload] HEIC/HEIF detected, converting to JPEG...`);
      processedFile = await convertHeicToJpeg(file);
      if (processedFile !== file) {
        console.log(`[upload] Conversion successful: ${processedFile.size} bytes`);
      }
    }
    onProgress?.(10);

    // Compress the full image to WebP (best-effort) and build a small thumbnail.
    // Only the compressed bytes are uploaded — raw base64 is never stored anywhere.
    const main = await compressToWebP(processedFile);
    onProgress?.(40);
    
    const thumb = await makeThumbnail(processedFile);
    onProgress?.(50);
    
    const contentTypes = [main.contentType, ...(thumb ? ['image/webp'] : [])];
    const { bucket, uploads } = await requestSignedUploads(scope, contentTypes);
    onProgress?.(55);
    
    if (!uploads.length) throw new Error('No upload URL returned by the server');

    await putToSignedUrl(bucket, uploads[0], main.body, main.contentType, originalFileName);
    onProgress?.(80);

    let thumbUrl: string | undefined;
    if (thumb && uploads[1]) {
      try {
        await putToSignedUrl(bucket, uploads[1], thumb, 'image/webp', `${originalFileName}.thumb`);
        thumbUrl = uploads[1].path;
      } catch {
        // Thumbnail is best-effort; the full image is used as a fallback on read.
        console.warn('[upload] Thumbnail upload failed, will use full image as fallback');
      }
    }
    onProgress?.(100);

    console.log(`[upload] File complete: ${originalFileName}`);
    return { url: uploads[0].path, thumbUrl };
  } catch (err) {
    console.error(`[upload] Upload failed for ${originalFileName}:`, err);
    throw err;
  }
}

/** Upload several files sequentially (keeps signed-URL requests small and ordered). */
export async function uploadFiles(files: File[], scope: UploadScope, onFileProgress?: (fileIndex: number, fileName: string, progress: number) => void): Promise<UploadedFile[]> {
  const out: UploadedFile[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      out.push(await uploadFile(file, scope, (progress) => {
        onFileProgress?.(i, file.name, progress);
      }));
    } catch (err) {
      console.error(`[upload] Failed to upload file ${i}: ${file.name}`, err);
      throw err;
    }
  }
  return out;
}
