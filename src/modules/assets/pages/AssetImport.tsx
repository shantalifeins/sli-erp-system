import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import PageLayout from '@/src/shared/components/PageLayout';
import { useAuth } from '@/src/shared/components/AuthProvider';

export default function AssetImport() {
  const { getToken } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [results, setResults] = useState<{ processed: number, errors: string[], successes: string[] } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      const token = await getToken();
      const activeTenantId = localStorage.getItem('activeTenantId');
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (activeTenantId) headers['x-tenant-id'] = activeTenantId;

      const res = await fetch('/api/assets/bulk-upload/template', { headers });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to download template');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'asset_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Error downloading template');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setResults(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setStatus('idle');
    setResults(null);

    try {
      const token = await getToken();
      const activeTenantId = localStorage.getItem('activeTenantId');
      const formData = new FormData();
      formData.append('file', file);

      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (activeTenantId) headers['x-tenant-id'] = activeTenantId;

      const res = await fetch('/api/assets/bulk-upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setResults({ processed: data.processed || 0, errors: data.errors || [], successes: data.successes || [] });
      setStatus(data.errors && data.errors.length > 0 && data.processed === 0 ? 'error' : 'success');
    } catch (err: any) {
      alert(err.message || 'Error uploading file');
      setStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-brand-orange/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="w-8 h-8 text-brand-orange" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Fixed Asset Import</h2>
            <p className="text-slate-500 mb-4">
              Upload existing fixed assets records via Excel or CSV file.
            </p>
            <button
              onClick={handleDownloadTemplate}
              disabled={isDownloading}
              className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors mb-8 disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? 'Downloading...' : 'Download Template (XLSX)'}
            </button>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50 relative hover:bg-slate-100 transition-colors group cursor-pointer" onClick={() => document.getElementById('file-upload')?.click()}>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
              />
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-4 group-hover:text-brand-orange transition-colors" />
              <div className="text-slate-700 font-medium mb-1">
                {file ? file.name : 'Click or drag file to this area to upload'}
              </div>
              <p className="text-xs text-slate-500">Supports Excel (XLSX) or CSV</p>
            </div>

            {file && (
              <div className="mt-8">
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full bg-brand-orange text-white py-3 rounded-xl font-bold hover:bg-brand-orange/90 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing Upload...
                    </>
                  ) : (
                    'Upload & Process Data'
                  )}
                </button>
              </div>
            )}

            {status === 'success' && results && (
              <div className="mt-6 bg-green-50 border border-green-200 text-green-700 p-6 rounded-xl text-left">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-green-600" />
                  <div>
                    <h4 className="font-bold text-lg">Upload Processed</h4>
                    <p className="text-sm mt-1 text-green-600 font-medium">Successfully imported {results.processed} assets.</p>
                  </div>
                </div>

                {results.errors.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <h5 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {results.errors.length} Warning(s) / Error(s)
                    </h5>
                    <ul className="text-sm text-red-600 space-y-1 list-disc list-inside bg-red-50 p-3 rounded-lg border border-red-100 max-h-40 overflow-y-auto">
                      {results.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            {status === 'error' && (
              <div className="mt-6 bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 text-left">
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-600" />
                <div>
                  <h4 className="font-bold">Upload Failed</h4>
                  <p className="text-sm mt-1">Please check the console for details or fix your template format.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
