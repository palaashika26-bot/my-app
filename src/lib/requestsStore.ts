export interface RequestRow {
  id: string;
  requestId: string;
  date: string;
  items: number;
  itemNames: string;
  status: any;
  totalBudget: string;
  client?: string;
  source?: 'manual' | 'photo_scan';
  imageAttached?: boolean;
  detectedProduct?: string;
  confidence?: number;
  lineItems?: any[];
}

const STORAGE_KEY = 'bk-requests';

export function getRequests(): RequestRow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as RequestRow[];
  } catch {}
  return [];
}

export function setRequests(requests: RequestRow[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch {}
}

export function addRequest(request: RequestRow): void {
  const list = getRequests();
  list.unshift(request);
  setRequests(list);
}

export function updateRequest(id: string, updates: Partial<RequestRow>): void {
  const list = getRequests();
  const idx = list.findIndex(r => r.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...updates };
    setRequests(list);
  }
}

export function getRequestById(id: string): RequestRow | undefined {
  return getRequests().find(r => r.id === id);
}