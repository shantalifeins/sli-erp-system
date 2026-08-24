import React from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Plus, Eye, Send, Check, ArrowLeft, Paperclip, Upload, FileText, Trash2, ExternalLink } from 'lucide-react';
import { cn } from '@/src/shared/lib/utils';
import PageLayout from '@/src/shared/components/PageLayout';
import { useCurrency } from '@/src/shared/components/SettingsProvider';

export default function Rfq() {
  const { getToken, dbUser, permissions } = useAuth();
  const currencySymbol = useCurrency();
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPrId, setSelectedPrId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selectedVendors, setSelectedVendors] = useState<number[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const prPerms = permissions?.find((p: any) => p.module === 'RFQ (Quotation)') || {};
  const canCreate = isSuperAdmin || prPerms.canCreate;
  const canEdit = isSuperAdmin || prPerms.canEdit;

  // Quotation entry states
  const [viewRfq, setViewRfq] = useState<any>(null);
  const [selectedVendorIdForQuote, setSelectedVendorIdForQuote] = useState<number | null>(null);
  const [quotesData, setQuotesData] = useState<{ [prItemId: number]: { price: number, days: number, remarks: string, description: string } }>({});
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [vatPercent, setVatPercent] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);

  const loadData = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const [rfqData, prData, vendorData] = await Promise.all([
        fetchWithAuth('/api/rfq', token),
        fetchWithAuth('/api/pr', token),
        fetchWithAuth('/api/vendors', token)
      ]);
      setRfqs(rfqData);
      setPrs(prData.filter((p: any) => p.status === 'Approved'));
      setVendorsList(vendorData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [getToken]);

  const handleCreateRfq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrId) return;
    try {
      const token = await getToken();
      await fetchWithAuth('/api/rfq', token, {
        method: 'POST',
        body: JSON.stringify({
          prId: parseInt(selectedPrId),
          deadline: deadline || null,
          vendorIds: selectedVendors
        })
      });
      setShowCreateModal(false);
      setSelectedPrId('');
      setDeadline('');
      setSelectedVendors([]);
      loadData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert("File size exceeds 8MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewRfq || !selectedVendorIdForQuote) return;
    try {
      const token = await getToken();
      const prItems = prs.find(p => p.id === viewRfq.prId)?.items || [];
      
      // Compute Subtotal
      let subtotal = 0;
      prItems.forEach((item: any) => {
        const p = quotesData[item.id]?.price || 0;
        subtotal += p * item.quantity;
      });

      const vatAmt = subtotal * (vatPercent / 100);
      const taxAmt = subtotal * (taxPercent / 100);
      const grandTotal = subtotal + vatAmt + taxAmt;

      const quotesPayload = prItems.map((item: any) => ({
        prItemId: item.id,
        quotedPrice: quotesData[item.id]?.price || 0,
        deliveryDays: quotesData[item.id]?.days || 0,
        remarks: quotesData[item.id]?.remarks || '',
        description: quotesData[item.id]?.description || '',
        attachmentUrl: attachmentUrl || null,
        vatPercent,
        vatAmount: vatAmt,
        taxPercent,
        taxAmount: taxAmt,
        totalAmount: grandTotal
      }));

      await fetchWithAuth(`/api/rfq/${viewRfq.id}/quotations`, token, {
        method: 'POST',
        body: JSON.stringify({
          vendorId: selectedVendorIdForQuote,
          quotes: quotesPayload
        })
      });
      setSelectedVendorIdForQuote(null);
      setQuotesData({});
      setAttachmentUrl('');
      setVatPercent(0);
      setTaxPercent(0);
      alert("Vendor Quotation saved successfully!");
    } catch (error) {
      console.error(error);
    }
  };

  const handleVendorSelectToggle = (vId: number) => {
    setSelectedVendors(prev => 
      prev.includes(vId) ? prev.filter(id => id !== vId) : [...prev, vId]
    );
  };

  const filteredRfqs = rfqs.filter(r => 
    (r.rfqNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (r.prNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (r.department?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
  );
  
  const totalPages = Math.ceil(filteredRfqs.length / itemsPerPage);
  const paginatedRfqs = filteredRfqs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <PageLayout
      loading={loading}
      search={{ placeholder: "Search RFQs...", onSearch: setSearchQuery }}
      pagination={showCreateModal || viewRfq ? undefined : { currentPage, totalPages, onPageChange: setCurrentPage }}
    >
    <div className="space-y-6 flex flex-col h-full">
      {!showCreateModal && !viewRfq && (
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-charcoal">Request for Quotation (RFQ)</h1>
          <p className="text-sm text-slate-500 mt-1">Manage vendor quoting and invitations for approved PRs</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" /> Create RFQ
          </button>
        )}
      </div>
      )}

      {!showCreateModal && !viewRfq && (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">RFQ Number</th>
              <th className="px-6 py-4">Requisition</th>
              <th className="px-6 py-4">Department</th>
              <th className="px-6 py-4">Deadline</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Invited Vendors</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRfqs.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">No RFQs found.</td></tr>
            ) : paginatedRfqs.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900">{r.rfqNumber}</td>
                <td className="px-6 py-4 text-brand-orange font-medium">{r.prNumber}</td>
                <td className="px-6 py-4">{r.department}</td>
                <td className="px-6 py-4">{r.deadline ? new Date(r.deadline).toLocaleDateString() : 'No Deadline'}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center px-2 py-1 rounded text-xs font-bold",
                    r.status === 'Open' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
                  )}>
                    {r.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-500">
                  {r.invitedVendors?.map((v: any) => v.name).join(', ') || 'None'}
                </td>
                <td className="px-6 py-4 text-right">
                  {canEdit && (
                    <button 
                      onClick={() => {
                        setViewRfq(r);
                        setSelectedVendorIdForQuote(null);
                      }}
                      className="text-brand-orange hover:text-[#e06214] font-medium text-sm inline-flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" /> Manage Quotes
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Create RFQ Form */}
      {showCreateModal && (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden flex flex-col flex-1 mb-6">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50 rounded-t-xl">
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors" title="Back to List">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-slate-800">Create Request for Quotation</h3>
            </div>
            <form onSubmit={handleCreateRfq} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Approved Requisition</label>
                <select 
                  value={selectedPrId} 
                  onChange={e => setSelectedPrId(e.target.value)} 
                  required 
                  className="block w-full rounded-md border-slate-200 p-2 border bg-white text-sm"
                >
                  <option value="">Select...</option>
                  {prs.filter(p => {
                    // Exclude PRs that already have an RFQ created
                    const hasRfq = rfqs.some(r => r.prId === p.id || r.prNumber === p.prNumber);
                    return !hasRfq;
                  }).map(p => {
                    const itemSummary = p.items && p.items.length > 0 
                      ? ` - ${p.items.map((i: any) => `${i.itemName} (${i.quantity} ${i.uom || 'Pcs'})`).join(', ')}`
                      : '';
                    return (
                      <option key={p.id} value={p.id}>
                        {p.prNumber} — {p.requestor} ({p.department}){itemSummary}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Deadline Date</label>
                <input 
                  type="date" 
                  value={deadline} 
                  onChange={e => setDeadline(e.target.value)}
                  className="block w-full rounded-md border-slate-200 p-2 border text-sm" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Invite Vendors</label>
                <div className="border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {vendorsList.filter(v => (v.status || 'Active') === 'Active').map(v => (
                    <label key={v.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedVendors.includes(v.id)} 
                        onChange={() => handleVendorSelectToggle(v.id)}
                        className="rounded border-slate-300 text-brand-orange focus:ring-brand-orange" 
                      />
                      {v.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-brand-orange text-white rounded-lg text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors"
                >
                  Create RFQ
                </button>
              </div>
            </form>
          </div>
      )}

      {/* View RFQ / Quotation Entry Form */}
      {viewRfq && (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden flex flex-col flex-1 mb-6">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50 rounded-t-xl">
              <button onClick={() => setViewRfq(null)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors" title="Back to List">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Manage Quotations - {viewRfq.rfqNumber}</h3>
                <p className="text-xs text-slate-500 mt-1">Requisition: {viewRfq.prNumber}</p>
              </div>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto grid grid-cols-3 gap-6">
              {/* Left Column: Vendor List */}
              <div className="col-span-1 border-r border-slate-100 pr-6 space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Invited Vendors</h4>
                {viewRfq.invitedVendors?.map((vendor: any) => (
                  <button
                    key={vendor.id}
                    onClick={async () => {
                      setSelectedVendorIdForQuote(vendor.id);
                      try {
                        const token = await getToken();
                        const existingQuotes = await fetchWithAuth(`/api/rfq/${viewRfq.id}/quotations`, token);
                        const vendorQuotes = existingQuotes.filter((q: any) => q.vendorId === vendor.id);
                        
                        const firstQuote = vendorQuotes[0];
                        setAttachmentUrl(firstQuote?.attachmentUrl || '');
                        setVatPercent(firstQuote ? Number(firstQuote.vatPercent) || 0 : 0);
                        setTaxPercent(firstQuote ? Number(firstQuote.taxPercent) || 0 : 0);

                        const newQuotesData: any = {};
                        vendorQuotes.forEach((q: any) => {
                          newQuotesData[q.prItemId] = {
                            price: Number(q.quotedPrice) || 0,
                            days: q.deliveryDays || 0,
                            remarks: q.remarks || '',
                            description: q.description || ''
                          };
                        });
                        setQuotesData(newQuotesData);
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border text-sm font-semibold transition-colors flex items-center justify-between",
                      selectedVendorIdForQuote === vendor.id 
                        ? "bg-brand-orange/5 border-brand-orange text-brand-orange" 
                        : "border-slate-100 hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <span>{vendor.name}</span>
                    <Send className="w-4 h-4 opacity-50" />
                  </button>
                ))}
              </div>

              {/* Right Column: Quoted Items & Breakdown */}
              <div className="col-span-2 space-y-4">
                {selectedVendorIdForQuote ? (
                  <form onSubmit={handleSaveQuotation} className="space-y-4">
                    {/* Header Box & Attachment Upload */}
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selected Vendor</div>
                        <div className="text-sm font-extrabold text-slate-800">
                          {viewRfq.invitedVendors?.find((v: any) => v.id === selectedVendorIdForQuote)?.name}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {attachmentUrl ? (
                          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg">
                            <Paperclip className="w-4 h-4 text-blue-600" />
                            <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-700 hover:underline inline-flex items-center gap-1">
                              Original Quote <ExternalLink className="w-3 h-3" />
                            </a>
                            <button type="button" onClick={() => setAttachmentUrl('')} className="text-red-500 hover:text-red-700 ml-1" title="Remove Attachment">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold shadow-xs inline-flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5 text-brand-orange" />
                            Upload Vendor Quote (PDF/Img)
                            <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Item Prices & Descriptions */}
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quotation Items</h4>
                    <div className="space-y-3">
                      {prs.find(p => p.id === viewRfq.prId)?.items?.map((item: any) => {
                        const p = quotesData[item.id]?.price || 0;
                        const lineTotal = p * item.quantity;
                        return (
                          <div key={item.id} className="border border-slate-200 p-4 rounded-xl bg-white shadow-xs space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-extrabold text-slate-800 text-sm">{item.itemName}</div>
                                <div className="text-xs text-slate-500">Category: {item.category}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded">Qty: {item.quantity} {item.uom}</span>
                                <span className="text-xs font-bold bg-brand-orange/10 text-brand-orange px-2.5 py-1 rounded">Subtotal: {currencySymbol}{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Unit Price ({currencySymbol})</label>
                                <input 
                                  type="number" 
                                  required
                                  min="0"
                                  step="0.01"
                                  value={quotesData[item.id]?.price || ''}
                                  onChange={e => setQuotesData(prev => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      price: parseFloat(e.target.value) || 0
                                    }
                                  }))}
                                  placeholder="0.00"
                                  className="w-full border border-slate-200 rounded p-1.5 bg-white text-xs font-semibold focus:ring-1 focus:ring-brand-orange" 
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Deliv. Days</label>
                                <input 
                                  type="number" 
                                  value={quotesData[item.id]?.days || ''}
                                  onChange={e => setQuotesData(prev => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      days: parseInt(e.target.value) || 0
                                    }
                                  }))}
                                  placeholder="e.g. 7"
                                  className="w-full border border-slate-200 rounded p-1.5 bg-white text-xs focus:ring-1 focus:ring-brand-orange" 
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description / Specs</label>
                                <input 
                                  type="text" 
                                  value={quotesData[item.id]?.description || ''}
                                  onChange={e => setQuotesData(prev => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      description: e.target.value || ''
                                    }
                                  }))}
                                  placeholder="Brand, specs..."
                                  className="w-full border border-slate-200 rounded p-1.5 bg-white text-xs focus:ring-1 focus:ring-brand-orange" 
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Remarks</label>
                                <input 
                                  type="text" 
                                  value={quotesData[item.id]?.remarks || ''}
                                  onChange={e => setQuotesData(prev => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      remarks: e.target.value || ''
                                    }
                                  }))}
                                  placeholder="Warranty, terms..."
                                  className="w-full border border-slate-200 rounded p-1.5 bg-white text-xs focus:ring-1 focus:ring-brand-orange" 
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* VAT, TAX & Grand Total Calculations Box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest">VAT, TAX & Total Calculations</h5>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">VAT Rate (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={vatPercent || ''}
                            onChange={e => setVatPercent(parseFloat(e.target.value) || 0)}
                            placeholder="e.g. 5, 7.5, 15"
                            className="w-full border border-slate-200 rounded p-2 bg-white text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">TAX / AIT Rate (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={taxPercent || ''}
                            onChange={e => setTaxPercent(parseFloat(e.target.value) || 0)}
                            placeholder="e.g. 2, 3, 5"
                            className="w-full border border-slate-200 rounded p-2 bg-white text-xs font-semibold"
                          />
                        </div>
                      </div>

                      {/* Summary Box */}
                      {(() => {
                        const currentPrItems = prs.find(p => p.id === viewRfq.prId)?.items || [];
                        let subtotal = 0;
                        currentPrItems.forEach((item: any) => {
                          const p = quotesData[item.id]?.price || 0;
                          subtotal += p * item.quantity;
                        });
                        const vatAmt = subtotal * (vatPercent / 100);
                        const taxAmt = subtotal * (taxPercent / 100);
                        const grandTotal = subtotal + vatAmt + taxAmt;

                        return (
                          <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 text-xs font-medium text-slate-700">
                            <div className="flex justify-between border-b border-slate-100 pb-1.5">
                              <span>Items Subtotal:</span>
                              <span className="font-bold">{currencySymbol}{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-1.5">
                              <span>VAT ({vatPercent}%):</span>
                              <span className="font-bold text-emerald-600">+ {currencySymbol}{vatAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-1.5">
                              <span>TAX / AIT ({taxPercent}%):</span>
                              <span className="font-bold text-blue-600">+ {currencySymbol}{taxAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between pt-1 text-sm font-extrabold text-slate-900">
                              <span>Grand Total Amount:</span>
                              <span className="text-brand-orange text-base">{currencySymbol}{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex justify-end pt-3">
                      <button 
                        type="submit" 
                        className="px-6 py-2 bg-brand-orange text-white rounded-lg text-sm font-bold shadow-sm hover:bg-[#e06214] transition-colors"
                      >
                        Save Quotation
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                    Select a vendor on the left to view or enter quotations.
                  </div>
                )}
              </div>
            </div>
            
          </div>
      )}
    </div>
    </PageLayout>
  );
}
