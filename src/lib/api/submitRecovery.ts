import { describeApiError } from './axiosClient';
import { requestsApi } from './requests.api';

// Shared recovery for sourcing-request submissions. A createRequest() call can
// fail on the client (slow mobile connection, cold-start backend, a CORS-blocked
// response) AFTER the server has already created the row. Reporting that as a
// hard failure makes users resubmit and create duplicates, so any inconclusive
// failure is verified against the server before we show anything.

export type SubmitFailureResolution =
  // The request was confirmed created despite the client-side error.
  | { outcome: 'created'; request: any }
  // Timeout / network abort that we could NOT confirm either way — show a soft,
  // non-destructive message rather than "failed, try again".
  | { outcome: 'unconfirmed' }
  // A definitive HTTP error with a real reason to surface.
  | { outcome: 'failed'; status?: number; description: string };

// Re-fetch the client's own recent requests and look for one matching the
// just-submitted product names, created in the last few minutes. Returns the
// matched request, or null if it can't be confirmed (e.g. still offline).
export async function confirmRequestCreated(submittedNames: string[]): Promise<any | null> {
  try {
    const res = await requestsApi.getRequests({ limit: 5 });
    const list: any[] = (res as any)?.data?.data ?? [];
    if (!list.length) return null;
    const wanted = new Set(submittedNames.map(n => n.toLowerCase()).filter(Boolean));
    if (!wanted.size) return null;
    const cutoff = Date.now() - 3 * 60 * 1000; // created within the last 3 minutes
    return (
      [...list]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .find(r => {
          if (new Date(r.createdAt).getTime() < cutoff) return false;
          const names: string[] = (r.items ?? []).map((i: any) => String(i.productName ?? '').toLowerCase());
          return names.some(n => wanted.has(n));
        }) ?? null
    );
  } catch {
    return null; // verification itself failed — caller falls back to a soft message
  }
}

// Classify a createRequest() failure into an actionable outcome. Inconclusive
// network/timeout aborts (no HTTP status) are verified against the server first.
export async function resolveSubmitFailure(
  err: unknown,
  submittedNames: string[]
): Promise<SubmitFailureResolution> {
  const info = describeApiError(err);
  console.error(
    `[request-submit] failed — status=${info.status ?? 'none'} ` +
      `network=${info.isNetworkError} timeout=${info.isTimeout} :: ${info.message}`,
    { fieldErrors: info.fieldErrors, raw: err }
  );

  if (!info.status && (info.isNetworkError || info.isTimeout)) {
    console.log('[request-submit] inconclusive failure — verifying whether the request was created…');
    const confirmed = await confirmRequestCreated(submittedNames);
    if (confirmed) {
      console.log(`[request-submit] verified created despite client error: ${confirmed.id}`);
      return { outcome: 'created', request: confirmed };
    }
    return { outcome: 'unconfirmed' };
  }

  let description = info.message;
  if (info.status === 401) description = 'Your session expired. Please log in again.';
  else if (info.status === 403) description = 'You do not have permission to submit requests. Please check your account.';
  return { outcome: 'failed', status: info.status, description };
}
