import React from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Plus, Eye, Check, ArrowLeft } from 'lucide-react';
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

  // Vendor Evaluation Modal States
  const [evaluationModalCs, setEvaluationModalCs] = useState<any>(null);
  const [vendorScores, setVendorScores] = useState<any[]>([]);
  const [evalSelectedVendorId, setEvalSelectedVendorId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!rfqIdStr) return;
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
      setVendorsList(rfqRec.invitedVendors || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleGenerateCs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comparisonRfq || !selectedVendorId) return;
    
    // Calculate total amount for selected vendor
    let totalAmount = 0;
    prItemsList.forEach(item => {
      const q = allQuotations.find(quote => quote.vendorId === selectedVendorId && quote.prItemId === item.id);
      if (q) totalAmount += Number(q.quotedPrice) * item.quantity;
    });

    try {
      const token = await getToken();
      await fetchWithAuth('/api/cs', token, {
        method: 'POST',
        body: JSON.stringify({
          rfqId: comparisonRfq.id,
          prId: comparisonRfq.prId,
          selectedVendorId,
          justification,
          totalAmount,
          evaluationType
        })
      });
      setShowCreateModal(false);
      setSelectedRfqId('');
      setComparisonRfq(null);
      setSelectedVendorId(null);
      setJustification('');
      loadData();
    } catch (error) {
      console.error(error);
    }
  };

  const openEvaluationModal = async (cs: any) => {
    const rfq = allRfqs.find(r => r.id === cs.rfqId);
    const vendors = rfq?.invitedVendors || [];
    
    const initScores: any[] = [];
    vendors.forEach((v: any) => {
      CRITERIA.forEach(c => {
        initScores.push({ vendorId: v.id, vendorName: v.name, criteriaName: c.name, weight: c.weight, score: 0, remarks: '' });
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
        const prItemsRes = await fetchWithAuth(`/api/pr/${evaluationModalCs.prId}/items`, token);
        const quotationsRes = await fetchWithAuth(`/api/rfq/${evaluationModalCs.rfqId}/quotations`, token);
        if (prItemsRes && quotationsRes) {
          prItemsRes.forEach((item: any) => {
            const q = quotationsRes.find((quote: any) => quote.vendorId === evalSelectedVendorId && quote.prItemId === item.id);
            if (q) calculatedTotal += Number(q.quotedPrice) * item.quantity;
          });
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
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitForApproval = async (csId: number) => {
    if (!confirm("Are you sure you want to submit this CS for approval?")) return;
    try {
      const token = await getToken();
      await fetchWithAuth(`/api/cs/${csId}/submit-approval`, token, { method: 'POST' });
      loadData();
    } catch (error) {
      console.error(error);
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
      pagination={{ currentPage, totalPages, onPageChange: setCurrentPage }}
    >
    <div className="space-y-6 flex flex-col h-full">
      {!showCreateModal && !evaluationModalCs && (
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-charcoal">Comparative Statement (CS)</h1>
          <p className="text-sm text-slate-500 mt-1">Review side-by-side vendor quotes and approve selections</p>
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
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Date Created</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedCss.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No CS records found.</td></tr>
            ) : paginatedCss.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900">{c.csNumber}</td>
                <td className="px-6 py-4">{c.rfqNumber}</td>
                <td className="px-6 py-4 text-brand-orange font-medium">{c.prNumber}</td>
                <td className="px-6 py-4 font-semibold text-slate-800">{c.selectedVendorName}</td>
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
                      {canEdit && <button onClick={() => openEvaluationModal(c)} className="px-3 py-1 bg-brand-blue text-white rounded text-xs font-bold hover:bg-blue-700">Evaluate</button>}
                      {canApprove && <button onClick={() => submitForApproval(c.id)} className="px-3 py-1 bg-brand-orange text-white rounded text-xs font-bold hover:bg-[#e06214]">Submit</button>}
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
                }} 
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors" title="Back to List"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-slate-800">Generate Comparative Statement</h3>
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
                  {rfqs.map(r => <option key={r.id} value={r.id}>{r.rfqNumber} (PR: {r.prNumber} - {r.department})</option>)}
                </select>
              </div>

              {comparisonRfq && (
                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Quotes Comparison Matrix</h4>
                  <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 border-collapse">
                      <thead className="bg-slate-50/50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 border-r border-slate-200">Item Name</th>
                          <th className="px-4 py-3 border-r border-slate-200 text-right">Quantity</th>
                          {vendorsList.map(vendor => (
                            <th key={vendor.id} className="px-4 py-3 text-center border-r border-slate-200 min-w-32">
                              {vendor.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {prItemsList.map(item => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 font-semibold text-slate-800 border-r border-slate-200">{item.itemName}</td>
                            <td className="px-4 py-3 text-right font-bold border-r border-slate-200">{item.quantity} {item.uom}</td>
                            {vendorsList.map(vendor => (
                              <td key={vendor.id} className="px-4 py-3 text-center border-r border-slate-200 font-medium text-slate-900">
                                {getQuotedPrice(vendor.id, item.id)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <form onSubmit={handleGenerateCs} className="space-y-4">
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
                          {vendorsList.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
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
                          placeholder="e.g. Best price and earliest delivery"
                          className="block w-full rounded-md border-slate-200 p-2 border text-sm" 
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowCreateModal(false);
                          setComparisonRfq(null);
                          setSelectedRfqId('');
                        }}
                        className="px-4 py-2 border border-slate-200 rounded text-sm font-bold text-slate-600"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214]"
                      >
                        Generate & Submit CS
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
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50 rounded-t-xl">
              <button onClick={() => setEvaluationModalCs(null)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors" title="Back to List">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-slate-800">Vendor Evaluation: {evaluationModalCs.csNumber}</h3>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 border-collapse">
                  <thead className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 tracking-widest">
                    <tr>
                      <th className="px-4 py-3 border-r border-slate-200 w-48">Criteria</th>
                      <th className="px-4 py-3 border-r border-slate-200 w-16 text-center">Weight</th>
                      {evaluationModalCs.vendors.map((vendor: any) => (
                        <th key={vendor.id} className="px-4 py-3 text-center border-r border-slate-200">
                          {vendor.name}
                        </th>
                      ))}
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
                          )
                        })}
                      </tr>
                    ))}
                    <tr className="bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-800 border-r border-slate-200 text-right uppercase text-[10px]" colSpan={2}>Weighted Score</td>
                      {evaluationModalCs.vendors.map((vendor: any) => {
                        const vScores = vendorScores.filter(s => s.vendorId === vendor.id);
                        const totalScore = vScores.reduce((sum, s) => sum + (s.score * (s.weight / 100)), 0);
                        return (
                          <td key={vendor.id} className="px-4 py-3 border-r border-slate-200 text-center font-black text-lg text-brand-blue">
                            {totalScore.toFixed(2)}
                          </td>
                        )
                      })}
                    </tr>
                  </tbody>
                </table>
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
