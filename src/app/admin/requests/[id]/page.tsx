'use client';
import React, { useState, use, useEffect, useRef } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { mockRequests, mockClients } from '@/lib/adminMockData';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Camera, Check, X, MessageSquare, Send, Package, Pencil, Upload, ImageIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import type { RequestLineItem, PerProductQuoteStatus } from '@/lib/mockData';
import { defaultLineItemsFromRequest, loadRfqLineItems, persistRfqLineItems } from '@/lib/rfqLineItems';
import { loadPaymentProof, savePaymentConfirmed, loadPaymentConfirmed } from '@/lib/paymentStore';

const CNY_TO_INR = 11.5;
const DEFAULT_LOGISTICS_NOTE = 'This is an approx weight, exact will be given upon final repackaging. To be paid when in India.';

function statusLabel(s: PerProductQuoteStatus, revisionRequested?: boolean) {
  if (s === 'Pending' && revisionRequested) return 'Pending (counter-offer)';
  return s;
}

function StatusPill({ status, revisionRequested }: { status: PerProductQuoteStatus; revisionRequested?: boolean }) {
  const base = 'text-[10px] font-600 px-2 py-0.5 rounded';
  const map: Record<PerProductQuoteStatus, string> = {
    Pending: 'bg-amber-100 text-amber-800',
    Quoted: 'bg-sky-100 text-sky-800',
    Accepted: 'bg-emerald-100 text-emerald-800',
    Rejected: 'bg-red-100 text-red-800',
  };
  return <span className={`${base} ${map[status]}`}>{statusLabel(status, revisionRequested)}</span>;
}

