import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download, Info, ArrowLeft } from 'lucide-react';
import PageLayout from '@/src/shared/components/PageLayout';
import { useAuth } from '@/src/shared/components/AuthProvider';

interface UploadResult {
  success: boolean;
  processed: number;
  errors: string[];
  successes: string[];
}

export default function OpeningStockUpload() {
  const { getToken } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/inventory/opening-stock/template', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to download template');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'opening_stock_template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to download template');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setResult(null);
    setError(null);

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/inventory/opening-stock/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Upload failed');
      } else {
        setResult(data);
        setFile(null);
        // Reset file input
        const input = document.getElementById('opening-stock-file') as HTMLInputElement;
        if (input) input.value = '';
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-brand-orange/10 rounded-full flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-6 h-6 text-brand-orange" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Upload Opening Stock</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Set initial inventory balances for all items at go-live. This sets the warehouse quantities directly.
              </p>
            </div>
          </div>

          {/* Info panel */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 space-y-1">
              <p className="font-semibold">How it works:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Download the sample template below (it includes your registered items & warehouses as reference)</li>
                <li>Fill in <strong>Item Code</strong>, <strong>Warehouse Name</strong>, and <strong>Opening Quantity</strong> in the first sheet</li>
                <li>Optionally fill Unit Cost — this updates the item's base price</li>
                <li>Upload the completed file</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Download Template */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-700 mb-1">Step 1 — Download Sample Template</h3>
          <p className="text-sm text-slate-500 mb-4">
            The template includes 3 sheets: the data entry sheet, a list of your registered items, and a list of your warehouses.
          </p>
          <button
            onClick={handleDownloadTemplate}
            disabled={isDownloading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            {isDownloading ? 'Generating...' : 'Download Template (XLSX)'}
          </button>

          <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">Column</th>
                  <th className="px-3 py-2 text-left">Required</th>
                  <th className="px-3 py-2 text-left">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr><td className="px-3 py-2 font-medium">Item Code</td><td className="px-3 py-2 text-red-600 font-bold">Yes</td><td className="px-3 py-2">Must match an existing item code (see "Items Reference" sheet)</td></tr>
                <tr><td className="px-3 py-2 font-medium">Item Name</td><td className="px-3 py-2 text-slate-400">No</td><td className="px-3 py-2">For reference only — not used in upload</td></tr>
                <tr><td className="px-3 py-2 font-medium">Warehouse Name</td><td className="px-3 py-2 text-red-600 font-bold">Yes</td><td className="px-3 py-2">Must match an existing warehouse name (see "Warehouses Reference" sheet)</td></tr>
                <tr><td className="px-3 py-2 font-medium">Opening Quantity</td><td className="px-3 py-2 text-red-600 font-bold">Yes</td><td className="px-3 py-2">Whole number, e.g. 10</td></tr>
                <tr><td className="px-3 py-2 font-medium">Unit Cost</td><td className="px-3 py-2 text-slate-400">No</td><td className="px-3 py-2">Updates the item's base price if provided</td></tr>
                <tr><td className="px-3 py-2 font-medium">Notes</td><td className="px-3 py-2 text-slate-400">No</td><td className="px-3 py-2">Any additional remarks</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Upload */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-700 mb-1">Step 2 — Upload Completed File</h3>
          <p className="text-sm text-slate-500 mb-4">Select your filled Excel file to upload.</p>

          <div
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer text-center group"
            onClick={() => document.getElementById('opening-stock-file')?.click()}
          >
            <input
              id="opening-stock-file"
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
            />
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3 group-hover:text-brand-orange transition-colors" />
            <div className="text-slate-700 font-medium mb-1">
              {file ? (
                <span className="text-brand-orange">{file.name}</span>
              ) : (
                'Click to select Excel file'
              )}
            </div>
            <p className="text-xs text-slate-500">Supports .xlsx or .xls</p>
          </div>

          {file && (
            <div className="mt-4">
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full bg-brand-orange text-white py-3 rounded-xl font-bold hover:bg-[#e06214] transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing Upload...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload & Process Opening Stock
                  </>
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-600" />
              <div>
                <h4 className="font-bold">Upload Failed</h4>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-4 space-y-3">
              <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-green-600" />
                <div>
                  <h4 className="font-bold">Upload Complete</h4>
                  <p className="text-sm mt-1">{result.processed} rows processed successfully.</p>
                </div>
              </div>

              {result.successes && result.successes.length > 0 && (
                <div className="bg-white border border-green-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <p className="text-xs font-semibold text-green-700 mb-2 uppercase tracking-wide">Processed rows</p>
                  {result.successes.map((s, i) => (
                    <p key={i} className="text-xs text-green-700">✓ {s}</p>
                  ))}
                </div>
              )}

              {result.errors && result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-700 mb-2 uppercase tracking-wide">{result.errors.length} rows with errors (skipped)</p>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-700">✗ {e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
