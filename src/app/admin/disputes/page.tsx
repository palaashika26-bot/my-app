'use client';
import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { TOKEN_KEY } from '@/lib/api/axiosClient';
import { X, Flag, RefreshCw, ChevronRight, Play, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';

type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';
type DisputeType = 'REPLACEMENT' | 'ISSUE';

interface Dispute {
  id: string;
  orderId: string;
  clientId: string;
  type: DisputeType;
  reason: string;
  videoProofUrl: string | null;
  attachments: string[] | null;
  status: DisputeStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  order: { orderNumber: string; status: string; createdAt: string };
  client: {
    companyName: string;
    user: { firstName: string; lastName: string; email: string };
  };
}

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

function apiFetch(path: string, options: RequestInit = {}) {
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers ?? {}),
    },
  });
}

function StatusBadge({ status }: { status: DisputeStatus }) {
  const map: Record<DisputeStatus, { label: string; cls: string }> = {
    OPEN:         { label: 'Open',         cls: 'bg-yellow-100 text-yellow-800 border border-yellow-300' },
    UNDER_REVIEW: { label: 'Under Review', cls: 'bg-blue-100 text-blue-800 border border-blue-300' },
    RESOLVED:     { label: 'Resolved',     cls: 'bg-green-100 text-green-800 border border-green-300' },
    REJECTED:     { label: 'Rejected',     cls: 'bg-red-100 text-red-800 border border-red-300' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-muted text-foreground' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 ${cls}`}>{label}</span>;
}

function TypeBadge({ type }: { type: DisputeType }) {
  return type === 'REPLACEMENT'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-600 bg-amber-100 text-amber-800 border border-amber-300"><RefreshCw className="w-3 h-3" /> Replacement</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-600 bg-orange-100 text-orange-800 border border-orange-300"><Flag className="w-3 h-3" /> Issue</span>;
}

// Resolve the list of proof attachments for a dispute.
// Prefers the new `attachments[]` column; falls back to the legacy single
// `videoProofUrl` (which older rows may have packed as a JSON array string).
function getProofUrls(d: Dispute): string[] {
  if (d.attachments && d.attachments.length > 0) {
    return d.attachments.filter(a => typeof a === 'string' && a.length > 0);
  }
  const v = d.videoProofUrl;
  if (!v) return [];
  if (v.startsWith('[')) {
    try {
      const arr = JSON.parse(v);
      if (Array.isArray(arr)) {
        return arr
          .map((x) => (typeof x === 'string' ? x : x?.data))
          .filter((s): s is string => typeof s === 'string' && s.length > 0);
      }
    } catch {}
  }
  return [v];
}

function ProofItem({ url, idx }: { url: string; idx: number }) {
  const isImage = url.startsWith('data:image/') || /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(url);
  const isVideo = url.startsWith('data:video/') || /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(url);
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={`Attachment ${idx + 1}`} className="w-full h-32 object-cover rounded-xl border border-border group-hover:opacity-90 transition-opacity" />
      </a>
    );
  }
  if (isVideo) {
    return <video src={url} controls className="w-full h-32 rounded-xl border border-border bg-black object-cover" />;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm font-600 hover:bg-muted transition-colors"
    >
      <Play className="w-4 h-4 text-[#4A3B52]" /> View attachment {idx + 1}
    </a>
  );
}

