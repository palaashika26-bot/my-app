'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { requestsApi } from '@/lib/api/requests.api';
import { useToast } from '@/components/ui/Toast';
import {
  FileText, Search, Filter, Send, CheckCircle2, XCircle,
  Clock, ChevronDown, Eye, RotateCcw, ArrowUpDown,
} from 'lucide-react';

// ─── Tab definitions ─────────────────────────────────────────────────────────
type Tab = 'all' | 'sent' | 'awaiting' | 'accepted' | 'rejected';

const TABS: { key: Tab; label: string; color: string }[] = [
  { key: 'all',      label: 'All Quotations',   color: '' },
  { key: 'sent',     label: 'Sent / In Progress', color: 'text-blue-600' },
  { key: 'awaiting', label: 'Awaiting Approval', color: 'text-amber-600' },
  { key: 'accepted', label: 'Accepted',           color: 'text-emerald-600' },
  { key: 'rejected', label: 'Rejected',           color: 'text-red-600' },
];

// Map backend/display request status → quotation tab.
function tabForStatus(status: string): Tab {
  if (['QUOTED', 'Awaiting Approval'].includes(status)) return 'awaiting';
  if (['ACCEPTED', 'CONVERTED', 'PARTIALLY_ACCEPTED', 'Payment Pending', 'Payment Confirmed',
       'Sourcing', 'At China Warehouse', 'Completed'].includes(status)) return 'accepted';
  if (['REJECTED', 'CANCELLED', 'Cancelled', 'Exception'].includes(status)) return 'rejected';
  // SUBMITTED / REVIEWING / 'Quotation in Progress' and anything else
  return 'sent';
}

// A request belongs on the Quotations page once it has entered the quoting
// pipeline (anything past a brand-new, untouched SUBMITTED request).
function isQuotation(status: string): boolean {
  return status !== 'SUBMITTED';
}

// Quotation badge styling
const STATUS_CHIP: Record<Tab, { bg: string; text: string; label: string }> = {
  all:      { bg: 'bg-muted',          text: 'text-foreground',    label: '' },
  sent:     { bg: 'bg-blue-100',       text: 'text-blue-700',      label: 'Sent' },
  awaiting: { bg: 'bg-amber-100',      text: 'text-amber-700',     label: 'Awaiting Approval' },
  accepted: { bg: 'bg-emerald-100',    text: 'text-emerald-700',   label: 'Accepted' },
  rejected: { bg: 'bg-red-100',        text: 'text-red-700',       label: 'Rejected' },
};

