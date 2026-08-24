import React, { useState, useEffect, useRef } from 'react';
import PageLayout from '@/src/shared/components/PageLayout';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { useCurrency } from '@/src/shared/components/SettingsProvider';
import { 
  FileText, Upload, Download, Edit3, CheckCircle2, AlertCircle, 
  ArrowLeft, Plus, Trash2, Printer, Check, Eye, X, Building, Phone, Mail, MapPin
} from 'lucide-react';
import { cn } from '@/src/shared/lib/utils';

interface WorkOrder {
  id: number;
  companyId: string;
  woNumber: string;
  csId: number;
  poId: number;
  prId: number;
  vendorId: number;
  vendorName: string;
  vendorPhone: string;
  vendorEmail: string;
  vendorAddress: string;
  prNumber: string;
  poNumber: string;
  csNumber: string;
  subject: string;
  attnPerson: string;
  quotationRefNo: string;
  quotationDate: string;
  deliveryAddress: string;
  officeContactName: string;
  officeContactPhone: string;
  officeContactEmail: string;
  totalAmount: string;
  vatAmount: string;
  taxAmount: string;
  grandTotal: string;
  termsConditions: string[];
  signedFileUrl: string | null;
  signedUploadedAt: string | null;
  signedUploadedBy: string | null;
  status: 'Pending Signed Upload' | 'Signed & Active' | 'Cancelled';
  createdAt: string;
}

