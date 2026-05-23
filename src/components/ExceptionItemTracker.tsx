'use client';
import React, { useState, useEffect } from 'react';
import { Package, Plus, X, CheckCircle2 } from 'lucide-react';

const ISSUE_TYPES = ['Short Stock', 'Out of Stock', 'Quality Issue', 'Wrong Item'] as const;
const ITEM_STATUSES = ['Under Review', 'Replacement Found', 'Resolved'] as const;

type IssueType = typeof ISSUE_TYPES[number];
type ItemStatus = typeof ITEM_STATUSES[number];

interface ExceptionItem {
  id: string;
  itemName: string;
  issueType: IssueType;
  status: ItemStatus;
  note: string;
  replacementName?: string;
  replacementPrice?: string;
  replacementAccepted?: boolean | null;
}

interface ExceptionItemTrackerProps {
  orderId: string;
  isAdmin: boolean;
  orderItems?: { name: string; qty?: number }[];
}

const statusColors: Record<ItemStatus, string> = {
  'Under Review': 'bg-yellow-100 text-yellow-700',
  'Replacement Found': 'bg-[#e4eeee] text-[#6b8f90]',
  'Resolved': 'bg-emerald-100 text-emerald-700',
};

export default function ExceptionItemTracker({ orderId, isAdmin, orderItems }: ExceptionItemTrackerProps) {
  const storageKey = `exception-items-${orderId}`;
  const [exceptionItems, setExceptionItems] = useState<ExceptionItem[]>([]);
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({
    itemName: '',
    issueType: 'Short Stock' as IssueType,
    status: 'Under Review' as ItemStatus,
    note: '',
    replacementName: '',
    replacementPrice: '',
  });

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) setExceptionItems(JSON.parse(stored));
  }, [storageKey]);

  function persist(items: ExceptionItem[]) {
    setExceptionItems(items);
    localStorage.setItem(storageKey, JSON.stringify(items));
  }

  function addExceptionItem() {
    if (!newItem.itemName.trim()) return;
    const item: ExceptionItem = {
      id: `ei-${Date.now()}`,
      itemName: newItem.itemName,
      issueType: newItem.issueType,
      status: newItem.status,
      note: newItem.note,
      replacementName: newItem.replacementName || undefined,
      replacementPrice: newItem.replacementPrice || undefined,
      replacementAccepted: null,
    };
    persist([...exceptionItems, item]);
    setAddingItem(false);
    setNewItem({ itemName: '', issueType: 'Short Stock', status: 'Under Review', note: '', replacementName: '', replacementPrice: '' });
  }

  function updateItem(id: string, changes: Partial<ExceptionItem>) {
    persist(exceptionItems.map(ei => ei.id === id ? { ...ei, ...changes } : ei));
  }

  function removeItem(id: string) {
    persist(exceptionItems.filter(ei => ei.id !== id));
  }

  function handleReplacement(id: string, accepted: boolean) {
    updateItem(id, { replacementAccepted: accepted, status: accepted ? 'Resolved' : 'Under Review' });
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-red-500" />
          <h3 className="font-700 text-sm">Exception Items</h3>
          {exceptionItems.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-700 bg-red-100 text-red-700 rounded-full">
              {exceptionItems.length}
            </span>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={() => setAddingItem(v => !v)}
            className="text-xs font-600 text-[#4A3B52] hover:text-[#4A3B52]/80 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
        )}
      </div>

      {exceptionItems.length === 0 && !addingItem && (
        <p className="text-xs text-muted-foreground text-center py-4">
          {isAdmin
            ? 'No exception items added yet. Click "Add Item" to flag affected items.'
            : 'No exception items have been flagged by admin yet.'}
        </p>
      )}

      <div className="space-y-3">
        {exceptionItems.map(ei => (
          <div key={ei.id} className="border border-border rounded-lg p-3 bg-muted/20">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-600 text-foreground">{ei.itemName}</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-600 bg-red-100 text-red-700 rounded">
                    {ei.issueType}
                  </span>
                  <span className={`px-1.5 py-0.5 text-[10px] font-600 rounded ${statusColors[ei.status]}`}>
                    {ei.status}
                  </span>
                </div>
                {ei.note && <p className="text-xs text-muted-foreground mt-1">{ei.note}</p>}

                {ei.replacementName && (
                  <div className="mt-2 p-2 bg-[#f5f4f7] border border-[#e8e4f0] rounded-lg">
                    <p className="text-xs font-600 text-[#5c5470]">Suggested Replacement</p>
                    <p className="text-xs text-[#6b8f90] mt-0.5">
                      {ei.replacementName}{ei.replacementPrice ? ` — ${ei.replacementPrice}` : ''}
                    </p>
                    {!isAdmin && ei.replacementAccepted === null && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleReplacement(ei.id, true)}
                          className="px-2.5 py-1 text-xs font-600 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleReplacement(ei.id, false)}
                          className="px-2.5 py-1 text-xs font-600 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {ei.replacementAccepted === true && (
                      <p className="text-xs text-emerald-700 font-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Replacement accepted
                      </p>
                    )}
                    {ei.replacementAccepted === false && (
                      <p className="text-xs text-red-600 font-600 mt-1">Replacement rejected</p>
                    )}
                  </div>
                )}

                {isAdmin && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase font-600">Issue Type</label>
                      <select
                        value={ei.issueType}
                        onChange={e => updateItem(ei.id, { issueType: e.target.value as IssueType })}
                        className="input-field text-xs py-1 mt-0.5 w-full"
                      >
                        {ISSUE_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase font-600">Status</label>
                      <select
                        value={ei.status}
                        onChange={e => updateItem(ei.id, { status: e.target.value as ItemStatus })}
                        className="input-field text-xs py-1 mt-0.5 w-full"
                      >
                        {ITEM_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-muted-foreground uppercase font-600">Note</label>
                      <input
                        value={ei.note}
                        onChange={e => updateItem(ei.id, { note: e.target.value })}
                        placeholder="Explain the issue..."
                        className="input-field text-xs py-1 mt-0.5 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase font-600">Replacement Name</label>
                      <input
                        value={ei.replacementName || ''}
                        onChange={e => updateItem(ei.id, { replacementName: e.target.value || undefined })}
                        placeholder="e.g. LED Strip Pro 5m"
                        className="input-field text-xs py-1 mt-0.5 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase font-600">Replacement Price</label>
                      <input
                        value={ei.replacementPrice || ''}
                        onChange={e => updateItem(ei.id, { replacementPrice: e.target.value || undefined })}
                        placeholder="e.g. ₹550/unit"
                        className="input-field text-xs py-1 mt-0.5 w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
              {isAdmin && (
                <button
                  onClick={() => removeItem(ei.id)}
                  className="text-muted-foreground hover:text-red-500 flex-shrink-0 mt-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isAdmin && addingItem && (
        <div className="mt-3 border border-dashed border-[#4A3B52]/40 rounded-lg p-3 bg-[#4A3B52]/10">
          <p className="text-xs font-600 text-foreground mb-2">Add Exception Item</p>
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-600">Item Name</label>
              {orderItems && orderItems.length > 0 ? (
                <select
                  value={newItem.itemName}
                  onChange={e => setNewItem(p => ({ ...p, itemName: e.target.value }))}
                  className="input-field text-xs py-1 mt-0.5 w-full"
                >
                  <option value="">-- Select item --</option>
                  {orderItems.map(it => <option key={it.name} value={it.name}>{it.name}</option>)}
                </select>
              ) : (
                <input
                  value={newItem.itemName}
                  onChange={e => setNewItem(p => ({ ...p, itemName: e.target.value }))}
                  placeholder="Item name..."
                  className="input-field text-xs py-1 mt-0.5 w-full"
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-600">Issue Type</label>
                <select
                  value={newItem.issueType}
                  onChange={e => setNewItem(p => ({ ...p, issueType: e.target.value as IssueType }))}
                  className="input-field text-xs py-1 mt-0.5 w-full"
                >
                  {ISSUE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-600">Status</label>
                <select
                  value={newItem.status}
                  onChange={e => setNewItem(p => ({ ...p, status: e.target.value as ItemStatus }))}
                  className="input-field text-xs py-1 mt-0.5 w-full"
                >
                  {ITEM_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-600">Note</label>
              <input
                value={newItem.note}
                onChange={e => setNewItem(p => ({ ...p, note: e.target.value }))}
                placeholder="Explain the issue..."
                className="input-field text-xs py-1 mt-0.5 w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-600">Replacement (optional)</label>
                <input
                  value={newItem.replacementName}
                  onChange={e => setNewItem(p => ({ ...p, replacementName: e.target.value }))}
                  placeholder="Replacement name..."
                  className="input-field text-xs py-1 mt-0.5 w-full"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-600">Price (optional)</label>
                <input
                  value={newItem.replacementPrice}
                  onChange={e => setNewItem(p => ({ ...p, replacementPrice: e.target.value }))}
                  placeholder="e.g. ₹550/unit"
                  className="input-field text-xs py-1 mt-0.5 w-full"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-1">
              <button
                onClick={addExceptionItem}
                disabled={!newItem.itemName.trim()}
                className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setAddingItem(false);
                  setNewItem({ itemName: '', issueType: 'Short Stock', status: 'Under Review', note: '', replacementName: '', replacementPrice: '' });
                }}
                className="btn-secondary px-3 py-1.5 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
