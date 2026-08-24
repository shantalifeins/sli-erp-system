import React from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { ShoppingCart, Eye, Plus, ArrowLeft } from 'lucide-react';
import { cn } from '@/src/shared/lib/utils';
import PageLayout from '@/src/shared/components/PageLayout';
import { useCurrency } from '@/src/shared/components/SettingsProvider';

export default function PurchaseOrders() {
  const { getToken, dbUser, permissions } = useAuth();
  const currencySymbol = useCurrency();
  const [pos, setPos] = useState<any[]>([]);
  const [cssList, setCssList] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedCsId, setSelectedCsId] = useState('');
  const [selectedCs, setSelectedCs] = useState<any>(null);
  
  const [poItemsList, setPoItemsList] = useState<any[]>([]);
  const [poTotal, setPoTotal] = useState(0);

  const [paymentTerms, setPaymentTerms] = useState('');
  const [warrantyTerms, setWarrantyTerms] = useState('');
  const [deliverySchedule, setDeliverySchedule] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const poPerms = permissions?.find((p: any) => p.module === 'Purchase Orders') || {};
  const canCreate = isSuperAdmin || poPerms.canCreate;

  const loadData = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const [poData, csData, prData, vendorData] = await Promise.all([
        fetchWithAuth('/api/purchase', token),
        fetchWithAuth('/api/cs', token),
        fetchWithAuth('/api/pr', token),
        fetchWithAuth('/api/vendors', token)
      ]);
      setPos(poData);
      setCssList(csData.filter((c: any) => c.status === 'Approved'));
      setPrs(prData);
      setVendors(vendorData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [getToken]);

  const handleCsSelect = async (csIdStr: string) => {
    setSelectedCsId(csIdStr);
    if (!csIdStr) {
      setSelectedCs(null);
      setPoItemsList([]);
      setPoTotal(0);
      setPaymentTerms('');
      setWarrantyTerms('');
      setDeliverySchedule('');
      return;
    }
    const token = await getToken();
    const csId = parseInt(csIdStr);
    const cs = cssList.find(c => c.id === csId);
    setSelectedCs(cs);

    // Fetch quotations and PR items for this CS to build PO items
    try {
      const quotes = await fetchWithAuth(`/api/rfq/${cs.rfqId}/quotations`, token);
      const pr = prs.find(p => p.id === cs.prId);
      
      const vendorQuotes = quotes.filter((q: any) => q.vendorId === cs.selectedVendorId);
      
      const items = pr?.items?.map((item: any) => {
        const quote = vendorQuotes.find((q: any) => q.prItemId === item.id);
        const price = quote ? Number(quote.quotedPrice) : 0;
        return {
          itemName: item.itemName,
          quantity: item.quantity,
          uom: item.uom,
          unitPrice: price
        };
      }) || [];

      setPoItemsList(items);
      const total = items.reduce((acc: number, cur: any) => acc + (cur.quantity * cur.unitPrice), 0);
      setPoTotal(total);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitPo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCs) return;
    try {
      const token = await getToken();
      await fetchWithAuth('/api/purchase', token, {
        method: 'POST',
        body: JSON.stringify({
          prId: selectedCs.prId,
          csId: selectedCs.id,
          vendorId: selectedCs.selectedVendorId,
          totalAmount: poTotal,
          items: poItemsList,
          paymentTerms,
          warrantyTerms,
          deliverySchedule
        })
      });
      setShowGenerateModal(false);
      setSelectedCsId('');
      setSelectedCs(null);
      setPoItemsList([]);
      setPoTotal(0);
      setPaymentTerms('');
      setWarrantyTerms('');
      setDeliverySchedule('');
      loadData();
    } catch (error) {
      console.error(error);
    }
  };

  const filteredPos = pos.filter(po => 
    (po.poNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (po.vendorName?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (po.prNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
  );
  
  const totalPages = Math.ceil(filteredPos.length / itemsPerPage);
  const paginatedPos = filteredPos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <PageLayout
      loading={loading}
      search={{ placeholder: "Search POs...", onSearch: setSearchQuery }}
      pagination={showGenerateModal ? undefined : { currentPage, totalPages, onPageChange: setCurrentPage }}
    >
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-charcoal">Purchase Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Manage POs and track fulfillment status</p>
        </div>
        {canCreate && !showGenerateModal && (
          <button 
            onClick={() => setShowGenerateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" /> Generate PO
          </button>
        )}
      </div>

      {!showGenerateModal && (
      <div className="bg-white border border-slate-200 rounded-xl overflow-auto shadow-sm flex-1 min-h-0">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">PO Number</th>
              <th className="px-6 py-4">Requisition</th>
              <th className="px-6 py-4">Vendor</th>
              <th className="px-6 py-4 text-right">Total Amount</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Created Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedPos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <ShoppingCart className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-2 text-sm font-medium text-slate-500">No Purchase Orders found.</p>
                </td>
              </tr>
            ) : paginatedPos.map((po) => (
              <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900">{po.poNumber}</td>
                <td className="px-6 py-4 font-semibold text-brand-orange">{po.prNumber}</td>
                <td className="px-6 py-4 font-medium text-slate-800">{po.vendorName}</td>
                <td className="px-6 py-4 text-right font-bold">{currencySymbol}{Number(po.totalAmount).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center px-2 py-1 rounded text-xs font-bold",
                    po.status === 'Approved' ? "bg-green-100 text-green-700" :
                    po.status === 'Pending Approval' ? "bg-amber-100 text-amber-700" :
                    po.status === 'Rejected' ? "bg-red-100 text-red-700" :
                    po.status === 'Delivered' ? "bg-blue-100 text-blue-700" :
                    "bg-slate-100 text-slate-700"
                  )}>
                    {po.status}
                  </span>
                </td>
                <td className="px-6 py-4">{new Date(po.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Generate PO Form */}
      {showGenerateModal && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 mb-6">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50 rounded-t-xl">
              <button 
                onClick={() => {
                  setShowGenerateModal(false);
                  setSelectedCs(null);
                  setSelectedCsId('');
                }} 
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                title="Back to List"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-slate-800">Generate Purchase Order</h3>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Select Approved Comparative Statement (CS)</label>
                <select 
                  value={selectedCsId} 
                  onChange={e => handleCsSelect(e.target.value)} 
                  required 
                  className="block w-full rounded-md border-slate-200 p-2 border bg-white text-sm"
                >
                  <option value="">Select...</option>
                  {cssList.filter(c => {
                    // Exclude CS records that already have a Purchase Order generated
                    const hasPo = pos.some(p => p.csId === c.id || p.csNumber === c.csNumber);
                    return !hasPo;
                  }).map(c => {
                    const itemSummary = c.items && c.items.length > 0 
                      ? ` - ${c.items.map((i: any) => `${i.itemName} (${i.quantity} ${i.uom || 'Pcs'})`).join(', ')}`
                      : '';
                    const prText = c.prNumber ? ` (PR: ${c.prNumber})` : '';
                    const amountText = (c.grandTotal || c.totalAmount) ? ` (${currencySymbol}${Number(c.grandTotal || c.totalAmount).toLocaleString()})` : '';
                    return (
                      <option key={c.id} value={c.id}>
                        {c.csNumber} — Vendor: {c.selectedVendorName}{prText}{itemSummary}{amountText}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedCs && (
                <form onSubmit={handleSubmitPo} className="space-y-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">PO Summary</h4>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-semibold text-slate-500">Selected Vendor</div>
                      <div className="font-bold text-slate-800">{selectedCs.selectedVendorName}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500">PO Total Amount</div>
                      <div className="font-bold text-slate-900">{currencySymbol}{poTotal.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest">PO Items</h5>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50/50 text-xs font-bold text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3">Item Name</th>
                            <th className="px-4 py-3 text-right">Quantity</th>
                            <th className="px-4 py-3 text-right">Quoted Unit Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {poItemsList.map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-3 font-semibold text-slate-800">{item.itemName}</td>
                              <td className="px-4 py-3 text-right">{item.quantity} {item.uom}</td>
                              <td className="px-4 py-3 text-right font-bold">{currencySymbol}{item.unitPrice.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Payment Terms</label>
                      <input 
                        type="text" 
                        value={paymentTerms} 
                        onChange={e => setPaymentTerms(e.target.value)}
                        placeholder="e.g. Net 30"
                        className="block w-full rounded-md border-slate-200 p-2 border text-sm focus:ring-1 focus:ring-brand-blue" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Warranty Terms</label>
                      <input 
                        type="text" 
                        value={warrantyTerms} 
                        onChange={e => setWarrantyTerms(e.target.value)}
                        placeholder="e.g. 1 Year"
                        className="block w-full rounded-md border-slate-200 p-2 border text-sm focus:ring-1 focus:ring-brand-blue" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Delivery Schedule</label>
                      <input 
                        type="text" 
                        value={deliverySchedule} 
                        onChange={e => setDeliverySchedule(e.target.value)}
                        placeholder="e.g. Within 15 Days"
                        className="block w-full rounded-md border-slate-200 p-2 border text-sm focus:ring-1 focus:ring-brand-blue" 
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowGenerateModal(false);
                        setSelectedCs(null);
                        setSelectedCsId('');
                      }}
                      className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-5 py-2.5 bg-brand-orange text-white rounded-lg text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors"
                    >
                      Submit PO for Approval
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
      )}
    </div>
    </PageLayout>
  );
}

