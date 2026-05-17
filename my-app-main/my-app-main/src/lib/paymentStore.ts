const proofKey      = (reqId: string) => `payment-proof:${reqId}`;
const confirmedKey  = (reqId: string) => `payment-confirmed:${reqId}`;
const timestampKey  = (reqId: string) => `payment-timestamp:${reqId}`;
const receiptIdKey  = (reqId: string) => `payment-receipt-id:${reqId}`;

export function savePaymentProof(reqId: string, dataUrl: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(proofKey(reqId), dataUrl);
}

export function loadPaymentProof(reqId: string): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(proofKey(reqId));
}

export function savePaymentConfirmed(reqId: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(confirmedKey(reqId), 'true');
}

export function loadPaymentConfirmed(reqId: string): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(confirmedKey(reqId)) === 'true';
}

export function savePaymentTimestamp(reqId: string) {
  if (typeof window === 'undefined') return;
  if (!sessionStorage.getItem(timestampKey(reqId))) {
    sessionStorage.setItem(timestampKey(reqId), new Date().toISOString());
  }
  if (!sessionStorage.getItem(receiptIdKey(reqId))) {
    const num = Math.floor(1000 + Math.random() * 9000);
    sessionStorage.setItem(receiptIdKey(reqId), `BK-PAY-2026-${num}`);
  }
}

export function loadPaymentTimestamp(reqId: string): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(timestampKey(reqId));
}

export function loadReceiptId(reqId: string): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(receiptIdKey(reqId));
}
