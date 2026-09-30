import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import PageLayout from '@/src/shared/components/PageLayout';

export default function OpeningStockUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setStatus('idle');
    
    // Simulate API call for now (until connected)
    setTimeout(() => {
      setIsUploading(false);
      setStatus('success');
    }, 2000);
  };

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-brand-orange/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="w-8 h-8 text-brand-orange" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Upload Opening Stock</h2>
            <p className="text-slate-500 mb-8">
              Upload your initial inventory balances using an Excel or CSV file. Download the template below to ensure your data is formatted correctly.
            </p>

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

            {status === 'success' && (
              <div className="mt-6 bg-green-50 text-green-700 p-4 rounded-xl flex items-start gap-3 text-left">
                <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-green-600" />
                <div>
                  <h4 className="font-bold">Upload Successful</h4>
                  <p className="text-sm mt-1">The opening stock balances have been successfully imported into the inventory system.</p>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="mt-6 bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 text-left">
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-600" />
                <div>
                  <h4 className="font-bold">Upload Failed</h4>
                  <p className="text-sm mt-1">There was an error processing your file. Please check the format and try again.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
