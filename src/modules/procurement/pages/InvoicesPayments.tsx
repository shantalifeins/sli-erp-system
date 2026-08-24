import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Plus, CheckCircle, ShieldCheck, DollarSign, FileText, ArrowLeft } from 'lucide-react';
import { cn } from '@/src/shared/lib/utils';
import PageLayout from '@/src/shared/components/PageLayout';
import { useCurrency } from '@/src/shared/components/SettingsProvider';

export default function InvoicesPayments() {
  const { getToken, dbUser, permissions } = useAuth();
  const currencySymbol = useCurrency();
  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [grns, setGrns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'payments'>('invoices');

  const [searchQuery, setSearchQuery] = useState('');

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const poPerms = permissions?.find((p: any) => p.module === 'Invoices & Payments') || {};
  const canCreate = isSuperAdmin || poPerms.canCreate;

  const [showInvModal, setShowInvModal] = useState(false);
  const [selectedGrnId, setSelectedGrnId] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const [invs, pays, grnData] = await Promise.all([
        fetchWithAuth('/api/invoices', token),
        fetchWithAuth('/api/payments', token),
        fetchWithAuth('/api/grn', token)
      ]);
      setInvoicesList(invs);
      setPaymentsList(pays);
      
      // We only allow generating invoices for QC Completed GRNs
      setGrns(grnData.filter((g: any) => g.status === 'QC Completed'));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [getToken]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrnId || creating) return;
    try {
      setCreating(true);
      const token = await getToken();
      await fetchWithAuth('/api/invoices', token, {
        method: 'POST',
        body: JSON.stringify({
          grnId: parseInt(selectedGrnId)
        })
      });
      setShowInvModal(false);
      setSelectedGrnId('');
      loadData();
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to create invoice.");
    } finally {
      setCreating(false);
    }
  };

  const handleMarkAsPaid = async (invId: number) => {
    if (!confirm("Are you sure you want to mark this invoice as paid?")) return;
    try {
      const token = await getToken();
      await fetchWithAuth(`/api/invoices/${invId}/pay`, token, {
        method: 'POST',
        body: JSON.stringify({})
      });
      loadData();
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to mark as paid.");
    }
  };

  const filteredInvoices = invoicesList.filter(i => 
    i.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.vendorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.grnNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPayments = paymentsList.filter(p => 
    p.paymentNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.vendorName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageLayout
      search={{
        placeholder: "Search invoices or payments...",
        onSearch: setSearchQuery
      }}
    >
      <div className="space-y-6">
        {!showInvModal && (
          <>
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-slate-800">Invoices & Payments</h1>
            <p className="text-sm text-slate-500">Manage GRN-wise invoices and vendor payments</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="bg-slate-100 p-1 rounded-lg inline-flex">
              <button
                onClick={() => setActiveSubTab('invoices')}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all",
                  activeSubTab === 'invoices' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Invoices
              </button>
              <button
                onClick={() => setActiveSubTab('payments')}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all",
                  activeSubTab === 'payments' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Payments History
              </button>
            </div>
            
            {activeSubTab === 'invoices' && canCreate && (
              <button
                onClick={() => setShowInvModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm ml-2"
              >
                <Plus size={16} />
                Generate Invoice
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {activeSubTab === 'invoices' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice No</th>
                      <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">GRN No</th>
                      <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendor</th>
                      <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center">
                            <FileText className="w-12 h-12 text-slate-300 mb-4" />
                            <p className="text-lg font-medium text-slate-600">No invoices found</p>
                            <p className="text-sm">Generate an invoice from a GRN to get started.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-medium text-slate-800">{inv.invoiceNumber}</td>
                          <td className="p-4 text-blue-600 font-medium">{inv.grnNumber}</td>
                          <td className="p-4 text-slate-600">{inv.vendorName}</td>
                          <td className="p-4 font-bold text-slate-700">{currencySymbol}{Number(inv.amount).toLocaleString()}</td>
                          <td className="p-4">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
                              inv.status === 'Paid' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            )}>
                              {inv.status === 'Paid' ? <CheckCircle size={14} /> : <DollarSign size={14} />}
                              {inv.status}
                            </span>
                          </td>
                          <td className="p-4">
                            {inv.status === 'Pending' && canCreate && (
                              <button
                                onClick={() => handleMarkAsPaid(inv.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors border border-blue-200"
                              >
                                <DollarSign size={14} />
                                Mark as Paid
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment No</th>
                      <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice No</th>
                      <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendor</th>
                      <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount Paid</th>
                      <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-500">
                          <p>No payments recorded yet.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-medium text-slate-800">{pay.paymentNumber}</td>
                          <td className="p-4 text-slate-600 font-medium">{pay.invoiceNumber}</td>
                          <td className="p-4 text-slate-600">{pay.vendorName}</td>
                          <td className="p-4 font-bold text-emerald-600">{currencySymbol}{Number(pay.amountPaid).toLocaleString()}</td>
                          <td className="p-4 text-slate-500">
                            {new Date(pay.paidAt).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                              {pay.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        </>
        )}
      </div>

      {/* Generate Invoice Form */}
      {showInvModal && (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden flex flex-col flex-1 mb-6">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50 rounded-t-xl">
              <button onClick={() => setShowInvModal(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors" title="Back to List">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Generate Invoice</h3>
                <p className="text-sm text-slate-500 mt-1">Select a QC Completed GRN to generate an invoice for.</p>
              </div>
            </div>
            <form onSubmit={handleCreateInvoice} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Select GRN <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedGrnId}
                    onChange={(e) => setSelectedGrnId(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="">Select a GRN...</option>
                    {grns.filter(g => {
                      // Ensure this GRN doesn't already have an invoice generated
                      const hasInvoice = invoicesList.some(inv => inv.grnId === g.id || inv.grnNumber === g.grnNumber);
                      return !hasInvoice;
                    }).map(g => {
                      const itemSummary = g.items && g.items.length > 0
                        ? g.items.map((i: any) => `${i.itemName || 'Item'} (${i.passedQty || i.quantityReceived} ${i.uom || 'Pcs'})`).join(', ')
                        : '';
                      const label = `${g.grnNumber}${g.vendorName ? ` — Vendor: ${g.vendorName}` : ''}${g.poNumber ? ` (${g.poNumber})` : ''}${itemSummary ? ` - ${itemSummary}` : ''}`;
                      return (
                        <option key={g.id} value={g.id}>{label}</option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInvModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {creating && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                  Generate
                </button>
              </div>
            </form>
          </div>
      )}
    </PageLayout>
  );
}
