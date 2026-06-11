// Classify a support/dispute attachment for display. Attachments are stored as
// either a legacy base64 `data:` URL (old rows) or a signed Supabase Storage URL
// (new uploads) — both must render correctly, so we sniff the data-URL MIME first
// and otherwise fall back to the file extension in the object path.
export type AttachmentKind = 'image' | 'video' | 'file';

export function attachmentKind(url: string): AttachmentKind {
  if (url.startsWith('data:image/')) return 'image';
  if (url.startsWith('data:video/')) return 'video';
  if (url.startsWith('data:')) return 'file';
  // Signed storage / plain URL: drop the query string, then match by extension.
  const path = url.split('?')[0].toLowerCase();
  if (/\.(jpe?g|png|webp|gif|avif|bmp|heic|heif)$/.test(path)) return 'image';
  if (/\.(mp4|mov|webm|m4v|avi)$/.test(path)) return 'video';
  return 'file';
}