interface QuotRow {
  id: string;
  requestId: string;
  client: string;
  clientEmail: string;
  items: number;
  itemNames: string;
  budget: string;
  date: string;
  status: string;
  tab: Tab;
  lineCount: number;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Map a live API request into a quotation row.
function mapApiRequest(req: any): QuotRow {
  const itemCount = req.items?.length ?? 0;
  return {
    id: req.id,
    requestId: req.requestNumber,
    client: req.client?.companyName ?? '—',
    clientEmail: req.client?.user?.email ?? '—',
    items: itemCount,
    itemNames: (req.items ?? []).map((i: any) => i.productName).join(', '),
    budget: req.totalBudgetINR ? `₹${Number(req.totalBudgetINR).toLocaleString('en-IN')}` : '—',
    date: fmtDate(req.createdAt),
    status: req.status,
    tab: tabForStatus(req.status),
    lineCount: itemCount,
  };
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────
type SortKey = 'requestId' | 'client' | 'date' | 'items';

export default function SourcingQuotationsPage() {
  const { addToast } = useToast();

  const [allRows, setAllRows] = useState<QuotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Local status overrides (staff can mark accepted / rejected inline)
  const [overrides, setOverrides] = useState<Record<string, Tab>>({});

  useEffect(() => {
    setLoading(true);
    requestsApi.getRequests({ limit: 100 })
      .then((r) => {
        const apiData = r.data?.data ?? [];
        setAllRows(apiData.filter((req: any) => isQuotation(req.status)).map(mapApiRequest));
      })
      .catch(() => setAllRows([]))
      .finally(() => setLoading(false));
  }, []);

  function effectiveTab(row: QuotRow): Tab {
    return overrides[row.id] ?? row.tab;
  }

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = allRows;
    if (activeTab !== 'all') rows = rows.filter(r => effectiveTab(r) === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.requestId.toLowerCase().includes(q) ||
        r.client.toLowerCase().includes(q) ||
        r.itemNames.toLowerCase().includes(q)
      );
    }
    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'requestId') cmp = a.requestId.localeCompare(b.requestId);
      else if (sortKey === 'client') cmp = a.client.localeCompare(b.client);
      else if (sortKey === 'items') cmp = a.items - b.items;
      else cmp = a.date.localeCompare(b.date);
      return sortAsc ? cmp : -cmp;
    });
    return rows;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, activeTab, search, sortKey, sortAsc, overrides]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(true); }
    setPage(1);
  }

  function markStatus(id: string, tab: Tab, label: string) {
    setOverrides(prev => ({ ...prev, [id]: tab }));
    addToast({ type: 'success', title: `Quotation ${label}` });
  }

  function resend(row: QuotRow) {
    addToast({ type: 'success', title: 'Quotation resent', description: `${row.requestId} sent to ${row.client}` });
  }

  // ── Tab counts ────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: allRows.length, sent: 0, awaiting: 0, accepted: 0, rejected: 0 };
    allRows.forEach(r => { c[effectiveTab(r)]++; });
    return c;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, overrides]);

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? <ArrowUpDown className={`w-3 h-3 inline ml-1 ${sortAsc ? 'rotate-180' : ''}`} />
      : <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-30" />;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-700 text-foreground">Quotations</h1>
        <p className="text-sm text-muted-foreground mt-1">Track and manage all sent quotations</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Sent',        value: counts.all,      icon: FileText,      bg: 'bg-blue-50',    ic: 'text-blue-600' },
          { label: 'Awaiting Approval', value: counts.awaiting, icon: Clock,         bg: 'bg-amber-50',   ic: 'text-amber-600' },
          { label: 'Accepted',          value: counts.accepted, icon: CheckCircle2,  bg: 'bg-emerald-50', ic: 'text-emerald-600' },
          { label: 'Rejected',          value: counts.rejected, icon: XCircle,       bg: 'bg-red-50',     ic: 'text-red-600' },
        ].map(card => (
          <div key={card.label} className="bg-card rounded-xl border border-border shadow-card p-4">
            <div className={`w-9 h-9 rounded-lg ${card.bg} ${card.ic} flex items-center justify-center mb-2`}>
              <card.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-700">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-5 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            className={`px-3 py-2 text-xs font-600 whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-[#4A3B52] text-[#4A3B52]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
              activeTab === tab.key ? 'bg-[#4A3B52]/10 text-[#4A3B52]' : 'bg-muted text-muted-foreground'
            }`}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Search + controls */}
      <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search quotations..."
            className="input-field pl-8 text-sm w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Show</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="input-field text-xs py-1.5 pr-7"
          >
            {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground cursor-pointer" onClick={() => toggleSort('requestId')}>
                  Request ID <SortIcon k="requestId" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground cursor-pointer" onClick={() => toggleSort('client')}>
                  Client <SortIcon k="client" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground hidden sm:table-cell cursor-pointer" onClick={() => toggleSort('items')}>
                  Items <SortIcon k="items" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground hidden md:table-cell">
                  Products
                </th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground hidden lg:table-cell cursor-pointer" onClick={() => toggleSort('date')}>
                  Date <SortIcon k="date" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Budget</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-xs font-600 text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Loading quotations…
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No quotations found.
                  </td>
                </tr>
              ) : (
                paginated.map(row => {
                  const et = effectiveTab(row);
                  const chip = STATUS_CHIP[et];
                  return (
                    <tr key={row.id} className="hover:bg-muted/50 transition-colors">
                      {/* Request ID */}
                      <td className="px-4 py-3">
                        <span className="font-tabular font-600 text-xs">{row.requestId}</span>
                      </td>

                      {/* Client */}
                      <td className="px-4 py-3">
                        <p className="font-500 text-xs text-foreground">{row.client}</p>
                        <p className="text-[10px] text-muted-foreground">{row.clientEmail}</p>
                      </td>

                      {/* Items count */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs font-500">{row.lineCount}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">item{row.lineCount !== 1 ? 's' : ''}</span>
                      </td>

                      {/* Item names preview */}
                      <td className="px-4 py-3 hidden md:table-cell max-w-[200px]">
                        <p className="text-xs text-muted-foreground truncate">{row.itemNames}</p>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="font-tabular text-xs text-muted-foreground">{row.date}</span>
                      </td>

                      {/* Budget */}
                      <td className="px-4 py-3">
                        <span className="font-tabular font-600 text-xs">{row.budget}</span>
                      </td>

                      {/* Status chip */}
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-600 px-2 py-0.5 rounded-full ${chip.bg} ${chip.text}`}>
                          {chip.label || et}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/staff/sourcing/requests/${row.id}`}
                            className="inline-flex items-center gap-1 text-xs text-[#4A3B52] font-600 hover:underline px-2 py-1 rounded hover:bg-[#4A3B52]/5 transition-colors"
                          >
                            <Eye className="w-3 h-3" /> View
                          </Link>

                          {et === 'sent' || et === 'awaiting' ? (
                            <>
                              <button
                                onClick={() => markStatus(row.id, 'accepted', 'marked as Accepted')}
                                className="text-[10px] font-600 px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => markStatus(row.id, 'rejected', 'marked as Rejected')}
                                className="text-[10px] font-600 px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          ) : null}

                          {et === 'rejected' ? (
                            <button
                              onClick={() => resend(row)}
                              className="inline-flex items-center gap-1 text-[10px] font-600 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" /> Resend
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded border border-border bg-card hover:bg-muted disabled:opacity-40 transition-colors text-xs"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '…')[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="px-2 py-1.5">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`px-3 py-1.5 rounded border text-xs transition-colors ${
                      page === p
                        ? 'bg-[#4A3B52] text-white border-[#4A3B52]'
                        : 'border-border bg-card hover:bg-muted'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded border border-border bg-card hover:bg-muted disabled:opacity-40 transition-colors text-xs"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Empty global state */}
      {!loading && allRows.length === 0 && (
        <div className="bg-card rounded-xl border border-border shadow-card p-12 text-center mt-4">
          <Send className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-600 text-foreground">No quotations sent yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Head over to Requests to start quoting.
          </p>
          <Link href="/staff/sourcing/requests" className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-2">
            <FileText className="w-4 h-4" /> View Requests
          </Link>
        </div>
      )}
    </div>
  );
}
