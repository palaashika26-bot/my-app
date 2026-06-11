import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import config from "./env";
import { ApiError } from "../utils/ApiError";

/**
 * Object storage (Supabase Storage) for images that used to be base64-in-DB:
 * request reference images, payment proofs, and dispute attachments.
 *
 * Upload model: the browser uploads bytes DIRECTLY to storage using a short-lived
 * signed upload URL issued here (POST /api/v1/uploads/sign), so large files never
 * stream through this (Render) server. Only the resulting object PATH is stored in
 * Postgres. On read, paths are converted to short-lived signed read URLs.
 *
 * Backward compatibility: legacy rows still hold `data:`/`http(s)` values; those
 * are passed through unchanged. Only keys under a known storage prefix are signed,
 * so unrelated columns (catalog product image paths, etc.) are never touched.
 */

export type UploadScope =
  | "request-item"
  | "payment-proof"
  | "dispute"
  | "support"
  | "catalog"
  | "warehouse"
  | "logistics-packing"
  | "logistics-slip";

const SCOPE_PREFIX: Record<UploadScope, string> = {
  "request-item": "request-items",
  "payment-proof": "payment-proofs",
  dispute: "dispute-attachments",
  support: "support-attachments",
  catalog: "catalog",
  warehouse: "warehouse-photos",
  "logistics-packing": "logistics-packing",
  "logistics-slip": "logistics-slips",
};

// Only object keys under one of these prefixes are treated as storage paths and
// signed on read. Everything else passes through untouched.
const STORAGE_PREFIXES = Object.values(SCOPE_PREFIX).map((p) => `${p}/`);

// Allowed upload content types → file extension. Images for all scopes; short
// video clips additionally permitted (dispute proof).
const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  // Documents — support / dispute attachments can be PDFs.
  "application/pdf": "pdf",
};

export const MAX_UPLOAD_BATCH = 12;
const READ_URL_TTL_SECONDS = 60 * 60; // 1h — ample for page render, not long-lived

let _client: SupabaseClient | null = null;

export function isStorageConfigured(): boolean {
  return Boolean(config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY);
}

export function getStorageBucket(): string {
  return config.SUPABASE_STORAGE_BUCKET;
}