const STATUS_TABS: { label: string; value: string }[] = [
  { label: 'All',          value: '' },
  { label: 'Open',         value: 'OPEN' },
  { label: 'Under Review', value: 'UNDER_REVIEW' },
  { label: 'Resolved',     value: 'RESOLVED' },
  { label: 'Rejected',     value: 'REJECTED' },
];

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState('');

  const fetchDisputes = useCallback(async (status?: string) => {
    setLoading(true);
    try {
      const qs = status ? `?status=${status}` : '';
      const res = await apiFetch(`/api/disputes${qs}`);
      const data = await res.json();
      if (data.success) setDisputes(data.data ?? []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDisputes(activeTab || undefined); }, [activeTab, fetchDisputes]);

  function openDetail(d: Dispute) {
    setSelected(d);
    setAdminNote(d.adminNote ?? '');
  }

  async function handleUpdateStatus(newStatus: DisputeStatus) {
    if (!selected || updating) return;
    setUpdating(true);
    try {
      const res = await apiFetch(`/api/disputes/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, adminNote: adminNote.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        const updated = { ...selected, status: newStatus, adminNote: adminNote.trim() || selected.adminNote };
        setSelected(updated);
        setDisputes(prev => prev.map(d => d.id === updated.id ? updated : d));
        setToast(`Dispute marked as ${newStatus.replace('_', ' ').toLowerCase()}.`);
        setTimeout(() => setToast(''), 4000);
      } else {
        alert(data.message ?? 'Failed to update dispute.');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setUpdating(false);
    }
  }

  const clientName = (d: Dispute) =>
    `${d.client.user.firstName} ${d.client.user.lastName}`;

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
          <Flag className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-700 text-foreground">Disputes</h1>
          <p className="text-xs text-muted-foreground">Replacement requests and post-delivery issue reports</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 border-b border-border">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2.5 text-sm font-600 border-b-2 transition-colors ${
              activeTab === tab.value
                ? 'border-[#4A3B52] text-[#4A3B52]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.value === '' && disputes.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5">{disputes.length}</span>
            )}
            {tab.value === 'OPEN' && disputes.filter(d => d.status === 'OPEN').length > 0 && (
              <span className="ml-1.5 text-xs bg-yellow-100 text-yellow-800 rounded-full px-1.5">
                {disputes.filter(d => d.status === 'OPEN').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Disputes table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">Loading disputes…</div>
      ) : disputes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <CheckCircle2 className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No disputes found{activeTab ? ` with status "${activeTab.replace('_', ' ')}"` : ''}.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[11px] uppercase text-muted-foreground">
                  <th className="px-4 py-3 text-left font-600">Order #</th>
                  <th className="px-4 py-3 text-left font-600">Client</th>
                  <th className="px-4 py-3 text-left font-600">Type</th>
                  <th className="px-4 py-3 text-left font-600 hidden md:table-cell">Reason</th>
                  <th className="px-4 py-3 text-left font-600">Status</th>
                  <th className="px-4 py-3 text-left font-600 hidden sm:table-cell">Date</th>
                  <th className="px-4 py-3 text-right font-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {disputes.map(d => (
                  <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-tabular font-600 text-[#4A3B52]">{d.order.orderNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-500">{clientName(d)}</p>
                      <p className="text-[11px] text-muted-foreground">{d.client.companyName}</p>
                    </td>
                    <td className="px-4 py-3"><TypeBadge type={d.type} /></td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[200px]">
                      <span className="line-clamp-2">{d.reason.slice(0, 60)}{d.reason.length > 60 ? '…' : ''}</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                      {new Date(d.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openDetail(d)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-600 bg-[#4A3B52]/10 text-[#4A3B52] hover:bg-[#4A3B52]/20 transition-colors"
                      >
                        Review <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Side Panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-lg bg-card h-full shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card sticky top-0 z-10">
              <div>
                <h3 className="font-700 text-foreground">Dispute Review</h3>
                <p className="text-xs text-muted-foreground">Order #{selected.order.orderNumber} · {clientName(selected)}</p>
              </div>
              <button onClick={() => setSelected(null)} className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Dispute info */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <TypeBadge type={selected.type} />
                  <StatusBadge status={selected.status} />
                </div>

                <div className="bg-muted/40 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order</span>
                    <span className="font-600">{selected.order.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client</span>
                    <span className="font-500">{clientName(selected)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Company</span>
                    <span className="font-500">{selected.client.companyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-500 text-xs">{selected.client.user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submitted</span>
                    <span className="font-500">
                      {new Date(selected.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-600 text-muted-foreground mb-1.5">Full Reason</p>
                  <p className="text-sm bg-muted/30 rounded-xl p-4 leading-relaxed">{selected.reason}</p>
                </div>

                {(() => {
                  const proofs = getProofUrls(selected);
                  if (proofs.length === 0) return null;
                  return (
                    <div>
                      <p className="text-xs font-600 text-muted-foreground mb-1.5">
                        Proof {proofs.length > 1 ? `(${proofs.length} files)` : ''}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {proofs.map((url, idx) => (
                          <ProofItem key={idx} url={url} idx={idx} />
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {selected.adminNote && (
                  <div>
                    <p className="text-xs font-600 text-muted-foreground mb-1.5">Previous Admin Note</p>
                    <p className="text-sm bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-900">{selected.adminNote}</p>
                  </div>
                )}
              </div>

              {/* Admin actions */}
              {selected.status !== 'RESOLVED' && selected.status !== 'REJECTED' && (
                <div className="border-t border-border pt-5 space-y-4">
                  <div>
                    <label className="text-xs font-600 text-foreground mb-1.5 block">Admin Note <span className="text-muted-foreground font-400">(optional)</span></label>
                    <textarea
                      value={adminNote}
                      onChange={e => setAdminNote(e.target.value.slice(0, 1000))}
                      placeholder="Add a note for the client..."
                      rows={3}
                      className="input-field w-full resize-none text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {selected.status === 'OPEN' && (
                      <button
                        onClick={() => handleUpdateStatus('UNDER_REVIEW')}
                        disabled={updating}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-600 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
                      >
                        <Clock className="w-3.5 h-3.5" /> Under Review
                      </button>
                    )}
                    <button
                      onClick={() => handleUpdateStatus('RESOLVED')}
                      disabled={updating}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-600 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('REJECTED')}
                      disabled={updating}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-600 bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              )}

              {(selected.status === 'RESOLVED' || selected.status === 'REJECTED') && (
                <div className={`rounded-xl p-4 border text-sm font-600 flex items-center gap-2 ${
                  selected.status === 'RESOLVED'
                    ? 'bg-green-50 border-green-300 text-green-800'
                    : 'bg-red-50 border-red-300 text-red-800'
                }`}>
                  {selected.status === 'RESOLVED'
                    ? <><CheckCircle2 className="w-4 h-4 flex-shrink-0" /> This dispute has been resolved.</>
                    : <><XCircle className="w-4 h-4 flex-shrink-0" /> This dispute has been rejected.</>
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-600 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}
    </AdminLayout>
  );
}