export default function AdminRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { addToast } = useToast();
  const req = mockRequests.find(r => r.id === id);
  const perms = useAdminPermissions();
  const qs = perms.quotationScope;

  const [lineItems, setLineItems] = useState<RequestLineItem[]>(() =>
    req ? defaultLineItemsFromRequest(req) : []
  );
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [draftUnitCny, setDraftUnitCny] = useState('');
  const [draftRmb, setDraftRmb] = useState('');
  const [msg, setMsg] = useState('');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [thread, setThread] = useState([
    { by: 'client', text: 'Hi team, please source these items urgently. Sample required first.', t: '2 hours ago' },
    { by: 'admin', text: 'On it — sample available in 5–7 days. We will share supplier shortlist shortly.', t: '1 hour ago' },
  ]);
  const [paymentProof, setPaymentProof] = useState<string | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [logisticsWeight, setLogisticsWeight] = useState('');
  const [logisticsMode, setLogisticsMode] = useState('Standard Air');
  const [logisticsPricePerKg, setLogisticsPricePerKg] = useState('');
  const [logisticsNote, setLogisticsNote] = useState(DEFAULT_LOGISTICS_NOTE);
  const [logisticsSaved, setLogisticsSaved] = useState(false);
  const lastMsgSent = useRef(0);

  useEffect(() => {
    const row = mockRequests.find(r => r.id === id);
    if (!row) return;
    setLineItems(loadRfqLineItems(row));
    setPaymentProof(loadPaymentProof(id));
    setPaymentConfirmed(loadPaymentConfirmed(id));
    const savedLogistics = localStorage.getItem(`logistics-estimate-${id}`);
    if (savedLogistics) {
      try {
        const l = JSON.parse(savedLogistics);
        setLogisticsWeight(l.weight ?? '');
        setLogisticsMode(l.mode ?? 'Standard Air');
        setLogisticsPricePerKg(l.pricePerKg ?? '');
        setLogisticsNote(l.note ?? DEFAULT_LOGISTICS_NOTE);
        setLogisticsSaved(true);
      } catch {}
    }
  }, [id]);

  if (!req) return notFound();
  const client = mockClients.find(c => c.name === req.client);

  function beginEdit(line: RequestLineItem) {
    setEditingLineId(line.id);
    setDraftUnitCny(line.unitPriceCny != null ? String(line.unitPriceCny) : '');
    setDraftRmb(String(line.rmbCostPerUnit));
  }

  function cancelEdit() {
    setEditingLineId(null);
    setDraftUnitCny('');
    setDraftRmb('');
  }

  function saveLine(lineId: string) {
    if (qs !== 'full') return;
    const n = parseFloat(draftUnitCny.replace(/,/g, ''));
    const unitCny = Number.isFinite(n) && n > 0 ? n : undefined;
    const unitInr = unitCny != null ? Math.round(unitCny * CNY_TO_INR) : undefined;
    const r = parseFloat(draftRmb.replace(/,/g, ''));
    const rmb = Number.isFinite(r) && r > 0 ? r : undefined;
    setLineItems(prev => {
      const next = prev.map(l =>
        l.id === lineId
          ? {
              ...l,
              rmbCostPerUnit: rmb ?? l.rmbCostPerUnit,
              unitPriceCny: unitCny,
              unitPriceInr: unitInr,
              status: unitCny != null ? ('Quoted' as const) : ('Pending' as const),
              revisionRequested: false,
              clientProposedInr: undefined,
            }
          : l
      );
      persistRfqLineItems(id, next);
      return next;
    });
    setEditingLineId(null);
    setDraftUnitCny('');
    setDraftRmb('');
    addToast({
      type: 'success',
      title: unitCny != null ? 'Price saved' : 'Line cleared',
      description: unitCny != null ? 'Unit price updated for this product.' : 'This line is pending a unit price.',
    });
  }

  function sendQuotationsToClient() {
    if (qs !== 'full') return;
    const quoted = lineItems.filter(l => l.status === 'Quoted');
    if (!quoted.length) {
      addToast({ type: 'warning', title: 'Nothing to send', description: 'Save a unit price in CNY for at least one product first.' });
      return;
    }
    addToast({
      type: 'success',
      title: 'Quotations sent',
      description: `Per-product quotes (${quoted.length} line${quoted.length === 1 ? '' : 's'}) shared with ${client?.email ?? 'the client'}.`,
    });
  }

  function handleImageUpload(lineId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      alert('Only JPG, PNG, and WEBP images are allowed.');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum size is 10MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setLineItems(prev => {
        const next = prev.map(l => l.id === lineId ? { ...l, imageUrl: dataUrl } : l);
        persistRfqLineItems(id, next);
        return next;
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function approve() {
    addToast({ type: 'success', title: 'Request approved', description: 'Converted to order.' });
  }
  function reject() {
    addToast({ type: 'warning', title: 'Request rejected', description: 'Client has been notified.' });
  }
  function moreInfo() {
    addToast({ type: 'info', title: 'Info requested from client' });
  }
  function saveLogistics() {
    localStorage.setItem(`logistics-estimate-${id}`, JSON.stringify({
      weight: logisticsWeight,
      mode: logisticsMode,
      pricePerKg: logisticsPricePerKg,
      note: logisticsNote,
    }));
    setLogisticsSaved(true);
    addToast({ type: 'success', title: 'Logistics saved', description: 'Logistics estimate is now visible to client.' });
  }
  function confirmPayment() {
    savePaymentConfirmed(id);
    setPaymentConfirmed(true);
    addToast({ type: 'success', title: 'Payment confirmed', description: 'Order status updated to Payment Confirmed.' });
  }
  function postMsg() {
    const now = Date.now();
    if (now - lastMsgSent.current < 2000) { addToast({ type: 'warning', title: 'Please wait before sending again.' }); return; }
    const sanitized = msg.replace(/[<>"']/g, '').trim().slice(0, 2000);
    if (!sanitized) return;
    lastMsgSent.current = now;
    setThread(t => [...t, { by: 'admin', text: sanitized, t: 'just now' }]);
    setMsg('');
  }

  const showFullQuoteCols = qs === 'full';

  return (
    <AdminLayout>
      {/* Page wrapper: full width, no horizontal overflow, no side gaps */}
      <div className="w-full max-w-full overflow-x-hidden pb-20">

        <Link href="/admin/requests" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        {/* Request header card */}
        <div className="bg-card rounded-xl border border-border shadow-card p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            {req.source === 'photo_scan' && <Camera className="w-4 h-4 text-[#4A3B52]" />}
            <span className="font-tabular font-700 text-lg">{req.requestId}</span>
            <StatusBadge status={paymentConfirmed ? ('Payment Confirmed' as never) : (req.status as never)} />
          </div>
          <p className="text-xs text-muted-foreground break-words">
            {req.client} • {client?.email} • {req.date}
            {perms.canSeeRequestBudget ? ` • Budget ${req.totalBudget}` : ''}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-4 min-w-0">

            {req.imageAttached && (
              <div className="bg-card rounded-xl border border-border shadow-card p-4">
                <h3 className="font-700 mb-3">Photo Submission</h3>
                <div className="flex gap-3">
                  <div className="w-20 h-20 sm:w-32 sm:h-32 flex-shrink-0 rounded-xl bg-gradient-to-br from-[#E8E1F5] to-[#D6CEE8] flex items-center justify-center text-4xl">📷</div>
                  <div className="min-w-0">
                    <p className="text-sm break-words">
                      AI detected: <span className="font-600">{req.detectedProduct}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{req.confidence}% match confidence</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quotations / Items card */}
            <div className="bg-card rounded-xl border border-border shadow-card p-4">
              <h3 className="font-700 mb-1">{showFullQuoteCols ? 'Per-product quotations' : 'Items Requested'}</h3>
              {showFullQuoteCols && (
                <p className="text-xs text-muted-foreground mb-3">
                  Enter RMB cost and unit price in CNY (¥) for each product, then Save.
                  <span className="ml-1 font-600 text-[#4A3B52]">¥1 = ₹{CNY_TO_INR.toFixed(2)}</span>
                </p>
              )}

              {/* ── MOBILE: card-per-product layout ── */}
              <div className="sm:hidden space-y-3">
                {lineItems.map(line => {
                  const marginInr = line.unitPriceCny != null
                    ? Math.round((line.unitPriceCny - line.rmbCostPerUnit) * CNY_TO_INR)
                    : null;
                  const editing = editingLineId === line.id;
                  return (
                    <div key={line.id} className="border border-border rounded-xl p-3 space-y-3">
                      {/* Product header */}
                      <div className="flex gap-3 items-start">
                        <div className="flex-shrink-0 flex flex-col items-center gap-1">
                          {line.imageUrl ? (
                            <img src={line.imageUrl} alt={line.name} className="w-12 h-12 rounded-lg object-cover border border-border" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center border border-border">
                              <ImageIcon className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          {showFullQuoteCols && (
                            <>
                              <input
                                type="file"
                                accept="image/*"
                                ref={el => { fileInputRefs.current[line.id] = el; }}
                                onChange={e => handleImageUpload(line.id, e)}
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => fileInputRefs.current[line.id]?.click()}
                                className="text-[10px] text-muted-foreground border border-border rounded px-1 py-0.5 flex items-center gap-0.5 w-full justify-center"
                              >
                                <Upload className="w-2.5 h-2.5" /> Upload
                              </button>
                            </>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-500 text-sm break-words">{line.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 break-words">{line.specs}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">Qty: <span className="font-tabular font-500 text-foreground">{line.quantity}</span></span>
                            <StatusPill status={line.status} revisionRequested={line.revisionRequested} />
                          </div>
                          {line.clientProposedInr != null && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Client suggested ₹{line.clientProposedInr.toLocaleString('en-IN')}/unit
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Price inputs — full quote only */}
                      {showFullQuoteCols && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">RMB / unit</label>
                            {editing ? (
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">¥</span>
                                <input
                                  type="number"
                                  min={0}
                                  className="input-field py-1.5 text-sm font-tabular w-full pl-5"
                                  value={draftRmb}
                                  onChange={e => setDraftRmb(e.target.value)}
                                  placeholder="RMB"
                                />
                              </div>
                            ) : (
                              <span className="text-sm font-tabular text-muted-foreground">¥{line.rmbCostPerUnit}</span>
                            )}
                          </div>
                          <div>
                            <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">Unit ¥ (CNY)</label>
                            {editing ? (
                              <div>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">¥</span>
                                  <input
                                    type="number"
                                    min={0}
                                    className="input-field py-1.5 text-sm font-tabular w-full pl-5"
                                    value={draftUnitCny}
                                    onChange={e => setDraftUnitCny(e.target.value)}
                                    placeholder="CNY"
                                  />
                                </div>
                                {(() => {
                                  const n = parseFloat(draftUnitCny.replace(/,/g, ''));
                                  return Number.isFinite(n) && n > 0 ? (
                                    <span className="text-[11px] text-muted-foreground font-tabular">
                                      ≈ ₹{Math.round(n * CNY_TO_INR).toLocaleString('en-IN')}
                                    </span>
                                  ) : null;
                                })()}
                              </div>
                            ) : (
                              <span className="text-sm font-tabular">{line.unitPriceCny != null ? `¥${line.unitPriceCny}` : '—'}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Margin + actions */}
                      {showFullQuoteCols && (
                        <div className="flex items-center justify-between pt-1 border-t border-border">
                          <div>
                            <span className="text-[10px] uppercase text-muted-foreground font-600">BK Margin</span>
                            <div className="text-sm font-tabular font-500">
                              {marginInr != null ? (
                                <span className={marginInr >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                  ₹{marginInr.toLocaleString('en-IN')}
                                </span>
                              ) : '—'}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {editing ? (
                              <>
                                <button type="button" onClick={() => saveLine(line.id)} className="btn-primary px-3 py-1.5 text-xs">Save</button>
                                <button type="button" onClick={cancelEdit} className="btn-secondary px-3 py-1.5 text-xs">Cancel</button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => beginEdit(line)}
                                className="btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1"
                              >
                                <Pencil className="w-3 h-3" /> Edit price
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Non-full-quote: specs only */}
                      {!showFullQuoteCols && (
                        <p className="text-xs text-muted-foreground break-words">{line.specs}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── DESKTOP: full table layout ── */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm min-w-[960px]">
                  <thead>
                    <tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
                      <th className="py-2 text-left font-600 w-16">Image</th>
                      <th className="py-2 text-left font-600">Product</th>
                      <th className="text-right font-600 w-16">Qty</th>
                      {showFullQuoteCols && (
                        <>
                          <th className="text-right font-600 w-28">RMB / unit</th>
                          <th className="text-right font-600 w-36">Unit ¥ (CNY)</th>
                          <th className="text-right font-600 w-28 text-[#4A3B52]">BK Margin ₹</th>
                          <th className="text-left font-600 pl-3 w-36">Status</th>
                          <th className="text-right font-600 w-40">Actions</th>
                        </>
                      )}
                      {!showFullQuoteCols && <th className="text-left font-600 pl-3">Specs</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lineItems.map(line => {
                      const marginInr =
                        line.unitPriceCny != null ? Math.round((line.unitPriceCny - line.rmbCostPerUnit) * CNY_TO_INR) : null;
                      const editing = editingLineId === line.id;
                      return (
                        <tr key={line.id}>
                          <td className="py-3 align-middle">
                            <div className="flex flex-col items-center gap-1">
                              {line.imageUrl ? (
                                <img src={line.imageUrl} alt={line.name} className="w-10 h-10 rounded-lg object-cover border border-border" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border border-border">
                                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                              {showFullQuoteCols && (
                                <>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    ref={el => { fileInputRefs.current[line.id] = el; }}
                                    onChange={e => handleImageUpload(line.id, e)}
                                    className="hidden"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => fileInputRefs.current[line.id]?.click()}
                                    className="btn-secondary px-1.5 py-0.5 text-[10px] inline-flex items-center gap-0.5"
                                    title="Upload product image"
                                  >
                                    <Upload className="w-2.5 h-2.5" /> Upload
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <p className="font-500">{line.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{line.specs}</p>
                          </td>
                          <td className="text-right font-tabular">{line.quantity}</td>
                          {showFullQuoteCols && (
                            <>
                              <td className="text-right align-middle">
                                {editing ? (
                                  <div className="relative w-full max-w-[6rem] ml-auto">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">¥</span>
                                    <input
                                      type="number"
                                      min={0}
                                      className="input-field py-1.5 text-sm font-tabular w-full pl-5"
                                      value={draftRmb}
                                      onChange={e => setDraftRmb(e.target.value)}
                                      placeholder="RMB"
                                    />
                                  </div>
                                ) : (
                                  <span className="font-tabular text-muted-foreground">¥{line.rmbCostPerUnit}</span>
                                )}
                              </td>
                              <td className="text-right align-middle">
                                {editing ? (
                                  <div className="flex flex-col items-end gap-1">
                                    <div className="relative w-full max-w-[7.5rem] ml-auto">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">¥</span>
                                      <input
                                        type="number"
                                        min={0}
                                        className="input-field py-1.5 text-sm font-tabular w-full pl-5"
                                        value={draftUnitCny}
                                        onChange={e => setDraftUnitCny(e.target.value)}
                                        placeholder="CNY"
                                      />
                                    </div>
                                    {(() => {
                                      const n = parseFloat(draftUnitCny.replace(/,/g, ''));
                                      return Number.isFinite(n) && n > 0 ? (
                                        <span className="text-[11px] text-muted-foreground font-tabular">
                                          ≈ ₹{Math.round(n * CNY_TO_INR).toLocaleString('en-IN')} INR
                                        </span>
                                      ) : null;
                                    })()}
                                  </div>
                                ) : (
                                  <span className="font-tabular">{line.unitPriceCny != null ? `¥${line.unitPriceCny}` : '—'}</span>
                                )}
                              </td>
                              <td className="text-right font-tabular">
                                {marginInr != null ? (
                                  <span className={marginInr >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                    ₹{marginInr.toLocaleString('en-IN')}
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="pl-3 align-middle">
                                <div className="flex flex-col gap-0.5">
                                  <StatusPill status={line.status} revisionRequested={line.revisionRequested} />
                                  {line.clientProposedInr != null && (
                                    <span className="text-[10px] text-muted-foreground">
                                      Client suggested ₹{line.clientProposedInr.toLocaleString('en-IN')}/unit
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="text-right align-middle">
                                {editing ? (
                                  <div className="flex flex-col gap-1 items-end">
                                    <button type="button" onClick={() => saveLine(line.id)} className="btn-primary px-2 py-1 text-xs">
                                      Save
                                    </button>
                                    <button type="button" onClick={cancelEdit} className="btn-secondary px-2 py-1 text-xs">
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => beginEdit(line)}
                                    className="btn-secondary px-2 py-1.5 text-xs inline-flex items-center gap-1"
                                  >
                                    <Pencil className="w-3 h-3" /> Edit price
                                  </button>
                                )}
                              </td>
                            </>
                          )}
                          {!showFullQuoteCols && <td className="pl-3 text-xs text-muted-foreground">{line.specs}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {showFullQuoteCols && (
                <button
                  type="button"
                  onClick={sendQuotationsToClient}
                  className="btn-primary w-full mt-4 py-2.5 text-sm inline-flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> Send quotations to client
                </button>
              )}

              {/* Logistics Estimate */}
              <div className="mt-5 pt-5 border-t border-border">
                <h4 className="font-700 mb-3">Logistics Estimate</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">Approx Weight</label>
                    <input
                      type="text"
                      className="input-field w-full text-sm"
                      value={logisticsWeight}
                      onChange={e => { setLogisticsWeight(e.target.value); setLogisticsSaved(false); }}
                      placeholder="e.g. 10kg / 0.2 CBM"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">Shipping Mode</label>
                    <select
                      className="input-field w-full text-sm"
                      value={logisticsMode}
                      onChange={e => { setLogisticsMode(e.target.value); setLogisticsSaved(false); }}
                    >
                      <option>Standard Air</option>
                      <option>Express Air</option>
                      <option>Sea Freight</option>
                      <option>Express Courier</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">Price per KG (¥ CNY)</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">¥</span>
                      <input
                        type="number"
                        min={0}
                        className="input-field w-full pl-5 text-sm"
                        value={logisticsPricePerKg}
                        onChange={e => { setLogisticsPricePerKg(e.target.value); setLogisticsSaved(false); }}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-[10px] uppercase text-muted-foreground font-600 block mb-1">Note</label>
                  <textarea
                    className="input-field w-full text-sm resize-none"
                    rows={2}
                    value={logisticsNote}
                    onChange={e => { setLogisticsNote(e.target.value); setLogisticsSaved(false); }}
                  />
                </div>
                <button
                  type="button"
                  onClick={saveLogistics}
                  className="btn-primary mt-3 px-4 py-2 text-sm inline-flex items-center gap-2"
                >
                  {logisticsSaved && <Check className="w-4 h-4" />}
                  {logisticsSaved ? 'Logistics Saved' : 'Save Logistics'}
                </button>
              </div>
            </div>

            {qs === 'names_qty' && (
              <div className="bg-card rounded-xl border border-border shadow-card p-4">
                <h3 className="font-700 mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#4A3B52]" /> Warehouse view
                </h3>
                <p className="text-sm text-muted-foreground">
                  You can see product names and quantities for picking and packing. Per-line INR pricing and RMB costs are hidden for your role.
                </p>
              </div>
            )}
            {qs === 'verification' && (
              <div className="bg-card rounded-xl border border-border shadow-card p-4">
                <h3 className="font-700 mb-2">Repacking Warehouse verification</h3>
                <p className="text-sm text-muted-foreground">
                  Use the item list above to verify goods against the request. Pricing fields are restricted — contact an administrator to update quotations.
                </p>
              </div>
            )}
            {qs === 'logistics_dims' && (
              <div className="bg-card rounded-xl border border-border shadow-card p-4">
                <h3 className="font-700 mb-3">Shipment weights & dimensions</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Logistics view — plan cartons and chargeable weight. Product and client pricing fields are not shown for your role.
                </p>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/40 rounded-lg p-3">
                    <dt className="text-[10px] uppercase text-muted-foreground font-600">Est. gross weight</dt>
                    <dd className="font-tabular font-700 mt-1">42.6 kg</dd>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <dt className="text-[10px] uppercase text-muted-foreground font-600">Chargeable volume</dt>
                    <dd className="font-tabular font-700 mt-1">0.38 CBM</dd>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <dt className="text-[10px] uppercase text-muted-foreground font-600">Carton count</dt>
                    <dd className="font-tabular font-700 mt-1">6</dd>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <dt className="text-[10px] uppercase text-muted-foreground font-600">Longest side</dt>
                    <dd className="font-tabular font-700 mt-1">112 cm</dd>
                  </div>
                </dl>
              </div>
            )}
            {qs === 'none' && (
              <div className="bg-muted/40 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Quotation tools are not enabled for your role on this screen.
              </div>
            )}

            {/* Conversation */}
            <div className="bg-card rounded-xl border border-border shadow-card p-4">
              <h3 className="font-700 mb-3">Conversation</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {thread.map((m, i) => (
                  <div key={i} className={`flex gap-3 ${m.by === 'admin' ? 'flex-row-reverse' : ''}`}>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-700 flex-shrink-0 ${m.by === 'admin' ? 'bg-[#5c5470]' : 'bg-[#c17b5c]'}`}
                    >
                      {m.by === 'admin' ? 'AS' : 'CL'}
                    </div>
                    <div className={`flex-1 max-w-[80%] p-3 rounded-lg text-sm break-words ${m.by === 'admin' ? 'bg-[#f0eef8]' : 'bg-muted/50'}`}>
                      <p>{m.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{m.t}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  value={msg}
                  onChange={e => setMsg(e.target.value)}
                  className="input-field flex-1 min-w-0"
                  placeholder="Reply to client..."
                />
                <button onClick={postMsg} className="btn-primary px-3 inline-flex items-center gap-1.5 text-sm flex-shrink-0">
                  <MessageSquare className="w-3.5 h-3.5" /> Send
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar column */}
          <div className="space-y-3 h-fit">
            {paymentProof && (
              <div className="bg-card rounded-xl border border-border shadow-card p-4">
                <h4 className="font-700 text-sm mb-3">Payment Proof</h4>
                <img
                  src={paymentProof}
                  alt="Client payment proof"
                  className="w-full rounded-lg border border-border object-contain max-h-48 bg-muted"
                />
                {paymentConfirmed ? (
                  <div className="mt-3 flex items-center gap-2 text-emerald-700 text-sm font-600">
                    <Check className="w-4 h-4" /> Payment Confirmed
                  </div>
                ) : (
                  <button
                    onClick={confirmPayment}
                    className="w-full mt-3 px-4 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-600 hover:bg-emerald-600 inline-flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Confirm Payment & Place Order
                  </button>
                )}
              </div>
            )}

            {perms.isFullAdmin && (
              <>
                <button
                  onClick={approve}
                  className="w-full px-4 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-600 hover:bg-emerald-600 inline-flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> Approve & Convert to Order
                </button>
                <button
                  onClick={reject}
                  className="w-full px-4 py-2.5 rounded-lg bg-red-100 text-red-700 text-sm font-600 hover:bg-red-200 inline-flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" /> Reject Request
                </button>
              </>
            )}
            <button onClick={moreInfo} className="btn-secondary w-full py-2.5 text-sm">
              Request More Info
            </button>
            <div className="bg-card rounded-xl border border-border shadow-card p-4">
              <h4 className="font-700 text-sm mb-2">Client Snapshot</h4>
              <div className="text-xs space-y-1">
                <p>
                  <span className="text-muted-foreground">Company:</span> <span className="font-500">{client?.company}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">GSTIN:</span> <span className="font-tabular">{client?.gstin}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Total Orders:</span> <span className="font-500">{client?.totalOrders}</span>
                </p>
                {perms.canSeeClientSpendInSnapshot && (
                  <p>
                    <span className="text-muted-foreground">Spend:</span> <span className="font-500">{client?.totalSpend}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
