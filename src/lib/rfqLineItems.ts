export type PerProductQuoteStatus = 'Pending' | 'Quoted' | 'Accepted' | 'Rejected';

export interface RequestLineItem {
  id: string;
  name: string;
  quantity: number;
  specs?: string;
  imageUrl?: string;
  referenceImageUrls?: string[];
  targetPriceINR?: number;
  rmbCostPerUnit: number;
  unitPriceCny?: number;
  unitPriceInr?: number;
  status: PerProductQuoteStatus;
  revisionRequested?: boolean;
  clientProposedInr?: number;
  clientResponse?: string;
  counterPriceINR?: number;
  counterNote?: string;
}

export type { RequestRow } from './mockData';

const storageKey = (requestId: string) => `rfq-line-quotations:${requestId}`;

export function defaultLineItemsFromRequest(_req: any): RequestLineItem[] {
  return [];
}

export function loadRfqLineItems(_req: any): RequestLineItem[] {
  if (typeof window === 'undefined') return [];
  const raw = sessionStorage.getItem(storageKey(_req.id));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as RequestLineItem[];
    if (Array.isArray(parsed) && parsed.length) return parsed.map((l) => ({ ...l }));
  } catch {}
  return [];
}

/**
 * Persist line items to sessionStorage. Returns false (instead of throwing) when
 * the write fails — most commonly Safari's QuotaExceededError when a line item
 * carries a large base64 image. The caller keeps the in-memory state regardless;
 * a thrown error here would otherwise crash the React tree mid-update.
 */
export function persistRfqLineItems(reqId: string, lines: RequestLineItem[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    sessionStorage.setItem(storageKey(reqId), JSON.stringify(lines));
    return true;
  } catch {
    return false;
  }
}