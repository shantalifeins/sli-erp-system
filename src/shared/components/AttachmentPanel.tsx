import React, { useState, useRef, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Paperclip, Upload, Trash2, Download, FileText, Image, File, AlertCircle, X, Plus } from 'lucide-react';

interface Attachment {
  id: string;
  refType: string;
  refId: string;
  category?: string | null;
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  uploadedByUid?: string | null;
  createdAt?: string | null;
}

interface AttachmentPanelProps {
  refType: 'PO' | 'GRN' | 'Invoice' | 'Asset' | 'DigitalAsset' | 'Item' | 'Disposal';
  refId: string | number;
  canUpload?: boolean;
  canDelete?: boolean;
  compact?: boolean; // smaller inline mode
}

const CATEGORY_OPTIONS = ['Contract', 'Invoice', 'QC Report', 'Photo', 'Specification', 'Warranty', 'Other'];

function formatBytes(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType?: string | null) {
  if (!mimeType) return <File className="w-4 h-4" />;
  if (mimeType.startsWith('image/')) return <Image className="w-4 h-4 text-blue-500" />;
  if (mimeType === 'application/pdf') return <FileText className="w-4 h-4 text-red-500" />;
  return <File className="w-4 h-4 text-gray-500" />;
}

export const AttachmentPanel: React.FC<AttachmentPanelProps> = ({
  refType,
  refId,
  canUpload = true,
  canDelete = true,
  compact = false,
}) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Other');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || '';

  const fetchAttachments = useCallback(async () => {
    if (!refId) return;
    try {
      setLoading(true);
      const data = await fetchWithAuth(`/api/attachments?refType=${refType}&refId=${refId}`, getToken());
      setAttachments(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load attachments');
    } finally {
      setLoading(false);
    }
  }, [refType, refId]);

  useEffect(() => { fetchAttachments(); }, [fetchAttachments]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('refType', refType);
      formData.append('refId', String(refId));
      formData.append('category', selectedCategory);

      const token = getToken();
      const res = await fetch('/api/attachments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      await fetchAttachments();
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this attachment?')) return;
    setDeletingId(id);
    try {
      await fetchWithAuth(`/api/attachments/${id}`, getToken(), { method: 'DELETE' });
      setAttachments(prev => prev.filter(a => a.id !== id));
    } catch (e: any) {
      setError(e.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      const token = getToken();
      const res = await fetch(`/api/attachments/${attachment.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || 'Download failed');
    }
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${compact ? 'p-3' : 'p-5'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-gray-500" />
          <h3 className={`font-semibold text-gray-800 ${compact ? 'text-sm' : 'text-base'}`}>
            Attachments
            {!loading && (
              <span className="ml-2 text-xs font-normal bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {attachments.length}
              </span>
            )}
          </h3>
        </div>

        {canUpload && (
          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-gray-50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {CATEGORY_OPTIONS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              id={`attachment-upload-btn-${refType}-${refId}`}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
              {uploading ? 'Uploading...' : 'Attach'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.xlsx,.xls,.csv,.doc,.docx,.txt"
            />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* Drop Zone */}
      {canUpload && !compact && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all mb-4 ${
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
          }`}
        >
          <Upload className={`w-5 h-5 mx-auto mb-1 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
          <p className="text-xs text-gray-500">
            {dragOver ? 'Drop to upload' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">PDF, Image, Excel, Word, CSV — max 10 MB</p>
        </div>
      )}

      {/* Attachment List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : attachments.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-3">No attachments yet</p>
      ) : (
        <div className="space-y-1.5">
          {attachments.map(att => (
            <div
              key={att.id}
              className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex-shrink-0">{getFileIcon(att.mimeType)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{att.fileName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {att.category && (
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                      {att.category}
                    </span>
                  )}
                  {att.sizeBytes && (
                    <span className="text-[10px] text-gray-400">{formatBytes(att.sizeBytes)}</span>
                  )}
                  {att.createdAt && (
                    <span className="text-[10px] text-gray-400">
                      {new Date(att.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  id={`download-att-${att.id}`}
                  onClick={() => handleDownload(att)}
                  className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                {canDelete && (
                  <button
                    id={`delete-att-${att.id}`}
                    onClick={() => handleDelete(att.id)}
                    disabled={deletingId === att.id}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === att.id ? (
                      <span className="inline-block w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttachmentPanel;
