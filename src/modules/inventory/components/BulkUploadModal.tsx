import React, { useState, useRef } from 'react';
import { Download, Upload, X, CheckCircle, AlertTriangle, AlertCircle, FileSpreadsheet, Loader2, RefreshCw } from 'lucide-react';
import { fetchWithAuth } from '../../../shared/lib/api';
import { useAuth } from '../../../shared/components/AuthProvider';

interface DuplicateItem {
  row: number;
  itemCode: string;
  name: string;
  category: string;
  message: string;
}

interface ErrorItem {
  row: number;
  itemCode?: string;
  name?: string;
  message: string;
}

interface UploadResult {
  success: boolean;
  imported: number;
  skippedDuplicates: number;
  failed: number;
  duplicates: DuplicateItem[];
  errors: ErrorItem[];
}

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { getToken } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setFile(null);
    setUploadResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true);
      setErrorMessage(null);
      const token = await getToken();
      const activeTenantId = localStorage.getItem('activeTenantId');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (activeTenantId) headers['x-tenant-id'] = activeTenantId;

      const response = await fetch('/api/inventory/bulk-upload/template', { headers });

      if (!response.ok) {
        throw new Error('Failed to download template file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inventory_items_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Template download error:', err);
      setErrorMessage(err.message || 'Error downloading sample template.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setErrorMessage(null);
    setUploadResult(null);
    
    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      setErrorMessage('Please upload a valid Excel file (.xlsx or .xls).');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setErrorMessage('File size exceeds 5MB limit.');
      return;
    }

    setFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || isUploading) return;

    try {
      setIsUploading(true);
      setErrorMessage(null);

      // Read file as Base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const result = e.target?.result as string;
          const base64Data = result.split(',')[1] || result;

          const token = await getToken();
          const response = await fetchWithAuth('/api/inventory/bulk-upload', token, {
            method: 'POST',
            body: JSON.stringify({ fileData: base64Data })
          });

          setUploadResult(response);

          if (response.imported > 0) {
            onSuccess();
          }
        } catch (err: any) {
          console.error('Upload processing error:', err);
          setErrorMessage(err.message || 'Failed to upload and process Excel file.');
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        setErrorMessage('Failed to read the file.');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Upload handler error:', err);
      setErrorMessage(err.message || 'An error occurred while preparing file upload.');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-orange/10 rounded-lg text-brand-orange">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Bulk Upload Inventory Items</h3>
              <p className="text-xs text-slate-500">Upload multiple inventory items using an Excel spreadsheet</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* Top Info Banner & Template Download */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                <span>Step 1: Download Sample Excel Template</span>
              </h4>
              <p className="text-xs text-blue-700">
                Use our pre-formatted Excel template with required headers (`Item Code`, `Item Name`, `Category`, `UOM`, `Item Type`, etc.).
              </p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors shrink-0 disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download Template
            </button>
          </div>

          {/* Drag & Drop File Upload Area (Shown if no result yet) */}
          {!uploadResult && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Step 2: Upload Filled Excel File
              </label>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  isDragOver
                    ? 'border-brand-orange bg-brand-orange/5 scale-[0.99]'
                    : file
                    ? 'border-emerald-400 bg-emerald-50/50'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx,.xls"
                  className="hidden"
                />

                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="w-10 h-10 text-emerald-600" />
                    <span className="text-sm font-bold text-slate-800">{file.name}</span>
                    <span className="text-xs text-slate-500 font-medium">
                      {(file.size / 1024).toFixed(1)} KB • Click or drag to replace
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-10 h-10 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700">
                      Drag & drop your Excel file here, or <span className="text-brand-orange underline">browse</span>
                    </span>
                    <span className="text-xs text-slate-400">Supports .xlsx and .xls (Max 5MB)</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Top Error Message Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Results Summary Section */}
          {uploadResult && (
            <div className="space-y-6">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. Imported Card */}
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 rounded-lg text-emerald-600 shrink-0">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-2xl font-black text-emerald-900">{uploadResult.imported}</span>
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Imported Items</p>
                  </div>
                </div>

                {/* 2. Skipped Duplicates Card */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 rounded-lg text-amber-600 shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-2xl font-black text-amber-900">{uploadResult.skippedDuplicates}</span>
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Skipped (Already Exists)</p>
                  </div>
                </div>

                {/* 3. Failed Errors Card */}
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                  <div className="p-2.5 bg-red-100 rounded-lg text-red-600 shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-2xl font-black text-red-900">{uploadResult.failed}</span>
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Validation Errors</p>
                  </div>
                </div>
              </div>

              {/* Already Exists / Skipped Items Table */}
              {uploadResult.duplicates.length > 0 && (
                <div className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50/30">
                  <div className="bg-amber-100/80 px-4 py-2.5 border-b border-amber-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-700" />
                      Skipped Duplicate Items ({uploadResult.duplicates.length})
                    </span>
                    <span className="text-[11px] text-amber-700 font-medium">Already exist in database (No changes made)</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-amber-100/40 text-amber-900 font-bold sticky top-0 border-b border-amber-200">
                        <tr>
                          <th className="px-4 py-2 w-16">Row #</th>
                          <th className="px-4 py-2">Item Code</th>
                          <th className="px-4 py-2">Item Name</th>
                          <th className="px-4 py-2">Category</th>
                          <th className="px-4 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-200/50">
                        {uploadResult.duplicates.map((item, index) => (
                          <tr key={index} className="hover:bg-amber-100/30">
                            <td className="px-4 py-2 font-mono text-amber-800">Row {item.row}</td>
                            <td className="px-4 py-2 font-semibold text-slate-800">{item.itemCode}</td>
                            <td className="px-4 py-2 text-slate-700">{item.name}</td>
                            <td className="px-4 py-2 text-slate-600">{item.category}</td>
                            <td className="px-4 py-2 text-amber-700 font-medium flex items-center gap-1">
                              <span className="px-1.5 py-0.5 bg-amber-200/70 text-amber-800 rounded text-[10px] font-bold">
                                Already Exists
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Validation Error Details Table */}
              {uploadResult.errors.length > 0 && (
                <div className="border border-red-200 rounded-xl overflow-hidden bg-red-50/30">
                  <div className="bg-red-100/80 px-4 py-2.5 border-b border-red-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-red-900 uppercase tracking-wide flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-700" />
                      Failed Validation Rows ({uploadResult.errors.length})
                    </span>
                    <span className="text-[11px] text-red-700 font-medium">Please fix these rows and re-upload</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-red-100/40 text-red-900 font-bold sticky top-0 border-b border-red-200">
                        <tr>
                          <th className="px-4 py-2 w-16">Row #</th>
                          <th className="px-4 py-2">Item Code</th>
                          <th className="px-4 py-2">Item Name</th>
                          <th className="px-4 py-2">Error Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-200/50">
                        {uploadResult.errors.map((err, index) => (
                          <tr key={index} className="hover:bg-red-100/30">
                            <td className="px-4 py-2 font-mono text-red-800 font-bold">Row {err.row}</td>
                            <td className="px-4 py-2 font-semibold text-slate-800">{err.itemCode || '—'}</td>
                            <td className="px-4 py-2 text-slate-700">{err.name || '—'}</td>
                            <td className="px-4 py-2 text-red-700 font-medium">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
          {uploadResult ? (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Upload Another File
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition-colors"
            >
              {uploadResult ? 'Close' : 'Cancel'}
            </button>

            {!uploadResult && (
              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="inline-flex items-center gap-2 px-5 py-2 bg-brand-orange hover:bg-[#e06214] text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing Upload...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload & Import
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
