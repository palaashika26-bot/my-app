/**
 * Client-side persistence for warehouse ↔ client QC photo flow (demo / prototype).
 */
import type { OrderStatus } from '@/components/ui/StatusBadge';

export type QcSlot = 'product' | 'packaging' | 'damage';

export interface QcImageRef {
  id: string;
  dataUrl: string;
  fileName: string;
}

export type ClientQcDecision = 'pending' | 'approved' | 'rejected';

export interface ProductQcDraft {
  product: QcImageRef[];
  packaging: QcImageRef[];
  damage: QcImageRef[];
}

export interface OrderQcBundle {
  drafts: Record<string, ProductQcDraft>;
  lastSavedAt: string | null;
  submittedForClient: boolean;
  clientByProduct: Record<string, { decision: ClientQcDecision; rejectReason?: string }>;
}

export interface AdminQcAlert {
  id: string;
  at: string;
  orderDbId: string;
  displayOrderId: string;
  clientName: string;
  productName: string;
  reason: string;
}

const ROOT_KEY = 'bk_order_qc_root_v1';

interface PersistedRoot {
  qcByOrderId: Record<string, OrderQcBundle>;
  statusOverrides: Record<string, OrderStatus>;
  adminAlerts: AdminQcAlert[];
}

function emptyDraft(): ProductQcDraft {
  return { product: [], packaging: [], damage: [] };
}

function readRoot(): PersistedRoot {
  if (typeof window === 'undefined') {
    return { qcByOrderId: {}, statusOverrides: {}, adminAlerts: [] };
  }
  try {
    const raw = localStorage.getItem(ROOT_KEY);
    if (!raw) return { qcByOrderId: {}, statusOverrides: {}, adminAlerts: [] };
    const p = JSON.parse(raw) as PersistedRoot;
    return {
      qcByOrderId: p.qcByOrderId ?? {},
      statusOverrides: p.statusOverrides ?? {},
      adminAlerts: Array.isArray(p.adminAlerts) ? p.adminAlerts : [],
    };
  } catch {
    return { qcByOrderId: {}, statusOverrides: {}, adminAlerts: [] };
  }
}

function writeRoot(root: PersistedRoot) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ROOT_KEY, JSON.stringify(root));
  } catch {
    /* quota or private mode */
  }
}

const listeners = new Set<() => void>();

export function subscribeOrderQc(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function emit() {
  listeners.forEach((fn) => fn());
}

export function getOrderQcBundle(orderDbId: string): OrderQcBundle {
  const root = readRoot();
  const existing = root.qcByOrderId[orderDbId];
  if (existing) return existing;
  return {
    drafts: {},
    lastSavedAt: null,
    submittedForClient: false,
    clientByProduct: {},
  };
}

export function initOrderQcDrafts(orderDbId: string, productIds: string[]) {
  const root = readRoot();
  const cur = root.qcByOrderId[orderDbId] ?? {
    drafts: {},
    lastSavedAt: null,
    submittedForClient: false,
    clientByProduct: {},
  };
  const nextDrafts = { ...cur.drafts };
  for (const pid of productIds) {
    if (!nextDrafts[pid]) nextDrafts[pid] = emptyDraft();
  }
  root.qcByOrderId[orderDbId] = { ...cur, drafts: nextDrafts };
  writeRoot(root);
  emit();
}

export function setOrderQcDrafts(orderDbId: string, drafts: Record<string, ProductQcDraft>) {
  const root = readRoot();
  const cur = root.qcByOrderId[orderDbId] ?? {
    drafts: {},
    lastSavedAt: null,
    submittedForClient: false,
    clientByProduct: {},
  };
  root.qcByOrderId[orderDbId] = {
    ...cur,
    drafts,
    lastSavedAt: new Date().toISOString(),
  };
  writeRoot(root);
  emit();
}

export function submitOrderQcForClient(orderDbId: string, productIds: string[]) {
  const root = readRoot();
  const cur = root.qcByOrderId[orderDbId];
  if (!cur) return;
  const clientByProduct: OrderQcBundle['clientByProduct'] = { ...cur.clientByProduct };
  for (const pid of productIds) {
    if (!clientByProduct[pid]) clientByProduct[pid] = { decision: 'pending' };
  }
  root.qcByOrderId[orderDbId] = {
    ...cur,
    submittedForClient: true,
    clientByProduct,
  };
  writeRoot(root);
  emit();
}

export function setClientProductDecision(
  orderDbId: string,
  productId: string,
  decision: 'approved' | 'rejected',
  rejectReason: string | undefined,
  ctx: {
    productIds: string[];
    displayOrderId: string;
    clientName: string;
    productName: string;
  }
) {
  const root = readRoot();
  const cur = root.qcByOrderId[orderDbId];
  if (!cur || !cur.submittedForClient) return;

  const clientByProduct = { ...cur.clientByProduct };
  clientByProduct[productId] =
    decision === 'approved'
      ? { decision: 'approved' }
      : { decision: 'rejected', rejectReason: rejectReason?.trim() || '(no reason provided)' };

  root.qcByOrderId[orderDbId] = { ...cur, clientByProduct };

  if (decision === 'rejected') {
    root.statusOverrides[orderDbId] = 'Return from China';
    const alert: AdminQcAlert = {
      id: `qc-alert-${Date.now()}`,
      at: new Date().toISOString(),
      orderDbId,
      displayOrderId: ctx.displayOrderId,
      clientName: ctx.clientName,
      productName: ctx.productName,
      reason: clientByProduct[productId].rejectReason ?? '',
    };
    root.adminAlerts = [alert, ...root.adminAlerts].slice(0, 50);
  } else {
    const allApproved = ctx.productIds.every((pid) => clientByProduct[pid]?.decision === 'approved');
    if (allApproved) {
      root.statusOverrides[orderDbId] = 'Ready for Logistics';
    }
  }

  writeRoot(root);
  emit();
}

export function getEffectiveOrderStatus(orderDbId: string, fallback: OrderStatus): OrderStatus {
  const root = readRoot();
  return root.statusOverrides[orderDbId] ?? fallback;
}

export function readAdminQcAlerts(): AdminQcAlert[] {
  return readRoot().adminAlerts;
}

export function dismissAdminQcAlert(alertId: string) {
  const root = readRoot();
  root.adminAlerts = root.adminAlerts.filter((a) => a.id !== alertId);
  writeRoot(root);
  emit();
}

export function qcSubmitPrerequisitesMet(bundle: OrderQcBundle, productIds: string[]): boolean {
  if (!productIds.length) return false;
  for (const pid of productIds) {
    const d = bundle.drafts[pid];
    if (!d || d.product.length === 0 || d.packaging.length === 0) return false;
  }
  return !!bundle.lastSavedAt;
}
