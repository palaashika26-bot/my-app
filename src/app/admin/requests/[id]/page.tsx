'use client';
import React, { useState, use, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { mockRequests, mockClients } from '@/lib/adminMockData';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Camera, Check, X, MessageSquare, Send, Package, Pencil } from 'lucide-react';
import { notFound } from 'next/navigation';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import type { RequestLineItem, PerProductQuoteStatus } from '@/lib/mockData';
import { defaultLineItemsFromRequest, loadRfqLineItems, persistRfqLineItems } from '@/lib/rfqLineItems';

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
  const [draftUnitInr, setDraftUnitInr] = useState('');
  const [msg, setMsg] = useState('');
  const [thread, setThread] = useState([
    { by: 'client', text: 'Hi team, please source these items urgently. Sample required first.', t: '2 hours ago' },
    { by: 'admin', text: 'On it — sample available in 5–7 days. We will share supplier shortlist shortly.', t: '1 hour ago' },
  ]);

  useEffect(() => {
    const row = mockRequests.find(r => r.id === id);
    if (!row) return;
    setLineItems(loadRfqLineItems(row));
  }, [id]);

  if (!req) return notFound();
  const client = mockClients.find(c => c.name === req.client);

  function beginEdit(line: RequestLineItem) {
    setEditingLineId(line.id);
    setDraftUnitInr(line.unitPriceInr != null ? String(line.unitPriceInr) : '');
  }

  function cancelEdit() {
    setEditingLineId(null);
    setDraftUnitInr('');
  }

  function saveLine(lineId: string) {
    if (qs !== 'full') return;
    const n = parseFloat(draftUnitInr.replace(/,/g, ''));
    const unit = Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
    setLineItems(prev => {
      const next = prev.map(l =>
        l.id === lineId
          ? {
              ...l,
              unitPriceInr: unit,
              status: unit != null ? ('Quoted' as const) : ('Pending' as const),
              revisionRequested: false,
              clientProposedInr: undefined,
            }
          : l
      );
      persistRfqLineItems(id, next);
      return next;
    });
    setEditingLineId(null);
    setDraftUnitInr('');
    addToast({
      type: 'success',
      title: unit != null ? 'Price saved' : 'Line cleared',
      description: unit != null ? 'Unit price updated for this product.' : 'This line is pending a unit price.',
    });
  }

  function sendQuotationsToClient() {
    if (qs !== 'full') return;
    const quoted = lineItems.filter(l => l.status === 'Quoted');
    if (!quoted.length) {
      addToast({ type: 'warning', title: 'Nothing to send', description: 'Save a unit price in INR for at least one product first.' });
      return;
    }
    addToast({
      type: 'success',
      title: 'Quotations sent',
      description: `Per-product quotes (${quoted.length} line${quoted.length === 1 ? '' : 's'}) shared with ${client?.email ?? 'the client'}.`,
    });
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
  function postMsg() {
    if (!msg.trim()) return;
    setThread(t => [...t, { by: 'admin', text: msg, t: 'just now' }]);
    setMsg('');
  }

  const showFullQuoteCols = qs === 'full';

  return (
    <AdminLayout>
      <Link href="/admin/requests" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <div className="bg-card rounded-xl border border-border shadow-card p-5 mb-5">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          {req.source === 'photo_scan' && <Camera className="w-4 h-4 text-accent" />}
          <span className="font-tabular font-700 text-lg">{req.requestId}</span>
          <StatusBadge status={req.status as never} />
        </div>
        <p className="text-xs text-muted-foreground">
          {req.client} • {client?.email} • {req.date}
          {perms.canSeeRequestBudget ? ` • Budget ${req.totalBudget}` : ''}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {req.imageAttached && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h3 className="font-700 mb-3">Photo Submission</h3>
              <div className="flex gap-4">
                <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-5xl">📷</div>
                <div>
                  <p className="text-sm">
                    AI detected: <span className="font-600">{req.detectedProduct}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{req.confidence}% match confidence</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-1">{showFullQuoteCols ? 'Per-product quotations' : 'Items Requested'}</h3>
            {showFullQuoteCols && (
              <p className="text-xs text-muted-foreground mb-3">
                Enter unit price in INR for each product, then Save. Client sees each line as its own quotation. RMB cost is internal only.
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase text-muted-foreground">
                    <th className="py-2 text-left font-600">Product</th>
                    <th className="text-right font-600 w-20">Qty</th>
                    {showFullQuoteCols && (
                      <>
                        <th className="text-right font-600 w-28">RMB / unit</th>
                        <th className="text-right font-600 w-36">Unit ₹ (INR)</th>
                        <th className="text-right font-600 w-32">Total ₹</th>
                        <th className="text-left font-600 pl-3 w-36">Status</th>
                        <th className="text-right font-600 w-36">Actions</th>
                      </>
                    )}
                    {!showFullQuoteCols && <th className="text-left font-600 pl-3">Specs</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lineItems.map(line => {
                    const totalInr =
                      line.unitPriceInr != null && line.unitPriceInr > 0 ? line.quantity * line.unitPriceInr : null;
                    const editing = editingLineId === line.id;
                    return (
                      <tr key={line.id}>
                        <td className="py-3">
                          <p className="font-500">{line.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{line.specs}</p>
                        </td>
                        <td className="text-right font-tabular">{line.quantity}</td>
                        {showFullQuoteCols && (
                          <>
                            <td className="text-right font-tabular text-muted-foreground">¥{line.rmbCostPerUnit}</td>
                            <td className="text-right align-middle">
                              {editing ? (
                                <input
                                  type="number"
                                  min={0}
                                  className="input-field py-1.5 text-sm font-tabular w-full max-w-[7.5rem] ml-auto"
                                  value={draftUnitInr}
                                  onChange={e => setDraftUnitInr(e.target.value)}
                                  placeholder="INR"
                                />
                              ) : (
                                <span className="font-tabular">{line.unitPriceInr != null ? `₹${line.unitPriceInr.toLocaleString('en-IN')}` : '—'}</span>
                              )}
                            </td>
                            <td className="text-right font-tabular">{totalInr != null ? `₹${totalInr.toLocaleString('en-IN')}` : '—'}</td>
                            <td className="pl-3 align-middle">
                              <div className="flex flex-col gap-0.5">
                                <StatusPill status={line.status} revisionRequested={line.revisionRequested} />
                                {line.clientProposedInr != null && (
                                  <span className="text-[10px] text-muted-foreground">Client suggested ₹{line.clientProposedInr.toLocaleString('en-IN')}/unit</span>
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
          </div>

          {qs === 'names_qty' && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h3 className="font-700 mb-2 flex items-center gap-2">
                <Package className="w-4 h-4 text-accent" /> Warehouse view
              </h3>
              <p className="text-sm text-muted-foreground">
                You can see product names and quantities for picking and packing. Per-line INR pricing and RMB costs are hidden for your role.
              </p>
            </div>
          )}
          {qs === 'verification' && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h3 className="font-700 mb-2">QC verification</h3>
              <p className="text-sm text-muted-foreground">
                Use the item list above to verify goods against the request. Pricing fields are restricted — contact an administrator to update quotations.
              </p>
            </div>
          )}
          {qs === 'logistics_dims' && (
            <div className="bg-card rounded-xl border border-border shadow-card p-5">
              <h3 className="font-700 mb-3">Shipment weights & dimensions</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Logistics view — plan cartons and chargeable weight. Product and client pricing fields are not shown for your role.
              </p>
              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
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
            <div className="bg-muted/40 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              Quotation tools are not enabled for your role on this screen.
            </div>
          )}

          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-700 mb-3">Conversation</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {thread.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.by === 'admin' ? 'flex-row-reverse' : ''}`}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-700 flex-shrink-0 ${m.by === 'admin' ? 'bg-accent' : 'bg-primary'}`}
                  >
                    {m.by === 'admin' ? 'AS' : 'CL'}
                  </div>
                  <div className={`flex-1 max-w-[80%] p-3 rounded-lg text-sm ${m.by === 'admin' ? 'bg-orange-50' : 'bg-muted/50'}`}>
                    <p>{m.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{m.t}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <input value={msg} onChange={e => setMsg(e.target.value)} className="input-field flex-1" placeholder="Reply to client..." />
              <button onClick={postMsg} className="btn-primary px-3 inline-flex items-center gap-1.5 text-sm">
                <MessageSquare className="w-3.5 h-3.5" /> Send
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3 h-fit">
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
    </AdminLayout>
  );
}