function client(): SupabaseClient {
  if (!isStorageConfigured()) {
    throw new ApiError(
      503,
      "Object storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)"
    );
  }
  if (!_client) {
    _client = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

const bucket = () => client().storage.from(config.SUPABASE_STORAGE_BUCKET);

export function isStoragePath(value: string): boolean {
  return STORAGE_PREFIXES.some((p) => value.startsWith(p));
}

/**
 * Issue signed upload URLs. The browser uploads each file directly using the
 * returned `path` + `token` (supabase-js `uploadToSignedUrl`), then sends the
 * `path` values back to be persisted.
 */
export async function createSignedUploads(opts: {
  scope: UploadScope;
  ownerId: string;
  contentTypes: string[];
}): Promise<{ path: string; token: string; signedUrl: string }[]> {
  const prefix = SCOPE_PREFIX[opts.scope];
  if (!prefix) throw ApiError.badRequest("Invalid upload scope");
  if (!opts.contentTypes.length || opts.contentTypes.length > MAX_UPLOAD_BATCH) {
    throw ApiError.badRequest(`Request between 1 and ${MAX_UPLOAD_BATCH} upload URLs`);
  }

  const store = bucket();
  const safeOwner = opts.ownerId.replace(/[^a-zA-Z0-9_-]/g, "") || "anon";
  const out: { path: string; token: string; signedUrl: string }[] = [];

  for (const contentType of opts.contentTypes) {
    const ext = EXT_BY_CONTENT_TYPE[contentType];
    if (!ext) throw ApiError.badRequest(`Unsupported file type: ${contentType}`);
    const path = `${prefix}/${safeOwner}/${randomUUID()}.${ext}`;
    const { data, error } = await store.createSignedUploadUrl(path);
    if (error || !data) {
      // Surface the exact bucket + object key sent to Supabase (no secrets) so an
      // "Invalid path" / misconfig is diagnosable from the server logs.
      console.error(
        `[storage] createSignedUploadUrl failed — host="${config.SUPABASE_URL}" ` +
          `bucket="${config.SUPABASE_STORAGE_BUCKET}" path="${path}" :: ${error?.message ?? "unknown"}`
      );
      throw new ApiError(502, `Failed to create signed upload URL: ${error?.message ?? "unknown"}`);
    }
    const absolute = data.signedUrl.startsWith("http")
      ? data.signedUrl
      : `${config.SUPABASE_URL.replace(/\/$/, "")}${data.signedUrl}`;
    out.push({ path, token: data.token, signedUrl: absolute });
  }
  return out;
}

async function signPathMap(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!paths.length) return map;
  const { data, error } = await bucket().createSignedUrls(paths, READ_URL_TTL_SECONDS);
  if (error || !data) return map;
  for (const row of data) {
    if (row.signedUrl && row.path) map.set(row.path, row.signedUrl);
  }
  return map;
}

interface FieldSpec {
  singles?: string[];
  arrays?: string[];
}

/**
 * Replace storage-path values in the named field(s) of one or more rows with
 * signed read URLs (batched into a single request). Legacy `data:`/`http` values
 * pass through. Mutates rows in place (they're about to be serialized to JSON).
 * No-op when storage is unconfigured so local dev without storage still works.
 */
export async function signImageFields<T extends Record<string, any>>(
  rows: T | T[] | null | undefined,
  spec: FieldSpec
): Promise<void> {
  if (!rows || !isStorageConfigured()) return;
  const list = (Array.isArray(rows) ? rows : [rows]).filter(Boolean) as Record<string, any>[];

  const paths = new Set<string>();
  for (const row of list) {
    for (const f of spec.singles ?? []) {
      const v = row[f];
      if (typeof v === "string" && isStoragePath(v)) paths.add(v);
    }
    for (const f of spec.arrays ?? []) {
      const arr = row[f];
      if (Array.isArray(arr)) for (const v of arr) if (typeof v === "string" && isStoragePath(v)) paths.add(v);
    }
  }
  if (!paths.size) return;

  const map = await signPathMap([...paths]);
  const conv = (v: any) => (typeof v === "string" && isStoragePath(v) ? map.get(v) ?? null : v);
  for (const row of list) {
    for (const f of spec.singles ?? []) {
      if (row[f] != null) row[f] = conv(row[f]);
    }
    for (const f of spec.arrays ?? []) {
      if (Array.isArray(row[f])) row[f] = row[f].map(conv).filter((x: any) => x != null);
    }
  }
}

/**
 * Reverse of signing: given a value that may be a signed/public Supabase URL for
 * our bucket, return the raw storage path so it can be persisted. Already-raw
 * paths are returned unchanged; legacy `data:`/external URLs pass through (so old
 * rows and externally-hosted images keep working). Used on WRITE paths where an
 * admin form may re-submit the signed URL it was shown on read (e.g. catalog).
 */
export function toStoragePath(value: unknown): unknown {
  if (typeof value !== "string" || !value) return value;
  if (isStoragePath(value)) return value;
  const bucket = config.SUPABASE_STORAGE_BUCKET;
  for (const marker of [`/object/sign/${bucket}/`, `/object/public/${bucket}/`]) {
    const idx = value.indexOf(marker);
    if (idx !== -1) {
      const path = decodeURIComponent(value.slice(idx + marker.length).split("?")[0]);
      if (isStoragePath(path)) return path;
    }
  }
  return value;
}

/** Normalize the named array/string fields of a write payload to raw storage paths (in place). */
export function normalizeStoragePathFields(
  data: Record<string, any>,
  fields: string[]
): void {
  for (const f of fields) {
    const v = data[f];
    if (Array.isArray(v)) data[f] = v.map(toStoragePath);
    else if (typeof v === "string") data[f] = toStoragePath(v);
  }
}

/** Sign the image fields on a sourcing request's items (in place); returns the request. */
export async function signRequestImages<T extends { items?: any[] } | null | undefined>(
  request: T
): Promise<T> {
  if (request && Array.isArray((request as any).items)) {
    await signImageFields((request as any).items, {
      singles: ["imageUrl", "imageThumbUrl"],
      arrays: ["referenceImageUrls", "referenceThumbUrls"],
    });
  }
  return request;
}
