'use client';

import React, { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { mockAdminOrders } from '@/lib/adminMockData';
import { getOrderLineItems, resolveOrderFromParam } from '@/lib/orderLineItems';
import {
  getEffectiveOrderStatus,
  getOrderQcBundle,
  initOrderQcDrafts,
  qcSubmitPrerequisitesMet,
  setOrderQcDrafts,
  submitOrderQcForClient,
  subscribeOrderQc,
  type ProductQcDraft,
  type QcImageRef,
  type QcSlot,
} from '@/lib/orderQcStore';
import { ArrowLeft, Camera, ImagePlus, Loader2, Send, Trash2 } from 'lucide-react';

function newImageId() {
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readFilesAsRefs(files: FileList | null): Promise<QcImageRef[]> {
  if (!files?.length) return Promise.resolve([]);
  return Promise.all(
    Array.from(files).map(
      (file) =>
        new Promise<QcImageRef>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              id: newImageId(),
              dataUrl: String(reader.result),
              fileName: file.name,
            });
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        })
    )
  );
}

export default function WarehouseQcPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId: orderParam } = use(params);
  const router = useRouter();
  const { addToast } = useToast();
  const { role, user, isReady } = useAuth();
  const [, bump] = useState(0);
  const force = useCallback(() => bump((x) => x + 1), []);

  useEffect(() => {
    return subscribeOrderQc(force);
  }, [force]);

  const order = useMemo(() => resolveOrderFromParam(orderParam, mockAdminOrders), [orderParam]);
  const lineItems = useMemo(() => (order ? getOrderLineItems(order) : []), [order]);
  const productIds = useMemo(() => lineItems.map((l) => l.id), [lineItems]);

  const allowed =
    role === 'admin' || (role === 'staff' && user?.staffRoleId === 'warehouse-qc');

  useEffect(() => {
    if (!isReady) return;
    if (!allowed) router.replace('/admin');
  }, [isReady, allowed, router]);

  const [localDrafts, setLocalDrafts] = useState<Record<string, ProductQcDraft>>({});

  useEffect(() => {
    if (!order || !productIds.length) return;
    initOrderQcDrafts(order.id, productIds);
    const b = getOrderQcBundle(order.id);
    setLocalDrafts(
      productIds.reduce<Record<string, ProductQcDraft>>((acc, pid) => {
        acc[pid] = b.drafts[pid] ?? { product: [], packaging: [], damage: [] };
        return acc;
      }, {})
    );
  }, [order?.id, productIds.join('|')]);

  if (!order) return notFound();
  const o = order;
  const storeBundle = getOrderQcBundle(o.id);
  const effectiveStatus = getEffectiveOrderStatus(o.id, o.status);
  const canSubmitClient = qcSubmitPrerequisitesMet({ ...storeBundle, drafts: localDrafts }, productIds);

  if (!isReady || !allowed) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Checking access…
        </div>
      </AdminLayout>
    );
  }

  function mergeRefs(slot: QcSlot, productId: string, incoming: QcImageRef[]) {
    setLocalDrafts((prev) => {
      const cur = prev[productId] ?? { product: [], packaging: [], damage: [] };
      return {
        ...prev,
        [productId]: { ...cur, [slot]: [...cur[slot], ...incoming] },
      };
    });
  }

  function removeRef(productId: string, slot: QcSlot, imageId: string) {
    setLocalDrafts((prev) => {
      const cur = prev[productId];
      if (!cur) return prev;
      return {
        ...prev,
        [productId]: { ...cur, [slot]: cur[slot].filter((i) => i.id !== imageId) },
      };
    });
  }

  function handleSave() {
    setOrderQcDrafts(o.id, localDrafts);
    addToast({ type: 'success', title: 'Photos saved', description: 'Draft Repacking Warehouse photos are stored for this order.' });
    force();
  }

  function handleSubmitForClient() {
    const b = getOrderQcBundle(o.id);
    if (!qcSubmitPrerequisitesMet({ ...b, drafts: localDrafts }, productIds)) {
      addToast({
        type: 'error',
        title: 'Incomplete Repacking Warehouse pack',
        description: 'Save first, and ensure every product has at least one product photo and one packaging photo.',
      });
      return;
    }
    setOrderQcDrafts(o.id, localDrafts);
    submitOrderQcForClient(o.id, productIds);
    addToast({
      type: 'success',
      title: 'Sent to client',
      description: 'The client can now review and approve Repacking Warehouse photos.',
    });
    force();
  }

  return (
    <AdminLayout>
      <Link
        href={`/admin/orders/${o.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to order
      </Link>

      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground font-500 uppercase tracking-wide">Repacking Warehouse</p>
          <h1 className="text-xl font-800 text-foreground mt-1 font-tabular">{o.orderId}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Client: <span className="font-600 text-foreground">{o.client ?? '—'}</span>
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2">
          <StatusBadge status={effectiveStatus as any} size="md" />
          {storeBundle?.submittedForClient && (
            <span className="text-xs font-500 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
              Awaiting client approval on Repacking Warehouse
            </span>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {lineItems.map((line) => {
          const d = localDrafts[line.id] ?? { product: [], packaging: [], damage: [] };
          const slotRow = (label: string, slot: QcSlot) => (
            <div key={slot} className="border border-border rounded-lg p-4 bg-muted/30">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p className="text-sm font-600">{label}</p>
                <label className="btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1.5 cursor-pointer">
                  <ImagePlus className="w-3.5 h-3.5" />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const refs = await readFilesAsRefs(e.target.files);
                      mergeRefs(slot, line.id, refs);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              {d[slot].length === 0 ? (
                <p className="text-xs text-muted-foreground">No images yet.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {d[slot].map((img) => (
                    <li key={img.id} className="relative group w-20 h-20 rounded-md overflow-hidden border border-border bg-background">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.dataUrl} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeRef(line.id, slot, img.id)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );

          return (
            <div key={line.id} className="bg-card rounded-xl border border-border shadow-card p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-700">{line.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Qty: {line.quantity}</p>
                </div>
                <Camera className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              </div>
              <div className="space-y-3">
                {slotRow('Product photos', 'product')}
                {slotRow('Packaging photos', 'packaging')}
                {slotRow('Damage / defect photos (optional)', 'damage')}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center">
        <button type="button" className="btn-primary px-5 py-2.5 text-sm inline-flex items-center justify-center gap-2" onClick={handleSave}>
          Save photos
        </button>
        {!storeBundle?.submittedForClient && (
          <button
            type="button"
            disabled={!canSubmitClient}
            title={!canSubmitClient ? 'Save with full product + packaging sets for every line first' : undefined}
            className="btn-secondary px-5 py-2.5 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            onClick={handleSubmitForClient}
          >
            <Send className="w-4 h-4" /> Submit for client approval
          </button>
        )}
      </div>
    </AdminLayout>
  );
}
