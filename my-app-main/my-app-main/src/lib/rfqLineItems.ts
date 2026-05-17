import type { RequestRow, RequestLineItem } from './mockData';

export type { PerProductQuoteStatus, RequestLineItem } from './mockData';

const storageKey = (requestId: string) => `rfq-line-quotations:${requestId}`;

export function defaultLineItemsFromRequest(req: RequestRow): RequestLineItem[] {
  if (req.lineItems?.length) {
    return req.lineItems.map((l) => ({ ...l }));
  }
  const names = req.itemNames.split(',').map((n) => n.trim()).filter(Boolean);
  return names.map((name, i) => ({
    id: `${req.id}-line-${i}`,
    name,
    quantity: 50 + i * 25,
    specs: 'Standard specs, OEM packaging',
    rmbCostPerUnit: 18 + i * 6,
    unitPriceInr: undefined,
    status: 'Pending',
  }));
}

export function loadRfqLineItems(req: RequestRow): RequestLineItem[] {
  if (typeof window === 'undefined') {
    return defaultLineItemsFromRequest(req);
  }
  const raw = sessionStorage.getItem(storageKey(req.id));
  if (!raw) {
    const initial = defaultLineItemsFromRequest(req);
    sessionStorage.setItem(storageKey(req.id), JSON.stringify(initial));
    return initial.map((l) => ({ ...l }));
  }
  try {
    const parsed = JSON.parse(raw) as RequestLineItem[];
    if (Array.isArray(parsed) && parsed.length) return parsed.map((l) => ({ ...l }));
  } catch {
    /* fall through */
  }
  const fallback = defaultLineItemsFromRequest(req);
  sessionStorage.setItem(storageKey(req.id), JSON.stringify(fallback));
  return fallback.map((l) => ({ ...l }));
}

export function persistRfqLineItems(reqId: string, lines: RequestLineItem[]) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(storageKey(reqId), JSON.stringify(lines));
}
