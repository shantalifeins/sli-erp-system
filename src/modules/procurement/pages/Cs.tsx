import React from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Plus, Eye, Check, ArrowLeft, Paperclip, ExternalLink } from 'lucide-react';
import { cn } from '@/src/shared/lib/utils';
import PageLayout from '@/src/shared/components/PageLayout';
import { useCurrency } from '@/src/shared/components/SettingsProvider';

export default function Cs() {
  const { getToken, dbUser, permissions } = useAuth();
  const currencySymbol = useCurrency();
  const [css, setCss] = useState<any[]>([]);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [allRfqs, setAllRfqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRfqId, setSelectedRfqId] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const prPerms = permissions?.find((p: any) => p.module === 'Comparative Statement') || {};
  const canCreate = isSuperAdmin || prPerms.canCreate;
  const canEdit = isSuperAdmin || prPerms.canEdit;
  const canApprove = isSuperAdmin || prPerms.canApprove;

  const CRITERIA = [
    { name: 'Price', weight: 30 },
    { name: 'Quality', weight: 20 },
    { name: 'Delivery Timeline', weight: 15 },
    { name: 'Vendor Experience', weight: 10 },
    { name: 'Warranty & Support', weight: 10 },
    { name: 'Financial Stability', weight: 10 },
    { name: 'Compliance Requirement', weight: 5 }
  ];

  // CS detail & selection states
  const [comparisonRfq, setComparisonRfq] = useState<any>(null);
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [prItemsList, setPrItemsList] = useState<any[]>([]);
  const [allQuotations, setAllQuotations] = useState<any[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [justification, setJustification] = useState('');
  const [evaluationType, setEvaluationType] = useState('Full Evaluation');
  const [createVendorScores, setCreateVendorScores] = useState<any[]>([]);

  // Vendor Evaluation Modal States
  const [evaluationModalCs, setEvaluationModalCs] = useState<any>(null);
  const [vendorScores, setVendorScores] = useState<any[]>([]);
  const [evalSelectedVendorId, setEvalSelectedVendorId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evalQuotations, setEvalQuotations] = useState<any[]>([]);
  const [evalPrItems, setEvalPrItems] = useState<any[]>([]);
  const [showEvalQuotesMatrix, setShowEvalQuotesMatrix] = useState<boolean>(true);

  const getVendorQuoteDetails = (vendorId: number, quotes: any[], items: any[]) => {
    const vendorQuotes = quotes.filter((q: any) => q.vendorId === vendorId);
    let subtotal = 0;
    let vatPercent = 0;
    let taxPercent = 0;
    let attachmentUrl: string | null = null;

    if (vendorQuotes.length > 0) {
      vatPercent = Number(vendorQuotes[0].vatPercent) || 0;
      taxPercent = Number(vendorQuotes[0].taxPercent) || 0;
      attachmentUrl = vendorQuotes.find((q: any) => q.attachmentUrl)?.attachmentUrl || null;
    }

    items.forEach((item: any) => {
      const q = vendorQuotes.find((quote: any) => quote.prItemId === item.id);
      if (q) subtotal += Number(q.quotedPrice) * item.quantity;
    });

    const vatAmount = subtotal * (vatPercent / 100);
    const taxAmount = subtotal * (taxPercent / 100);
    const grandTotal = vendorQuotes[0]?.totalAmount ? Number(vendorQuotes[0].totalAmount) : (subtotal + vatAmount + taxAmount);

    return { subtotal, vatAmount, taxAmount, grandTotal, attachmentUrl };
  };

  const loadData = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const [csData, rfqData] = await Promise.all([
        fetchWithAuth('/api/cs', token),
        fetchWithAuth('/api/rfq', token)
      ]);
      setCss(csData);
      setAllRfqs(rfqData);
      setRfqs(rfqData.filter((r: any) => r.status === 'Open'));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [getToken]);

  const handleRfqSelect = async (rfqIdStr: string) => {
    setSelectedRfqId(rfqIdStr);
    if (!rfqIdStr) {
      setComparisonRfq(null);
      setCreateVendorScores([]);
      return;
    }
    try {
      const token = await getToken();
      const rfqId = parseInt(rfqIdStr);
      const rfqRec = rfqs.find(r => r.id === rfqId);
      
      // Fetch details
      const [allQuotes, prs] = await Promise.all([
        fetchWithAuth(`/api/rfq/${rfqId}/quotations`, token),
        fetchWithAuth('/api/pr', token)
      ]);
      
      const pr = prs.find((p: any) => p.id === rfqRec.prId);
      setComparisonRfq(rfqRec);
      setPrItemsList(pr?.items || []);
      setAllQuotations(allQuotes);
      const vendors = rfqRec.invitedVendors || [];
      setVendorsList(vendors);

      // Initialize evaluation scores for creation workflow
      const initScores: any[] = [];
      vendors.forEach((v: any) => {
        CRITERIA.forEach(c => {
          initScores.push({
            vendorId: v.id,
            vendorName: v.name,
            criteriaName: c.name,
            weight: c.weight,
            score: 0,
            remarks: ''
          });
        });
      });
      setCreateVendorScores(initScores);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateScoreChange = (vendorId: number, criteriaName: string, field: string, value: any) => {
    setCreateVendorScores(prev => {
      const updated = prev.map(s => {
        if (s.vendorId === vendorId && s.criteriaName === criteriaName) {
          return { ...s, [field]: value };
        }
        return s;
      });

      // Auto-suggest vendor with highest weighted score if scores are present
      const vendorTotals: { [vId: number]: number } = {};
      vendorsList.forEach(v => {
        const vScores = updated.filter(s => s.vendorId === v.id);
        vendorTotals[v.id] = vScores.reduce((sum, s) => sum + ((Number(s.score) || 0) * (s.weight / 100)), 0);
      });

      let highestVendorId: number | null = null;
      let highestScore = -1;
      Object.entries(vendorTotals).forEach(([vIdStr, total]) => {
        if (total > highestScore && total > 0) {
          highestScore = total;
          highestVendorId = Number(vIdStr);
        }
      });
      if (highestVendorId) {
        setSelectedVendorId(highestVendorId);
      }

      return updated;
    });
  };

  const handleGenerateCs = async (e: React.FormEvent, submitForApproval: boolean = false) => {
    e.preventDefault();
    if (!comparisonRfq || !selectedVendorId) {
      alert("Please select an open RFQ and an Awardee Vendor.");
      return;
    }

    if (submitForApproval && evaluationType !== 'Quick Evaluation') {
      const hasScores = createVendorScores.some(s => Number(s.score) > 0);
      if (!hasScores) {
        alert("Please evaluate vendors (enter criteria scores) before submitting for approval.");
        return;
      }
    }
    
    // Calculate total amount for selected vendor including VAT & TAX
    const selectedQuotes = allQuotations.filter(q => q.vendorId === selectedVendorId);
    let subtotal = 0;
    let vatPercent = 0;
    let taxPercent = 0;

    if (selectedQuotes.length > 0) {
      vatPercent = Number(selectedQuotes[0].vatPercent) || 0;
      taxPercent = Number(selectedQuotes[0].taxPercent) || 0;
    }

    prItemsList.forEach(item => {
      const q = selectedQuotes.find(quote => quote.prItemId === item.id);
      if (q) subtotal += Number(q.quotedPrice) * item.quantity;
    });

    const vatAmount = subtotal * (vatPercent / 100);
    const taxAmount = subtotal * (taxPercent / 100);
    const totalAmount = selectedQuotes[0]?.totalAmount ? Number(selectedQuotes[0].totalAmount) : (subtotal + vatAmount + taxAmount);

    try {
      setIsSubmitting(true);
      const token = await getToken();
      await fetchWithAuth('/api/cs', token, {
        method: 'POST',
        body: JSON.stringify({
          rfqId: comparisonRfq.id,
          prId: comparisonRfq.prId,
          selectedVendorId,
          justification,
          totalAmount,
          evaluationType,
          vendorScores: createVendorScores,
          submitForApproval
        })
      });
      setShowCreateModal(false);
      setSelectedRfqId('');
      setComparisonRfq(null);
      setSelectedVendorId(null);
      setJustification('');
      setCreateVendorScores([]);
      loadData();
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to create CS.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEvaluationModal = async (cs: any) => {
    const rfq = allRfqs.find(r => r.id === cs.rfqId);
    const vendors = rfq?.invitedVendors || [];
    
    let existingEvals: any[] = [];
    let quotes: any[] = [];
    let prItems: any[] = [];
    try {
      const token = await getToken();
      const [evalsRes, quotesRes, prsRes] = await Promise.all([
        fetchWithAuth(`/api/cs/${cs.id}/evaluations`, token),
        fetchWithAuth(`/api/rfq/${cs.rfqId}/quotations`, token),
        fetchWithAuth('/api/pr', token)
      ]);
      existingEvals = evalsRes || [];
      quotes = quotesRes || [];
      const prRec = (prsRes || []).find((p: any) => p.id === cs.prId);
      prItems = prRec?.items || [];
    } catch (err) {
      console.error(err);
    }

    setEvalQuotations(quotes);
    setEvalPrItems(prItems);
    setShowEvalQuotesMatrix(true);

    const initScores: any[] = [];
    vendors.forEach((v: any) => {
      CRITERIA.forEach(c => {
        const found = existingEvals.find((e: any) => e.vendorId === v.id && e.criteriaName === c.name);
        initScores.push({
          vendorId: v.id,
          vendorName: v.name,
          criteriaName: c.name,
          weight: c.weight,
          score: found ? Number(found.score) : 0,
          remarks: found ? found.remarks || '' : ''
        });
      });
    });
    setVendorScores(initScores);
    setEvalSelectedVendorId(cs.selectedVendorId || null);
    setEvaluationModalCs({ ...cs, vendors });
  };

  const handleScoreChange = (vendorId: number, criteriaName: string, field: string, value: any) => {
    setVendorScores(prev => prev.map(s => {
      if (s.vendorId === vendorId && s.criteriaName === criteriaName) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const submitEvaluation = async () => {
    if (!evaluationModalCs) return;
    try {
      setIsSubmitting(true);
      const token = await getToken();
      
      // Calculate total amount for the selected vendor
      let calculatedTotal = 0;
      if (evalSelectedVendorId) {
        const [prsRes, quotationsRes] = await Promise.all([
          fetchWithAuth('/api/pr', token),
          fetchWithAuth(`/api/rfq/${evaluationModalCs.rfqId}/quotations`, token)
        ]);
        const prRec = (prsRes || []).find((p: any) => p.id === evaluationModalCs.prId);
        const prItemsRes = prRec?.items || [];

        if (prItemsRes.length > 0 && quotationsRes) {
          const selectedQuotes = quotationsRes.filter((q: any) => q.vendorId === evalSelectedVendorId);
          let subtotal = 0;
          let vatPercent = 0;
          let taxPercent = 0;

          if (selectedQuotes.length > 0) {
            vatPercent = Number(selectedQuotes[0].vatPercent) || 0;
            taxPercent = Number(selectedQuotes[0].taxPercent) || 0;
          }

          prItemsRes.forEach((item: any) => {
            const q = selectedQuotes.find((quote: any) => quote.prItemId === item.id);
            if (q) subtotal += Number(q.quotedPrice) * item.quantity;
          });

          const vatAmount = subtotal * (vatPercent / 100);
          const taxAmount = subtotal * (taxPercent / 100);
          calculatedTotal = subtotal + vatAmount + taxAmount;
        }
      }

      await fetchWithAuth(`/api/cs/${evaluationModalCs.id}/evaluate`, token, {
        method: 'POST',
        body: JSON.stringify({
          vendorScores,
          selectedVendorId: evalSelectedVendorId,
          totalAmount: calculatedTotal || evaluationModalCs.totalAmount
        })
      });
      setEvaluationModalCs(null);
      loadData();
    } catch (error: any) {
      console.error("Failed to save evaluation:", error);
      alert(error.message || "Failed to save evaluation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitForApproval = async (csRecord: any) => {
    if (!csRecord.isEvaluated && csRecord.evaluationType !== 'Quick Evaluation') {
      alert("Please complete vendor evaluation before submitting for approval.");
      openEvaluationModal(csRecord);
      return;
    }
    if (!confirm("Are you sure you want to submit this CS for approval?")) return;
    try {
      const token = await getToken();
      await fetchWithAuth(`/api/cs/${csRecord.id}/submit-approval`, token, { method: 'POST' });
      loadData();
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to submit CS for approval");
    }
  };

  const getQuotedPrice = (vendorId: number, prItemId: number) => {
    const q = allQuotations.find(quote => quote.vendorId === vendorId && quote.prItemId === prItemId);
    return q ? `${currencySymbol}${Number(q.quotedPrice).toLocaleString()}` : '-';
  };

  const filteredCss = css.filter(c => 
    (c.csNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (c.rfqNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (c.prNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (c.selectedVendorName?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
  );
  
  const totalPages = Math.ceil(filteredCss.length / itemsPerPage);
  const paginatedCss = filteredCss.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <PageLayout
      loading={loading}
      search={{ placeholder: "Search CS...", onSearch: setSearchQuery }}
      pagination={showCreateModal || evaluationModalCs ? undefined : { currentPage, totalPages, onPageChange: setCurrentPage }}
    >
    <div className="space-y-6 flex flex-col h-full">
      {!showCreateModal && !evaluationModalCs && (
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-charcoal">Comparative Statement (CS)</h1>
          <p className="text-sm text-slate-500 mt-1">Review side-by-side vendor quotes, evaluate performance criteria, and submit for approval</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" /> Generate CS
          </button>
        )}
      </div>
      )}

      {!showCreateModal && !evaluationModalCs && (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">CS Number</th>
              <th className="px-6 py-4">RFQ Number</th>
              <th className="px-6 py-4">Requisition</th>
              <th className="px-6 py-4">Selected Vendor</th>
              <th className="px-6 py-4">Evaluation Status</th>
              <th className="px-6 py-4">Approval Status</th>
              <th className="px-6 py-4">Date Created</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedCss.length === 0 ? (
              <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">No CS records found.</td></tr>
            ) : paginatedCss.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900">{c.csNumber}</td>
                <td className="px-6 py-4">{c.rfqNumber}</td>
                <td className="px-6 py-4 text-brand-orange font-medium">{c.prNumber}</td>
                <td className="px-6 py-4 font-semibold text-slate-800">{c.selectedVendorName || '-'}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold",
                    c.evaluationType === 'Quick Evaluation' ? "bg-purple-100 text-purple-700" :
                    c.isEvaluated ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {c.evaluationType === 'Quick Evaluation' ? "Quick Eval" : c.isEvaluated ? "Evaluated" : "Pending Eval"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center px-2 py-1 rounded text-xs font-bold",
                    c.status === 'Approved' ? "bg-green-100 text-green-700" :
                    c.status === 'Pending Approval' ? "bg-amber-100 text-amber-700" :
                    c.status === 'Rejected' ? "bg-red-100 text-red-700" :
                    "bg-slate-100 text-slate-700"
                  )}>
                    {c.status}
                  </span>
                </td>
                <td className="px-6 py-4">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  {c.status === 'Draft' && (
                    <div className="flex justify-end gap-2">
                      {canEdit && (
                        <button 
                          onClick={() => openEvaluationModal(c)} 
                          className="px-3 py-1 bg-brand-blue text-white rounded text-xs font-bold hover:bg-blue-700"
                        >
                          {c.isEvaluated ? "Edit Eval" : "Evaluate"}
                        </button>
                      )}
                      {canApprove && (
                        <button 
                          onClick={() => submitForApproval(c)} 
                          disabled={!c.isEvaluated}
                          title={!c.isEvaluated ? "Vendor evaluation required before submission" : "Submit for Approval"}
                          className={cn(
                            "px-3 py-1 text-white rounded text-xs font-bold transition-colors",
                            c.isEvaluated 
                              ? "bg-brand-orange hover:bg-[#e06214]" 
                              : "bg-slate-300 cursor-not-allowed opacity-60"
                          )}
                        >
                          Submit
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Generate CS Form */}
      {showCreateModal && (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden flex flex-col flex-1 mb-6">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50 rounded-t-xl">
              <button 
                onClick={() => {
                  setShowCreateModal(false);
                  setComparisonRfq(null);
                  setSelectedRfqId('');
                  setCreateVendorScores([]);
                }} 
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors" title="Back to List"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-slate-800">Generate & Evaluate Comparative Statement</h3>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Select Open RFQ</label>
                <select 
                  value={selectedRfqId} 
                  onChange={e => handleRfqSelect(e.target.value)} 
                  required 
                  className="block w-full rounded-md border-slate-200 p-2 border bg-white text-sm"
                >
                  <option value="">Select...</option>
                  {rfqs.filter(r => {
                    // Exclude RFQs that already have a Comparative Statement generated
                    const hasCs = css.some(c => c.rfqId === r.id || c.rfqNumber === r.rfqNumber);
                    return !hasCs;
                  }).map(r => {
                    const itemSummary = r.items && r.items.length > 0 
                      ? ` - ${r.items.map((i: any) => `${i.itemName} (${i.quantity} ${i.uom || 'Pcs'})`).join(', ')}`
                      : '';
                    return (
                      <option key={r.id} value={r.id}>
                        {r.rfqNumber} — PR: {r.prNumber} ({r.department}){itemSummary}
                      </option>
                    );
                  })}
                </select>
              </div>

              {comparisonRfq && (
                <div className="space-y-6">
                  {/* Section 1: Quotes Matrix */}
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">1. Quotes Comparison Matrix</h4>
                  <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto shadow-xs">
                    <table className="w-full text-left text-sm text-slate-600 border-collapse">
                      <thead className="bg-slate-50/50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 border-r border-slate-200">Item Name</th>
                          <th className="px-4 py-3 border-r border-slate-200 text-right">Quantity</th>
                          {vendorsList.map(vendor => {
                            const vQuote = allQuotations.find(q => q.vendorId === vendor.id && q.attachmentUrl);
                            return (
                              <th key={vendor.id} className="px-4 py-3 text-center border-r border-slate-200 min-w-[200px]">
                                <div className="font-extrabold text-slate-800">{vendor.name}</div>
                                {vQuote?.attachmentUrl && (
                                  <div className="mt-1">
                                    <a
                                      href={vQuote.attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hover:underline"
                                    >
                                      <Paperclip className="w-3 h-3" /> View Original Quote <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  </div>
                                )}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {prItemsList.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-200">{item.itemName}</td>
                            <td className="px-4 py-3 text-right font-bold border-r border-slate-200">{item.quantity} {item.uom}</td>
                            {vendorsList.map(vendor => {
                              const q = allQuotations.find(quote => quote.vendorId === vendor.id && quote.prItemId === item.id);
                              const unitPrice = q ? Number(q.quotedPrice) : 0;
                              const lineTotal = unitPrice * item.quantity;
                              return (
                                <td key={vendor.id} className="px-4 py-3 text-center border-r border-slate-200 font-medium text-slate-900">
                                  {q ? (
                                    <div>
                                      <div className="font-bold">{currencySymbol}{unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                      <div className="text-[10px] text-slate-500">Subtotal: {currencySymbol}{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                      {q.description && <div className="text-[10px] text-slate-400 italic">"{q.description}"</div>}
                                    </div>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}

                        <tr className="bg-slate-50/80 font-bold border-t-2 border-slate-200">
                          <td colSpan={2} className="px-4 py-2.5 text-right border-r border-slate-200 uppercase text-xs text-slate-600">Items Subtotal</td>
                          {vendorsList.map(vendor => {
                            let subtotal = 0;
                            prItemsList.forEach(item => {
                              const q = allQuotations.find(quote => quote.vendorId === vendor.id && quote.prItemId === item.id);
                              if (q) subtotal += Number(q.quotedPrice) * item.quantity;
                            });
                            return (
                              <td key={vendor.id} className="px-4 py-2.5 text-center border-r border-slate-200 text-slate-800">
                                {currencySymbol}{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            );
                          })}
                        </tr>

                        <tr className="bg-slate-50/80 font-semibold text-xs">
                          <td colSpan={2} className="px-4 py-2.5 text-right border-r border-slate-200 uppercase text-emerald-700">VAT (%)</td>
                          {vendorsList.map(vendor => {
                            const vQuote = allQuotations.find(q => q.vendorId === vendor.id);
                            const vatPct = vQuote ? Number(vQuote.vatPercent) || 0 : 0;
                            let subtotal = 0;
                            prItemsList.forEach(item => {
                              const q = allQuotations.find(quote => quote.vendorId === vendor.id && quote.prItemId === item.id);
                              if (q) subtotal += Number(q.quotedPrice) * item.quantity;
                            });
                            const vatAmt = subtotal * (vatPct / 100);
                            return (
                              <td key={vendor.id} className="px-4 py-2.5 text-center border-r border-slate-200 text-emerald-700 font-bold">
                                +{currencySymbol}{vatAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({vatPct}%)
                              </td>
                            );
                          })}
                        </tr>

                        <tr className="bg-slate-50/80 font-semibold text-xs">
                          <td colSpan={2} className="px-4 py-2.5 text-right border-r border-slate-200 uppercase text-blue-700">TAX / AIT (%)</td>
                          {vendorsList.map(vendor => {
                            const vQuote = allQuotations.find(q => q.vendorId === vendor.id);
                            const taxPct = vQuote ? Number(vQuote.taxPercent) || 0 : 0;
                            let subtotal = 0;
                            prItemsList.forEach(item => {
                              const q = allQuotations.find(quote => quote.vendorId === vendor.id && quote.prItemId === item.id);
                              if (q) subtotal += Number(q.quotedPrice) * item.quantity;
                            });
                            const taxAmt = subtotal * (taxPct / 100);
                            return (
                              <td key={vendor.id} className="px-4 py-2.5 text-center border-r border-slate-200 text-blue-700 font-bold">
                                +{currencySymbol}{taxAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({taxPct}%)
                              </td>
                            );
                          })}
                        </tr>

                        <tr className="bg-amber-50/60 font-black text-sm border-t-2 border-brand-orange/30">
                          <td colSpan={2} className="px-4 py-3 text-right border-r border-slate-200 uppercase text-brand-charcoal">Grand Total Amount</td>
                          {vendorsList.map(vendor => {
                            const vQuote = allQuotations.find(q => q.vendorId === vendor.id);
                            const vatPct = vQuote ? Number(vQuote.vatPercent) || 0 : 0;
                            const taxPct = vQuote ? Number(vQuote.taxPercent) || 0 : 0;
                            let subtotal = 0;
                            prItemsList.forEach(item => {
                              const q = allQuotations.find(quote => quote.vendorId === vendor.id && quote.prItemId === item.id);
                              if (q) subtotal += Number(q.quotedPrice) * item.quantity;
                            });
                            const vatAmt = subtotal * (vatPct / 100);
                            const taxAmt = subtotal * (taxPct / 100);
                            const grandTotal = subtotal + vatAmt + taxAmt;
                            return (
                              <td key={vendor.id} className="px-4 py-3 text-center border-r border-slate-200 text-brand-orange font-extrabold text-base">
                                {currencySymbol}{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Section 2: Integrated Vendor Evaluation Table */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">2. Vendor Evaluation (7 Criteria Scoring)</h4>
                      {evaluationType === 'Quick Evaluation' && (
                        <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200">
                          ⚡ Quick Evaluation Mode (Scoring Optional)
                        </span>
                      )}
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600 border-collapse">
                        <thead className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 tracking-widest">
                          <tr>
                            <th className="px-4 py-3 border-r border-slate-200 w-48">Criteria</th>
                            <th className="px-4 py-3 border-r border-slate-200 w-16 text-center">Weight</th>
                            {vendorsList.map((vendor: any) => {
                              const details = getVendorQuoteDetails(vendor.id, allQuotations, prItemsList);
                              return (
                                <th key={vendor.id} className="px-4 py-3 text-center border-r border-slate-200 bg-slate-50/80 min-w-[180px]">
                                  <div className="font-extrabold text-slate-800 text-sm">{vendor.name}</div>
                                  {details.grandTotal > 0 && (
                                    <div className="mt-1 text-[11px] font-black text-brand-orange bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block shadow-2xs">
                                      Quote: {currencySymbol}{details.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                  )}
                                  {details.attachmentUrl && (
                                    <div className="mt-1">
                                      <a
                                        href={details.attachmentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hover:underline"
                                      >
                                        <Paperclip className="w-3 h-3" /> View Quote File <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    </div>
                                  )}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {CRITERIA.map(c => (
                            <tr key={c.name}>
                              <td className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-200">{c.name}</td>
                              <td className="px-4 py-3 text-center font-bold text-brand-orange border-r border-slate-200">{c.weight}%</td>
                              {vendorsList.map((vendor: any) => {
                                const scoreObj = createVendorScores.find(s => s.vendorId === vendor.id && s.criteriaName === c.name);
                                return (
                                  <td key={vendor.id} className="px-4 py-3 border-r border-slate-200 align-top">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Score (1-10)</span>
                                        <input 
                                          type="number" min="1" max="10" 
                                          value={scoreObj?.score || ''}
                                          onChange={e => handleCreateScoreChange(vendor.id, c.name, 'score', Number(e.target.value))}
                                          className="w-16 px-2 py-1 border border-slate-300 rounded text-center focus:ring-1 focus:ring-brand-blue" 
                                        />
                                      </div>
                                      <div>
                                        <input 
                                          type="text" placeholder="Remarks..."
                                          value={scoreObj?.remarks || ''}
                                          onChange={e => handleCreateScoreChange(vendor.id, c.name, 'remarks', e.target.value)}
                                          className="w-full px-2 py-1 border border-slate-200 rounded text-[10px] focus:ring-1 focus:ring-brand-blue"
                                        />
                                      </div>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                          <tr className="bg-slate-50">
                            <td className="px-4 py-3 font-bold text-slate-800 border-r border-slate-200 text-right uppercase text-[10px]" colSpan={2}>Weighted Score Total</td>
                            {vendorsList.map((vendor: any) => {
                              const vScores = createVendorScores.filter(s => s.vendorId === vendor.id);
                              const totalScore = vScores.reduce((sum, s) => sum + ((Number(s.score) || 0) * (s.weight / 100)), 0);
                              return (
                                <td key={vendor.id} className="px-4 py-3 border-r border-slate-200 text-center font-black text-lg text-brand-blue">
                                  {totalScore.toFixed(2)}
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 3: Awardee Selection & Justification Form */}
                  <form onSubmit={e => handleGenerateCs(e, false)} className="space-y-4 pt-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">3. Winning Vendor & Justification</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Select Awardee Vendor</label>
                        <select 
                          value={selectedVendorId || ''} 
                          onChange={e => setSelectedVendorId(parseInt(e.target.value))} 
                          required 
                          className="block w-full rounded-md border-slate-200 p-2 border bg-white text-sm"
                        >
                          <option value="">Select...</option>
                          {vendorsList.map(v => {
                            const vScores = createVendorScores.filter(s => s.vendorId === v.id);
                            const totalScore = vScores.reduce((sum, s) => sum + ((Number(s.score) || 0) * (s.weight / 100)), 0);
                            return (
                              <option key={v.id} value={v.id}>
                                {v.name} {totalScore > 0 ? `(Score: ${totalScore.toFixed(2)})` : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Evaluation Type</label>
                        <select 
                          value={evaluationType} 
                          onChange={e => setEvaluationType(e.target.value)}
                          className="block w-full rounded-md border-slate-200 p-2 border bg-white text-sm" 
                        >
                          <option value="Full Evaluation">Full Evaluation</option>
                          <option value="Quick Evaluation">Quick Evaluation</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Award Justification</label>
                        <input 
                          type="text" 
                          value={justification} 
                          onChange={e => setJustification(e.target.value)}
                          required
                          placeholder="e.g. Highest weighted score in evaluation (price + quality)"
                          className="block w-full rounded-md border-slate-200 p-2 border text-sm" 
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowCreateModal(false);
                          setComparisonRfq(null);
                          setSelectedRfqId('');
                          setCreateVendorScores([]);
                        }}
                        className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="px-4 py-2.5 bg-slate-700 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                      >
                        Save as Draft
                      </button>
                      <button 
                        type="button"
                        onClick={e => handleGenerateCs(e, true)}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 bg-brand-orange text-white rounded-lg text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors disabled:opacity-50"
                      >
                        {isSubmitting ? 'Submitting...' : 'Generate & Submit CS'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
        </div>
      )}

      {/* Vendor Evaluation Form */}
      {evaluationModalCs && (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden flex flex-col flex-1 mb-6">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
              <div className="flex items-center gap-3">
                <button onClick={() => setEvaluationModalCs(null)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors" title="Back to List">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-bold text-slate-800">Vendor Evaluation: {evaluationModalCs.csNumber}</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowEvalQuotesMatrix(!showEvalQuotesMatrix)} 
                className="text-xs font-bold text-brand-blue bg-blue-50 px-3 py-1.5 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                {showEvalQuotesMatrix ? "Hide Quotes Matrix ▲" : "Show Quotes Matrix ▼"}
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* Collapsible Quotes Matrix */}
              {showEvalQuotesMatrix && evalPrItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">RFQ Quotes Comparison & Attachments</h4>
                  <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto shadow-2xs">
                    <table className="w-full text-left text-xs text-slate-600 border-collapse">
                      <thead className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 border-r border-slate-200">Item Name</th>
                          <th className="px-3 py-2 border-r border-slate-200 text-right">Quantity</th>
                          {evaluationModalCs.vendors.map((vendor: any) => {
                            const details = getVendorQuoteDetails(vendor.id, evalQuotations, evalPrItems);
                            return (
                              <th key={vendor.id} className="px-3 py-2 text-center border-r border-slate-200 min-w-[160px]">
                                <div className="font-extrabold text-slate-800">{vendor.name}</div>
                                {details.grandTotal > 0 && (
                                  <div className="text-[10px] font-black text-brand-orange">
                                    {currencySymbol}{details.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </div>
                                )}
                                {details.attachmentUrl && (
                                  <div className="mt-0.5">
                                    <a
                                      href={details.attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-0.5 text-[9px] font-bold text-blue-600 hover:underline"
                                    >
                                      <Paperclip className="w-2.5 h-2.5" /> Quote File <ExternalLink className="w-2 h-2" />
                                    </a>
                                  </div>
                                )}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {evalPrItems.map((item: any) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2 font-semibold text-slate-800 border-r border-slate-200">{item.itemName}</td>
                            <td className="px-3 py-2 text-right font-bold border-r border-slate-200">{item.quantity} {item.uom}</td>
                            {evaluationModalCs.vendors.map((vendor: any) => {
                              const q = evalQuotations.find((quote: any) => quote.vendorId === vendor.id && quote.prItemId === item.id);
                              const unitPrice = q ? Number(q.quotedPrice) : 0;
                              return (
                                <td key={vendor.id} className="px-3 py-2 text-center border-r border-slate-200 font-medium text-slate-900">
                                  {q ? `${currencySymbol}${unitPrice.toLocaleString()}` : '-'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Scoring Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Performance Scoring (7 Criteria)</h4>
                <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600 border-collapse">
                    <thead className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 tracking-widest">
                      <tr>
                        <th className="px-4 py-3 border-r border-slate-200 w-48">Criteria</th>
                        <th className="px-4 py-3 border-r border-slate-200 w-16 text-center">Weight</th>
                        {evaluationModalCs.vendors.map((vendor: any) => {
                          const details = getVendorQuoteDetails(vendor.id, evalQuotations, evalPrItems);
                          return (
                            <th key={vendor.id} className="px-4 py-3 text-center border-r border-slate-200 bg-slate-50/80 min-w-[180px]">
                              <div className="font-extrabold text-slate-800 text-sm">{vendor.name}</div>
                              {details.grandTotal > 0 && (
                                <div className="mt-1 text-[11px] font-black text-brand-orange bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block shadow-2xs">
                                  Quote: {currencySymbol}{details.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                              )}
                              {details.attachmentUrl && (
                                <div className="mt-1">
                                  <a
                                    href={details.attachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hover:underline"
                                  >
                                    <Paperclip className="w-3 h-3" /> View Quote File <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {CRITERIA.map(c => (
                        <tr key={c.name}>
                          <td className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-200">{c.name}</td>
                          <td className="px-4 py-3 text-center font-bold text-brand-orange border-r border-slate-200">{c.weight}%</td>
                          {evaluationModalCs.vendors.map((vendor: any) => {
                            const scoreObj = vendorScores.find(s => s.vendorId === vendor.id && s.criteriaName === c.name);
                            return (
                              <td key={vendor.id} className="px-4 py-3 border-r border-slate-200 align-top">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Score (1-10)</span>
                                    <input 
                                      type="number" min="1" max="10" 
                                      value={scoreObj?.score || ''}
                                      onChange={e => handleScoreChange(vendor.id, c.name, 'score', Number(e.target.value))}
                                      className="w-16 px-2 py-1 border border-slate-300 rounded text-center focus:ring-1 focus:ring-brand-blue" 
                                    />
                                  </div>
                                  <div>
                                    <input 
                                      type="text" placeholder="Remarks..."
                                      value={scoreObj?.remarks || ''}
                                      onChange={e => handleScoreChange(vendor.id, c.name, 'remarks', e.target.value)}
                                      className="w-full px-2 py-1 border border-slate-200 rounded text-[10px] focus:ring-1 focus:ring-brand-blue"
                                    />
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      <tr className="bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-800 border-r border-slate-200 text-right uppercase text-[10px]" colSpan={2}>Weighted Score</td>
                        {evaluationModalCs.vendors.map((vendor: any) => {
                          const vScores = vendorScores.filter(s => s.vendorId === vendor.id);
                          const totalScore = vScores.reduce((sum, s) => sum + ((Number(s.score) || 0) * (s.weight / 100)), 0);
                          return (
                            <td key={vendor.id} className="px-4 py-3 border-r border-slate-200 text-center font-black text-lg text-brand-blue">
                              {totalScore.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-col items-end space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Winning Vendor Selection</label>
              <select 
                value={evalSelectedVendorId || ''} 
                onChange={(e) => setEvalSelectedVendorId(Number(e.target.value) || null)}
                className="border border-slate-300 rounded px-3 py-1.5 text-sm font-semibold focus:ring-2 focus:ring-brand-blue outline-none"
              >
                <option value="">-- Select Winner --</option>
                {evaluationModalCs.vendors.map((v: any) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
              <button onClick={() => setEvaluationModalCs(null)} className="px-6 py-2 border border-slate-200 bg-white rounded-lg text-sm font-bold text-slate-650">Cancel</button>
              <button 
                onClick={submitEvaluation}
                disabled={isSubmitting}
                className="px-6 py-2 bg-brand-orange text-white rounded-lg text-sm font-bold hover:bg-[#e06214] shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Evaluation'}
              </button>
            </div>
        </div>
      )}
    </div>
    </PageLayout>
  );
}
