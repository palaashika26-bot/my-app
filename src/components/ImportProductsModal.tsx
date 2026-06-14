'use client';
import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';

interface SkippedDetail {
  row: string;
  reason: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  importedNames: string[];
  skippedDetails: SkippedDetail[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportProductsModal({ isOpen, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function handleClose() {
    setFile(null);
    setLoading(false);
    setResult(null);
    setError(null);
    onClose();
  }

  async function handleUpload() {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('CSV is too large (max 5MB).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('elios_access_token') || '';
      const res = await fetch('/api/products/import-csv', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Import failed');
      } else {
        setResult(data.data);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto pt-16 px-4"
      onClick={handleClose}>
      <div
        className="bg-card rounded-2xl w-full max-w-md shadow-xl mb-8"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <h3 className="font-700 text-lg">Import Products via CSV</h3>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {result === null ? (
            <>
              {/* Info box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                Upload a CSV file to add multiple products at once.
                Use <strong>supplierName</strong> and <strong>categoryName</strong> columns — type the name exactly as it appears in the system (e.g. &lsquo;Shanghai Textiles&rsquo;).
                Download the sample CSV to see the required format.
              </div>

              {/* File input */}
              <div>
                <label className="text-xs font-600 text-muted-foreground uppercase block mb-1.5">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-600 file:bg-muted file:text-foreground hover:file:bg-muted/70 cursor-pointer"
                />
                {file && (
                  <p className="text-xs text-muted-foreground mt-1">{file.name}</p>
                )}
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-red-600 font-500">Error: {error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button onClick={handleClose} className="btn-secondary flex-1 py-2.5 text-sm">
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!file || loading}
                  className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Importing...' : 'Upload & Import'}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Success summary */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-600 text-emerald-800 text-sm">
                    {result.imported} product{result.imported !== 1 ? 's' : ''} imported successfully
                  </p>
                  {result.importedNames.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {result.importedNames.slice(0, 5).map((name, i) => (
                        <li key={i} className="text-xs text-emerald-700">• {name}</li>
                      ))}
                      {result.importedNames.length > 5 && (
                        <li className="text-xs text-emerald-600 italic">
                          …and {result.importedNames.length - 5} more
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>

              {/* Skipped rows */}
              {result.skipped > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-600 text-amber-800 text-sm">
                      {result.skipped} row{result.skipped !== 1 ? 's' : ''} skipped
                    </p>
                    <ul className="mt-2 space-y-1">
                      {result.skippedDetails.map((s, i) => (
                        <li key={i} className="text-xs text-amber-700">
                          <span className="font-600">{s.row}</span>: {s.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <button
                onClick={() => { onSuccess(); handleClose(); }}
                className="btn-primary w-full py-2.5 text-sm">
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
