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

export function persistRfqLineItems(reqId: string, lines: RequestLineItem[]) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(storageKey(reqId), JSON.stringify(lines));
}