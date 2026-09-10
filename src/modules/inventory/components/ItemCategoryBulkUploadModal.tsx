import React, { useState } from 'react';
import { X, Upload, Download, CheckCircle, AlertTriangle, AlertCircle, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { useAuth } from '@/src/shared/components/AuthProvider';

interface ItemCategoryBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface UploadResult {
  successCount: number;
  duplicateCount: number;
  errorCount: number;
  duplicates: Array<{ row: number; name: string; message: string }>;
  errors: Array<{ row: number; name?: string; message: string }>;
}

export function ItemCategoryBulkUploadModal({ isOpen, onClose, onSuccess }: ItemCategoryBulkUploadModalProps) {
  const { getToken } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'duplicates' | 'errors'>('errors');

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    try {
      const token = await getToken();
      const activeTenantId = localStorage.getItem('activeTenantId');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (activeTenantId) headers['x-tenant-id'] = activeTenantId;

      const res = await fetch('/api/inventory/categories/bulk-upload/template', { headers });

      if (!res.ok) {
        alert('Failed to download template');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'item_category_bulk_upload_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Template download error:', err);
      alert('Failed to download template');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        alert('Please select a valid Excel file (.xlsx or .xls)');
        return;
      }
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        alert('Please drop a valid Excel file (.xlsx or .xls)');
        return;
      }
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setResult(null);

    try {
      const token = await getToken();
      if (!token) {
        alert('Authentication failed');
        setUploading(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64String = (reader.result as string).split(',')[1];
          const response = await fetchWithAuth('/api/inventory/categories/bulk-upload', token, {
            method: 'POST',
            body: JSON.stringify({ fileData: base64String })
          });

          setResult(response);
          if (response.successCount > 0) {
            onSuccess();
          }
        } catch (error: any) {
          alert(error.message || 'Bulk upload failed. Please try again.');
        } finally {
          setUploading(false);
        }
      };

      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('File reading failed.');
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-orange/10 text-brand-orange rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Bulk Upload Item Categories</h3>
              <p className="text-xs text-slate-500">Import multiple inventory item categories via Excel template</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Step 1: Download Template */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-widest">Step 1: Download Standard Template</span>
              <p className="text-xs text-slate-600">Download formatted Excel file with sample data and live categories list.</p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center px-3 py-2 bg-white text-blue-700 hover:bg-blue-50 border border-blue-300 rounded-md text-xs font-bold shadow-2xs transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download Template
            </button>
          </div>

          {/* Step 2: Select / Drag File */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Step 2: Upload Completed Excel File</span>
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive
                  ? 'border-brand-orange bg-brand-orange/5 scale-[1.01]'
                  : selectedFile
                  ? 'border-emerald-300 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
              }`}
            >
              <input
                type="file"
                id="item-cat-excel-upload"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-3">
                  <div className="inline-flex items-center justify-center p-3 bg-emerald-100 text-emerald-700 rounded-full">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <div className="flex justify-center gap-2 pt-2">
                    <label
                      htmlFor="item-cat-excel-upload"
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                    >
                      Change File
                    </label>
                    <button
                      onClick={handleReset}
                      className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 rounded text-xs font-bold hover:bg-rose-50 shadow-2xs"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label htmlFor="item-cat-excel-upload" className="cursor-pointer space-y-3 block">
                  <div className="inline-flex items-center justify-center p-3 bg-slate-200/60 text-slate-600 rounded-full">
                    <Upload className="w-6 h-6 text-brand-orange" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">Click to browse or drag & drop your Excel file</p>
                    <p className="text-xs text-slate-400 mt-1">Supports .xlsx and .xls (Max 5MB)</p>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Results Summary Section */}
          {result && (
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Import Result Summary</h4>
              
              {/* Summary Stat Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-md">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-800">Imported</p>
                    <p className="text-lg font-bold text-emerald-900">{result.successCount}</p>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-md">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Skipped Duplicates</p>
                    <p className="text-lg font-bold text-amber-900">{result.duplicateCount}</p>
                  </div>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3">
                  <div className="p-2 bg-rose-100 text-rose-700 rounded-md">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-rose-800">Errors</p>
                    <p className="text-lg font-bold text-rose-900">{result.errorCount}</p>
                  </div>
                </div>
              </div>

              {/* Detailed Tables */}
              {(result.duplicates.length > 0 || result.errors.length > 0) && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 border-b border-slate-200 flex text-xs font-bold">
                    {result.errors.length > 0 && (
                      <button
                        onClick={() => setActiveTab('errors')}
                        className={`px-4 py-2.5 flex items-center gap-1.5 transition-colors border-r border-slate-200 ${
                          activeTab === 'errors'
                            ? 'bg-white text-rose-700 border-b-2 border-b-rose-600'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <AlertCircle className="w-4 h-4" />
                        Validation Errors ({result.errors.length})
                      </button>
                    )}
                    {result.duplicates.length > 0 && (
                      <button
                        onClick={() => setActiveTab('duplicates')}
                        className={`px-4 py-2.5 flex items-center gap-1.5 transition-colors border-r border-slate-200 ${
                          activeTab === 'duplicates'
                            ? 'bg-white text-amber-700 border-b-2 border-b-amber-600'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Already Exists ({result.duplicates.length})
                      </button>
                    )}
                  </div>

                  <div className="max-h-52 overflow-y-auto p-0">
                    {activeTab === 'errors' && result.errors.length > 0 && (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-rose-50 text-rose-900 font-bold sticky top-0 border-b border-rose-200">
                          <tr>
                            <th className="p-2 w-16 text-center">Row</th>
                            <th className="p-2">Category Name</th>
                            <th className="p-2">Error Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rose-100 text-slate-700">
                          {result.errors.map((err, idx) => (
                            <tr key={idx} className="hover:bg-rose-50/50">
                              <td className="p-2 text-center font-mono font-bold text-rose-700">{err.row}</td>
                              <td className="p-2 font-medium">{err.name || '-'}</td>
                              <td className="p-2 text-rose-600">{err.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {activeTab === 'duplicates' && result.duplicates.length > 0 && (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-amber-50 text-amber-900 font-bold sticky top-0 border-b border-amber-200">
                          <tr>
                            <th className="p-2 w-16 text-center">Row</th>
                            <th className="p-2">Category Name</th>
                            <th className="p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100 text-slate-700">
                          {result.duplicates.map((dup, idx) => (
                            <tr key={idx} className="hover:bg-amber-50/50">
                              <td className="p-2 text-center font-mono font-bold text-amber-700">{dup.row}</td>
                              <td className="p-2 font-medium">{dup.name}</td>
                              <td className="p-2 text-amber-700">{dup.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {result && result.successCount > 0 ? 'Close' : 'Cancel'}
          </button>
          {selectedFile && !result && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="inline-flex items-center px-5 py-2 bg-brand-orange text-white rounded-lg text-xs font-bold hover:bg-[#e06214] disabled:opacity-50 shadow-xs transition-colors"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing Upload...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Start Upload
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