export default function WorkOrders() {
  const { getToken } = useAuth();
  const currencySymbol = useCurrency();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected WO for Edit/View & Print Modal
  const [selectedWo, setSelectedWo] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State for editing WO before print
  const [editSubject, setEditSubject] = useState('');
  const [editAttn, setEditAttn] = useState('');
  const [editQuotationRefNo, setEditQuotationRefNo] = useState('');
  const [editQuotationDate, setEditQuotationDate] = useState('');
  const [editDeliveryAddress, setEditDeliveryAddress] = useState('');
  const [editOfficeContactName, setEditOfficeContactName] = useState('');
  const [editOfficeContactPhone, setEditOfficeContactPhone] = useState('');
  const [editOfficeContactEmail, setEditOfficeContactEmail] = useState('');
  const [editTerms, setEditTerms] = useState<string[]>([]);
  const [newTermInput, setNewTermInput] = useState('');

  // Upload Signed WO Modal
  const [uploadModalWo, setUploadModalWo] = useState<WorkOrder | null>(null);
  const [signedFileBase64, setSignedFileBase64] = useState<string>('');
  const [signedFileName, setSignedFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadWorkOrders();
  }, []);

  const loadWorkOrders = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetchWithAuth('/api/work-orders', token);
      setWorkOrders(res || []);
    } catch (err) {
      console.error("Failed to load work orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const openViewModal = async (wo: WorkOrder) => {
    try {
      const token = await getToken();
      const detail = await fetchWithAuth(`/api/work-orders/${wo.id}`, token);
      const fullData = { ...wo, ...detail };
      setSelectedWo(fullData);
      setEditSubject(fullData.subject || '');
      setEditAttn(fullData.attnPerson || '');
      setEditQuotationRefNo(fullData.quotationRefNo || '');
      setEditQuotationDate(fullData.quotationDate ? fullData.quotationDate.split('T')[0] : '');
      setEditDeliveryAddress(fullData.deliveryAddress || '');
      setEditOfficeContactName(fullData.officeContactName || '');
      setEditOfficeContactPhone(fullData.officeContactPhone || '');
      setEditOfficeContactEmail(fullData.officeContactEmail || '');
      setEditTerms(Array.isArray(fullData.termsConditions) ? [...fullData.termsConditions] : []);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to load work order detail:", err);
      alert("Failed to load work order detail");
    }
  };

  const handleSaveWO = async () => {
    if (!selectedWo) return;
    try {
      setIsSaving(true);
      const token = await getToken();
      const payload = {
        subject: editSubject,
        attnPerson: editAttn,
        quotationRefNo: editQuotationRefNo,
        quotationDate: editQuotationDate,
        deliveryAddress: editDeliveryAddress,
        officeContactName: editOfficeContactName,
        officeContactPhone: editOfficeContactPhone,
        officeContactEmail: editOfficeContactEmail,
        termsConditions: editTerms
      };

      const updated = await fetchWithAuth(`/api/work-orders/${selectedWo.id}`, token, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      setSelectedWo({ ...selectedWo, ...updated });
      setIsEditing(false);
      loadWorkOrders();
      alert("Work Order customized successfully!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to save Work Order edits");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTerm = () => {
    if (!newTermInput.trim()) return;
    setEditTerms([...editTerms, newTermInput.trim()]);
    setNewTermInput('');
  };

  const handleRemoveTerm = (index: number) => {
    setEditTerms(editTerms.filter((_, i) => i !== index));
  };

  const handleUpdateTerm = (index: number, val: string) => {
    const updated = [...editTerms];
    updated[index] = val;
    setEditTerms(updated);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSignedFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignedFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSignedWO = async () => {
    if (!uploadModalWo || !signedFileBase64) {
      alert("Please choose a signed PDF/image file to upload.");
      return;
    }
    try {
      setIsUploading(true);
      const token = await getToken();
      await fetchWithAuth(`/api/work-orders/${uploadModalWo.id}/upload-signed`, token, {
        method: 'POST',
        body: JSON.stringify({ signedFileUrl: signedFileBase64 })
      });
      alert("Signed Work Order uploaded successfully! Work Order is now Signed & Active for GRN.");
      setUploadModalWo(null);
      setSignedFileBase64('');
      setSignedFileName('');
      loadWorkOrders();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to upload signed Work Order");
    } finally {
      setIsUploading(false);
    }
  };

  const filteredWos = workOrders.filter(w => {
    const matchesSearch = 
      (w.woNumber?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (w.vendorName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (w.prNumber?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (w.poNumber?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (statusFilter === 'All') return matchesSearch;
    return matchesSearch && w.status === statusFilter;
  });

  const totalPages = Math.ceil(filteredWos.length / itemsPerPage);
  const paginatedWos = filteredWos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const pendingCount = workOrders.filter(w => w.status === 'Pending Signed Upload').length;
  const activeCount = workOrders.filter(w => w.status === 'Signed & Active').length;

  return (
    <PageLayout
      pagination={selectedWo || uploadModalWo ? undefined : {
        currentPage,
        totalPages,
        onPageChange: setCurrentPage
      }}
    >
      {/* Header Title Section */}
      {!selectedWo && !uploadModalWo && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Work Orders</h1>
            <p className="text-xs text-slate-500 mt-1">Manage, customize, print, and upload signed Work Orders required for GRN goods receipt</p>
          </div>
          <button 
            onClick={loadWorkOrders} 
            className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 text-xs flex items-center gap-1.5 transition-colors"
          >
            Refresh List
          </button>
        </div>
      )}
      {/* Search and Filters */}
      {!selectedWo && !uploadModalWo && (
        <div className="space-y-4 mb-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Work Orders</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{workOrders.length}</h3>
              </div>
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Pending Signed Upload</p>
                <h3 className="text-2xl font-black text-amber-700 mt-1">{pendingCount}</h3>
              </div>
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center font-bold">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Signed & Active (GRN Ready)</p>
                <h3 className="text-2xl font-black text-emerald-700 mt-1">{activeCount}</h3>
              </div>
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <input 
              type="text" 
              placeholder="Search WO Number, Vendor, PR or PO..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs w-full sm:w-80 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Status Filter:</span>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-semibold text-slate-700 outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Pending Signed Upload">🔴 Pending Signed Upload</option>
                <option value="Signed & Active">🟢 Signed & Active</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Table View */}
      {!selectedWo && !uploadModalWo && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200 tracking-wider">
              <tr>
                <th className="px-5 py-3.5">WO Number</th>
                <th className="px-5 py-3.5">Vendor / Supplier</th>
                <th className="px-5 py-3.5">PR / CS Ref</th>
                <th className="px-5 py-3.5">PO Number</th>
                <th className="px-5 py-3.5 text-right">Grand Total</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">Loading Work Orders...</td>
                </tr>
              ) : paginatedWos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">No Work Orders found. Work orders are automatically generated when CS evaluations are approved.</td>
                </tr>
              ) : paginatedWos.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-900">{w.woNumber}</td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-800">{w.vendorName}</div>
                    <div className="text-[10px] text-slate-400">{w.vendorPhone || w.vendorEmail}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-brand-orange font-medium">{w.prNumber}</span>
                    {w.csNumber && <span className="text-[10px] block text-slate-400">CS: {w.csNumber}</span>}
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-700">{w.poNumber || '-'}</td>
                  <td className="px-5 py-4 text-right font-bold text-slate-900">
                    {currencySymbol}{Number(w.grandTotal || w.totalAmount || 0).toLocaleString()}
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold",
                      w.status === 'Signed & Active' ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                      "bg-amber-100 text-amber-800 border border-amber-200"
                    )}>
                      {w.status === 'Signed & Active' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Signed & Active
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3 text-amber-600" /> Pending Signed Upload
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openViewModal(w)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" /> View & Print
                      </button>
                      
                      {w.status !== 'Signed & Active' ? (
                        <button
                          onClick={() => { setUploadModalWo(w); setSignedFileBase64(''); setSignedFileName(''); }}
                          className="px-3 py-1.5 bg-brand-blue text-white hover:bg-blue-700 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors shadow-sm"
                        >
                          <Upload className="w-3.5 h-3.5" /> Upload Signed
                        </button>
                      ) : (
                        <a
                          href={w.signedFileUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg font-bold text-xs flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Signed File
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Signed Work Order Modal */}
      {uploadModalWo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-brand-blue" /> Upload Signed Work Order
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">WO: <strong className="text-slate-700">{uploadModalWo.woNumber}</strong></p>
              </div>
              <button 
                onClick={() => setUploadModalWo(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>GRN Requirement:</strong> Once the physical/digital signatures are complete, upload the signed copy here to unlock Goods Receipt (GRN).
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Choose Signed Document (PDF or Image)</label>
              <input 
                type="file" 
                accept="application/pdf,image/*"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand-blue/10 file:text-brand-blue hover:file:bg-brand-blue/20 cursor-pointer"
              />
              {signedFileName && (
                <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> File selected: {signedFileName}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUploadModalWo(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadSignedWO}
                disabled={isUploading || !signedFileBase64}
                className="px-5 py-2.5 bg-brand-blue hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isUploading ? "Uploading..." : "Save Signed Copy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL PRINTABLE WORK ORDER VIEW & EDITOR MODAL */}
      {selectedWo && (
        <div className="space-y-4">
          {/* Top Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-xl shadow-lg print:hidden">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedWo(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
              >
                <ArrowLeft className="w-4 h-4" /> Back to List
              </button>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Work Order: {selectedWo.woNumber}
                </h3>
                <p className="text-[11px] text-slate-400">Supplier: {selectedWo.vendorName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Edit3 className="w-4 h-4" /> Customize Before Print
                </button>
              ) : (
                <button
                  onClick={handleSaveWO}
                  disabled={isSaving}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Check className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Changes"}
                </button>
              )}

              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-brand-blue hover:bg-blue-600 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" /> Print / Download Official PDF
              </button>
            </div>
          </div>

          {/* EDITABLE SETTINGS DRAWER (When in Editing Mode) */}
          {isEditing && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-5 space-y-4 print:hidden">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-widest flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-amber-600" /> Customize Work Order Document Content
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subject Title</label>
                  <input 
                    type="text" 
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Attn Person (Vendor Contact)</label>
                  <input 
                    type="text" 
                    value={editAttn}
                    onChange={(e) => setEditAttn(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quotation Ref No.</label>
                  <input 
                    type="text" 
                    value={editQuotationRefNo}
                    onChange={(e) => setEditQuotationRefNo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quotation Date</label>
                  <input 
                    type="date" 
                    value={editQuotationDate}
                    onChange={(e) => setEditQuotationDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Delivery Address</label>
                  <input 
                    type="text" 
                    value={editDeliveryAddress}
                    onChange={(e) => setEditDeliveryAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Office Contact Person</label>
                  <input 
                    type="text" 
                    value={editOfficeContactName}
                    onChange={(e) => setEditOfficeContactName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Office Contact Phone</label>
                  <input 
                    type="text" 
                    value={editOfficeContactPhone}
                    onChange={(e) => setEditOfficeContactPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Office Contact Email</label>
                  <input 
                    type="text" 
                    value={editOfficeContactEmail}
                    onChange={(e) => setEditOfficeContactEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>
              </div>

              {/* Terms & Conditions Editor */}
              <div className="space-y-2 pt-2 border-t border-amber-200">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">Instructions & Conditions (1-7)</label>
                
                <div className="space-y-2">
                  {editTerms.map((term, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="font-bold text-slate-500 w-5">{idx + 1}.</span>
                      <input 
                        type="text"
                        value={term}
                        onChange={(e) => handleUpdateTerm(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveTerm(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input 
                    type="text" 
                    placeholder="Add new instruction condition line..." 
                    value={newTermInput}
                    onChange={(e) => setNewTermInput(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTerm}
                    className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-slate-900"
                  >
                    <Plus className="w-4 h-4" /> Add Line
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PRINTABLE WORK ORDER PAPER (Exact Match to Shanta Life Sample Template) */}
          <div className="flex justify-center bg-slate-200 p-4 md:p-8 rounded-2xl print:p-0 print:bg-white">
            <div 
              id="printable-work-order"
              ref={printRef}
              className="bg-white w-[210mm] min-h-[297mm] p-[15mm] shadow-2xl border border-slate-200 rounded-sm relative text-slate-900 font-sans text-xs flex flex-col justify-between print:shadow-none print:border-none print:w-full print:p-0"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              <div>
                {/* Header Row: Document Box & Official Logo */}
                <div className="flex justify-between items-start mb-6">
                  <div className="pt-2">
                    <div className="border border-slate-900 px-6 py-1.5 font-bold text-sm tracking-wider uppercase inline-block">
                      Work Order
                    </div>
                  </div>

                  {/* SHANTA Life Official Header Logo */}
                  <div className="text-right">
                    <img 
                      src="/assets/shanta_life_logo.png" 
                      alt="Shanta Life PLC Logo" 
                      className="h-16 w-auto object-contain ml-auto" 
                    />
                  </div>
                </div>

                {/* Metadata Row: Ref & Date */}
                <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-4 font-bold text-xs">
                  <div>
                    Ref &nbsp;&nbsp;&nbsp;: &nbsp;&nbsp;<span className="font-semibold text-slate-800">{selectedWo.woNumber}</span>
                  </div>
                  <div>
                    Date: <span className="font-semibold text-slate-800">{editQuotationDate ? new Date(editQuotationDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : new Date(selectedWo.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* Supplier Information Block */}
                <div className="space-y-1 mb-5">
                  <div className="flex">
                    <span className="font-bold w-24">Supplier</span>
                    <span>: &nbsp;&nbsp;<strong className="uppercase">{selectedWo.vendorName}</strong></span>
                  </div>
                  <div className="flex">
                    <span className="font-bold w-24">Address</span>
                    <span>: &nbsp;&nbsp;{selectedWo.vendorAddress || '223/11, BCS Computer City, IDB Bhaban, Agargaon Dhaka.'}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold w-24">Phone</span>
                    <span>: &nbsp;&nbsp;{selectedWo.vendorPhone || '01329654991.'}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold w-24">E-Mail</span>
                    <span>: &nbsp;&nbsp;{selectedWo.vendorEmail || 'moula@utechinfusion.com'}</span>
                  </div>
                </div>

                {/* Subject & Attn Lines */}
                <div className="space-y-1.5 mb-5 border-y border-slate-100 py-3">
                  <div className="flex items-center">
                    <span className="font-bold w-24">Subject</span>
                    <span>: &nbsp;&nbsp;<strong className="bg-yellow-200 px-1 py-0.5">{editSubject || selectedWo.subject || 'Work Order for Procurement Items'}</strong></span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-bold w-24">Attn.</span>
                    <span>: &nbsp;&nbsp;<strong className="bg-yellow-200 px-1 py-0.5">{editAttn || selectedWo.attnPerson || 'Mr. Golam Moula'}</strong></span>
                  </div>
                </div>

                {/* Opening Salutation & Paragraph */}
                <div className="space-y-3 mb-6 leading-relaxed">
                  <div>Dear <strong>{editAttn || selectedWo.attnPerson || 'Sir'}</strong>,</div>
                  <p className="text-justify text-slate-800">
                    With reference to your offer through <strong>e-mail dated {editQuotationDate || 'August 10th, 2026'} Ref No. {editQuotationRefNo || selectedWo.quotationRefNo || 'UTCEH-IDB-00018376507004'}</strong>, for items. Please deliver to address: <strong className="bg-yellow-100 px-1">{editDeliveryAddress || selectedWo.deliveryAddress || 'Shanta Western Tower, Level 10, 186, Bir Uttam Mir Shawkat Sarak, Tejgaon, Dhaka - 1208, Bangladesh'}</strong>. For Delivery purpose, please contact with <strong>{editOfficeContactName || selectedWo.officeContactName || 'Mr. Mamun Hossain'}, Phone: {editOfficeContactPhone || selectedWo.officeContactPhone || '+8801332544756'}, Mail: {editOfficeContactEmail || selectedWo.officeContactEmail || 'mamun.hossain@shantalife.com'}</strong>. Following is the details:
                  </p>
                </div>

                {/* Items Summary Table (Exact Sample Match) */}
                <div className="mb-6">
                  <table className="w-full border-collapse border border-slate-900 text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900">
                        <th className="border border-slate-900 px-3 py-2 text-center w-12">SL</th>
                        <th className="border border-slate-900 px-3 py-2 text-left">Item Description</th>
                        <th className="border border-slate-900 px-3 py-2 text-right w-24">Unit Price</th>
                        <th className="border border-slate-900 px-3 py-2 text-center w-16">Qty</th>
                        <th className="border border-slate-900 px-3 py-2 text-right w-28">Total Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedWo.items && selectedWo.items.length > 0 ? (
                        selectedWo.items.map((item: any, idx: number) => (
                          <tr key={item.id || idx}>
                            <td className="border border-slate-900 px-3 py-2 text-center font-bold">{idx + 1}</td>
                            <td className="border border-slate-900 px-3 py-2 font-medium">{item.itemName}</td>
                            <td className="border border-slate-900 px-3 py-2 text-right font-semibold">{Number(item.unitPrice).toLocaleString()}</td>
                            <td className="border border-slate-900 px-3 py-2 text-center font-semibold">{item.quantity}</td>
                            <td className="border border-slate-900 px-3 py-2 text-right font-bold">{(Number(item.unitPrice) * item.quantity).toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="border border-slate-900 px-3 py-2 text-center font-bold">1</td>
                          <td className="border border-slate-900 px-3 py-2 font-medium">Laptop HP i3 1315u 13th Gen Ram 16 SSD 512</td>
                          <td className="border border-slate-900 px-3 py-2 text-right font-semibold">69,000</td>
                          <td className="border border-slate-900 px-3 py-2 text-center font-semibold">1</td>
                          <td className="border border-slate-900 px-3 py-2 text-right font-bold">69,000</td>
                        </tr>
                      )}

                      {/* Tax Breakdown Row */}
                      {Number(selectedWo.taxAmount || 0) > 0 && (
                        <tr>
                          <td className="border border-slate-900 px-3 py-1.5" colSpan={4}>TAX</td>
                          <td className="border border-slate-900 px-3 py-1.5 text-right font-semibold">{Number(selectedWo.taxAmount).toLocaleString()}</td>
                        </tr>
                      )}

                      {/* VAT Breakdown Row */}
                      {Number(selectedWo.vatAmount || 0) > 0 && (
                        <tr>
                          <td className="border border-slate-900 px-3 py-1.5" colSpan={4}>VAT</td>
                          <td className="border border-slate-900 px-3 py-1.5 text-right font-semibold">{Number(selectedWo.vatAmount).toLocaleString()}</td>
                        </tr>
                      )}

                      {/* Grand Total Row */}
                      <tr className="font-bold border-t-2 border-slate-900">
                        <td className="border border-slate-900 px-3 py-2 text-right uppercase tracking-wider" colSpan={4}>Grand Total =</td>
                        <td className="border border-slate-900 px-3 py-2 text-right text-sm font-black underline">
                          {Number(selectedWo.grandTotal || selectedWo.totalAmount || 72631).toLocaleString()}/=
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Instructions & Conditions Section */}
                <div className="space-y-2 mb-8">
                  <h4 className="font-bold text-xs uppercase underline tracking-wider">Instructions & Conditions</h4>
                  <ol className="list-decimal list-inside space-y-1 text-slate-800 leading-relaxed text-xs">
                    {(editTerms.length > 0 ? editTerms : (Array.isArray(selectedWo.termsConditions) ? selectedWo.termsConditions : [
                      "As per your Quotation e-mail dated August 04th, 2026 Ref No. UTCEH-IDB-00018376507002.",
                      "Payment shall be made after 15 days of receipt of all materials in good condition.",
                      "Please submit the bill along with the Purchase Order (P.O.) number clearly mentioned on both the invoice and delivery challan for processing of payment.",
                      "Price is VAT & TAX included.",
                      "Price includes delivery charges.",
                      "Please provide invoice with Mushak 6.3.",
                      "Shanta Life reserves the full right to cancel or amend the Work Order at any stage, as deemed necessary."
                    ])).map((term: string, idx: number) => (
                      <li key={idx} className="pl-1">
                        {term}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Agreement Closing Statement */}
                <p className="text-slate-700 italic mb-8">
                  If you agree with the above-mentioned terms and conditions, then kindly sign below in the designated area to active the work order.
                </p>

                {/* Sign-off Block */}
                <div className="space-y-6 pt-4">
                  <div>
                    <div>Thanking You,</div>
                    <div className="font-bold">For and on behalf of Shanta Life Insurance PLC,</div>
                  </div>

                  <div className="pt-8">
                    <div className="border-t border-slate-900 w-48 pt-1">
                      <strong className="block text-slate-900">Nafis Akhter Ahmed</strong>
                      <span className="text-slate-600">Chief Executive Officer</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER SECTION: Corporate Address, QR Code & Olive Accent Bar */}
              <div className="pt-8 mt-auto">
                <div className="flex justify-between items-end pb-3 border-t border-slate-100">
                  <div className="text-[11px] text-slate-500 space-y-0.5 leading-snug">
                    <strong className="block text-slate-700 font-bold">Shanta Life Insurance PLC</strong>
                    <div>Shanta Western Tower, Level 10, 186, Bir Uttam Mir Shawkat Sarak, Tejgaon I/A, Dhaka – 1208, Bangladesh</div>
                  </div>

                  {/* QR Code Image Asset */}
                  <div className="w-16 h-16 shrink-0">
                    <img 
                      src="/assets/wo_qr_code.png" 
                      alt="Shanta Life QR Code" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Olive Accent Bar Asset at bottom */}
                <div className="w-full h-2.5 overflow-hidden rounded-full mt-1">
                  <img 
                    src="/assets/wo_footer_bar.png" 
                    alt="Footer Accent Bar" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
