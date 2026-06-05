import { mockRequests, type RequestRow } from './mockData';

const STORAGE_KEY = 'bk-requests';

export function getRequests(): RequestRow[] {
  if (typeof window === 'undefined') return mockRequests;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as RequestRow[];
  } catch {}
  seedRequests(mockRequests);
  return mockRequests;
}

export function setRequests(requests: RequestRow[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch {}
}

export function seedRequests(requests: RequestRow[]): void {
  try {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    }
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
