import React from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Plus, Eye, Truck, ClipboardCheck, CheckCircle, XCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/src/shared/lib/utils';
import PageLayout from '@/src/shared/components/PageLayout';
import { useCurrency } from '@/src/shared/components/SettingsProvider';

export default function Grn() {
  const { getToken, dbUser, permissions } = useAuth();
  const currencySymbol = useCurrency();
  const [grns, setGrns] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  
  // QC Inspection states
  const [selectedGrn, setSelectedGrn] = useState<any>(null);
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const [isReinspecting, setIsReinspecting] = useState(false);
  
  // Initial inspection states
  const [passedQty, setPassedQty] = useState<number>(0);
  const [failedQty, setFailedQty] = useState<number>(0);

  // Re-inspection specific states (for held items only)
  const [reinspectPassedQty, setReinspectPassedQty] = useState<number>(0);
  const [reinspectHoldQty, setReinspectHoldQty] = useState<number>(0);

  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedPoId, setSelectedPoId] = useState('');
  const [selectedPo, setSelectedPo] = useState<any>(null);
  const [receiveQtys, setReceiveQtys] = useState<{ [poItemId: number]: number }>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const inventoryPerms = permissions?.find((p: any) => p.module === 'Goods Receipt (GRN)') || {};
  const canCreate = isSuperAdmin || inventoryPerms.canCreate;
  const canApprove = isSuperAdmin || inventoryPerms.canApprove;

  const loadData = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const [grnData, poData, whData, woData] = await Promise.all([
        fetchWithAuth('/api/grn', token),
        fetchWithAuth('/api/purchase', token),
        fetchWithAuth('/api/warehouses', token),
        fetchWithAuth('/api/work-orders', token)
      ]);
      setGrns(grnData);
      setPos(poData.filter((p: any) => p.status === 'Approved'));
      setWarehouses(whData);
      setWorkOrders(woData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [getToken]);

  const handlePoSelect = (poIdStr: string) => {
    setSelectedPoId(poIdStr);
    if (!poIdStr) {
      setSelectedPo(null);
      return;
    }
    const po = pos.find(p => p.id === parseInt(poIdStr));
    if (po) {
      const wo = workOrders.find((w: any) => w.poId === po.id || w.csId === po.csId);
      if (wo && (wo.status !== 'Signed & Active' || !wo.signedFileUrl)) {
        alert("⚠️ Signed Work Order has not been uploaded for this Purchase Order yet. Please upload the signed Work Order in the Work Orders module before receiving goods.");
        setSelectedPoId('');
        setSelectedPo(null);
        return;
      }
    }
    setSelectedPo(po);
    const initialQtys: any = {};
    po?.items?.forEach((i: any) => {
      initialQtys[i.id] = i.quantity; // Default to full pending quantity
    });
    setReceiveQtys(initialQtys);
  };

  const handleCreateGrn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPo || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const token = await getToken();
      const itemsToReceive = Object.keys(receiveQtys).map(poItemId => ({
        poItemId: parseInt(poItemId),
        quantityReceived: receiveQtys[parseInt(poItemId)] || 0
      }));

      await fetchWithAuth('/api/grn', token, {
        method: 'POST',
        body: JSON.stringify({
          poId: parseInt(selectedPoId),
          warehouseId: parseInt(selectedWarehouseId),
          items: itemsToReceive
        })
      });

      setShowCreateModal(false);
      setSelectedPo(null);
      setSelectedPoId('');
      setSelectedWarehouseId('');
      setReceiveQtys({});
      loadData();
    } catch (error) {
      console.error(error);
      alert("Failed to create GRN");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeGrnItem = selectedGrn?.items?.find((i: any) => i.id === activeItemId);

  const handleInspectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItemId || !activeGrnItem || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const token = await getToken();

      let submitPassedQty = passedQty;
      let submitFailedQty = failedQty;
      let inspectedCount = passedQty + failedQty;

      if (isReinspecting) {
        const prevPassed = activeGrnItem.passedQty || 0;
        const prevHeld = activeGrnItem.failedQty || 0;
        submitPassedQty = prevPassed + reinspectPassedQty;
        submitFailedQty = Math.max(0, prevHeld - reinspectPassedQty);
        inspectedCount = reinspectPassedQty + reinspectHoldQty;
      }

      await fetchWithAuth('/api/qc/inspection', token, {
        method: 'POST',
        body: JSON.stringify({
          grnItemId: activeItemId,
          inspectedQty: inspectedCount,
          passedQty: submitPassedQty,
          failedQty: submitFailedQty,
          remarks
        })
      });
      setActiveItemId(null);
      setIsReinspecting(false);
      setPassedQty(0);
      setFailedQty(0);
      setReinspectPassedQty(0);
      setReinspectHoldQty(0);
      setRemarks('');
      
      const currentGrnId = selectedGrn.id;
      const grnData = await fetchWithAuth('/api/grn', token);
      const updatedGrn = grnData.find((g: any) => g.id === currentGrnId);
      if (updatedGrn) {
        setSelectedGrn(updatedGrn);
      } else {
        setSelectedGrn(null);
      }
      loadData();
    } catch (error) {
      console.error(error);
      alert("Failed to submit QC result");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredGrns = grns.filter(g => 
    (g.grnNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (g.poNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (g.vendorName?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
  );
  
  const totalPages = Math.ceil(filteredGrns.length / itemsPerPage);
  const paginatedGrns = filteredGrns.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <PageLayout
      loading={loading}
      search={{ placeholder: "Search GRN...", onSearch: setSearchQuery }}
      pagination={showCreateModal || selectedGrn ? undefined : { currentPage, totalPages, onPageChange: setCurrentPage }}
    >
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-charcoal">Goods Receive Note (GRN)</h1>
          <p className="text-sm text-slate-500 mt-1">Receive delivery packages and match PO quantities</p>
        </div>
        {canCreate && !showCreateModal && !selectedGrn && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" /> Receive Goods
          </button>
        )}
      </div>

      {!showCreateModal && !selectedGrn && (
      <div className="bg-white rounded-xl border border-slate-200 overflow-auto shadow-sm flex-1 min-h-0">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">GRN Number</th>
              <th className="px-6 py-4">PO Number</th>
              <th className="px-6 py-4">Vendor</th>
              <th className="px-6 py-4">Received Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedGrns.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No GRN records found.</td></tr>
            ) : paginatedGrns.map((g) => (
              <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900">{g.grnNumber}</td>
                <td className="px-6 py-4 font-semibold text-brand-orange">{g.poNumber}</td>
                <td className="px-6 py-4 font-medium text-slate-800">{g.vendorName}</td>
                <td className="px-6 py-4">{new Date(g.receivedDate).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center px-2 py-1 rounded text-xs font-bold",
                    g.status === 'QC Completed' ? "bg-green-100 text-green-700" :
                    g.status === 'Pending QC' ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-700"
                  )}>
                    {g.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => setSelectedGrn(g)}
                    className="text-brand-orange hover:text-[#e06214] font-medium text-sm inline-flex items-center gap-1"
                  >
                    {g.status === 'Pending QC' ? (
                      <><ClipboardCheck className="w-4 h-4" /> Inspect</>
                    ) : (
                      <><Eye className="w-4 h-4" /> View</>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* QC Detail Form */}
      {selectedGrn && (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden flex flex-col flex-1 mb-6 max-h-[calc(100vh-7rem)]">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50 rounded-t-xl shrink-0">
              <button 
                onClick={() => setSelectedGrn(null)}
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                title="Back to List"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-lg font-bold text-slate-800">GRN Details - {selectedGrn.grnNumber}</h3>
                <p className="text-xs text-slate-500 mt-1">PO: {selectedGrn.poNumber} | Vendor: {selectedGrn.vendorName}</p>
              </div>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6 min-h-0">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">GRN Delivery Checklist</h4>
                <div className="space-y-3">
                  {selectedGrn.items?.map((item: any) => {
                    const hasHold = item.failedQty > 0 || item.status === 'Partial' || item.status === 'Hold' || item.status === 'Failed';
                    return (
                      <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between bg-slate-50/50 p-4 rounded-xl border border-slate-100 gap-3">
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{item.itemName || `Item ID #${item.poItemId}`}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Total Received: <span className="font-bold text-slate-700">{item.quantityReceived} {item.uom || 'Pcs'}</span>
                          </div>
                          {item.remarks && (
                            <div className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 inline-block mt-1">
                              Note: {item.remarks}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.status === 'Pending QC' ? (
                            canApprove && (
                              <button 
                                onClick={() => {
                                  setActiveItemId(item.id);
                                  setIsReinspecting(false);
                                  setPassedQty(item.quantityReceived);
                                  setFailedQty(0);
                                  setRemarks('');
                                }}
                                className="px-4 py-1.5 bg-brand-orange text-white text-xs font-bold rounded hover:bg-[#e06214] shadow-sm transition-colors"
                              >
                                Inspect Item
                              </button>
                            )
                          ) : (
                            <>
                              {item.passedQty > 0 && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-bold bg-green-100 text-green-700">
                                  <CheckCircle className="w-3.5 h-3.5"/>
                                  {item.passedQty} Passed (In Stock)
                                </span>
                              )}
                              {item.failedQty > 0 && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-bold bg-red-100 text-red-700">
                                  <XCircle className="w-3.5 h-3.5"/>
                                  {item.failedQty} Hold
                                </span>
                              )}
                              {canApprove && hasHold && (
                                <button
                                  onClick={() => {
                                    setActiveItemId(item.id);
                                    setIsReinspecting(true);
                                    setReinspectPassedQty(item.failedQty); // Default to passing all held items
                                    setReinspectHoldQty(0);
                                    setRemarks('');
                                  }}
                                  className="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded hover:bg-amber-600 shadow-sm transition-colors"
                                  title="Re-inspect held quantity after replacement or repair"
                                >
                                  Re-inspect Hold ({item.failedQty})
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Inspection / Re-inspection Form Popup Overlay */}
              {activeItemId && activeGrnItem && (
                <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">
                          {isReinspecting ? 'Re-inspect Held Items' : 'QC Audit Form'}
                        </h4>
                        <p className="text-xs text-brand-orange font-semibold">{activeGrnItem.itemName}</p>
                      </div>
                      <div className="text-right">
                        {isReinspecting ? (
                          <span className="text-xs font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">
                            Held to Re-inspect: {activeGrnItem.failedQty} Pcs
                          </span>
                        ) : (
                          <span className="text-xs font-mono bg-slate-200 px-2 py-0.5 rounded font-bold text-slate-700">
                            Total Received: {activeGrnItem.quantityReceived} Pcs
                          </span>
                        )}
                      </div>
                    </div>

                    <form onSubmit={handleInspectSubmit} className="p-6 space-y-4">
                      {isReinspecting ? (
                        <>
                          {/* Re-inspection Context Card */}
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
                            <div className="flex justify-between items-center text-slate-600">
                              <span>Locked & Added to Stock:</span>
                              <span className="font-bold text-emerald-700">🔒 {activeGrnItem.passedQty} Pcs (Ready for Payment)</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600 border-t border-slate-200 pt-1">
                              <span>Currently Held for Audit:</span>
                              <span className="font-bold text-red-600">⚠️ {activeGrnItem.failedQty} Pcs</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Newly Passed Qty</label>
                              <input 
                                type="number" 
                                required
                                min="0"
                                max={activeGrnItem.failedQty}
                                value={reinspectPassedQty}
                                onChange={e => {
                                  const val = Math.min(Math.max(0, parseInt(e.target.value) || 0), activeGrnItem.failedQty);
                                  setReinspectPassedQty(val);
                                  setReinspectHoldQty(activeGrnItem.failedQty - val);
                                }}
                                className="w-full border border-slate-200 rounded p-2 text-sm text-center font-bold text-emerald-700 focus:ring-1 focus:ring-emerald-500" 
                              />
                              <p className="text-[10px] text-slate-400 mt-1">Out of {activeGrnItem.failedQty} held Pcs</p>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Remaining Hold Qty</label>
                              <input 
                                type="number" 
                                required
                                min="0"
                                max={activeGrnItem.failedQty}
                                value={reinspectHoldQty}
                                onChange={e => {
                                  const val = Math.min(Math.max(0, parseInt(e.target.value) || 0), activeGrnItem.failedQty);
                                  setReinspectHoldQty(val);
                                  setReinspectPassedQty(activeGrnItem.failedQty - val);
                                }}
                                className="w-full border border-slate-200 rounded p-2 text-sm text-center font-bold text-red-600 focus:ring-1 focus:ring-red-500" 
                              />
                              <p className="text-[10px] text-slate-400 mt-1">Stays on hold</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Passed Qty</label>
                            <input 
                              type="number" 
                              required
                              min="0"
                              max={activeGrnItem.quantityReceived}
                              value={passedQty}
                              onChange={e => {
                                const passed = Math.min(Math.max(0, parseInt(e.target.value) || 0), activeGrnItem.quantityReceived);
                                setPassedQty(passed);
                                setFailedQty(activeGrnItem.quantityReceived - passed);
                              }}
                              className="w-full border border-slate-200 rounded p-2 text-sm text-center font-bold text-emerald-700 focus:ring-1 focus:ring-emerald-500" 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Hold / Defect Qty</label>
                            <input 
                              type="number" 
                              required
                              min="0"
                              max={activeGrnItem.quantityReceived}
                              value={failedQty}
                              onChange={e => {
                                const failed = Math.min(Math.max(0, parseInt(e.target.value) || 0), activeGrnItem.quantityReceived);
                                setFailedQty(failed);
                                setPassedQty(activeGrnItem.quantityReceived - failed);
                              }}
                              className="w-full border border-slate-200 rounded p-2 text-sm text-center font-bold text-red-600 focus:ring-1 focus:ring-red-500" 
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                          {isReinspecting ? 'Re-inspection Audit Notes' : 'Remarks / Audit Note'}
                        </label>
                        <textarea 
                          value={remarks}
                          onChange={e => setRemarks(e.target.value)}
                          placeholder={isReinspecting ? "e.g. Vendor provided 2 replacement units, verified OK" : "e.g. 2 units had broken packaging or defect"}
                          className="w-full border border-slate-200 rounded p-2 text-sm" 
                          rows={2}
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 mt-2">
                        <button 
                          type="button" 
                          onClick={() => {
                            setActiveItemId(null);
                            setIsReinspecting(false);
                          }}
                          className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          disabled={isSubmitting}
                          className="px-5 py-2.5 bg-brand-orange text-white rounded-lg text-sm font-bold hover:bg-[#e06214] inline-flex items-center shadow-sm transition-colors disabled:opacity-50"
                        >
                          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                          {isSubmitting ? 'Saving...' : (isReinspecting ? 'Submit Re-inspection' : 'Submit QC Result')}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
      )}

      {/* Create GRN Form */}
      {showCreateModal && (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden flex flex-col flex-1 mb-6">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50 rounded-t-xl">
              <button 
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedPo(null);
                  setSelectedPoId('');
                }} 
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                title="Back to List"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-slate-800">Receive Goods Delivery</h3>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Select Approved Purchase Order</label>
                <select 
                  value={selectedPoId} 
                  onChange={e => handlePoSelect(e.target.value)} 
                  required 
                  className="block w-full rounded-md border-slate-200 p-2 border bg-white text-sm"
                >
                  <option value="">Select...</option>
                  {pos.filter(p => {
                    // Exclude POs that already have a GRN created or are delivered/completed
                    const hasGrn = grns.some((g: any) => g.poId === p.id || g.poNumber === p.poNumber);
                    const isDeliveredOrClosed = p.status === 'Delivered' || p.status === 'Completed' || p.status === 'Closed';
                    return !hasGrn && !isDeliveredOrClosed;
                  }).map(p => {
                    const wo = workOrders.find((w: any) => w.poId === p.id || w.csId === p.csId);
                    const isWoSigned = wo ? (wo.status === 'Signed & Active' && Boolean(wo.signedFileUrl)) : true;
                    const itemSummary = p.items && p.items.length > 0 
                      ? ` - ${p.items.map((i: any) => `${i.itemName} (${i.quantity} ${i.uom || 'Pcs'})`).join(', ')}`
                      : '';
                    return (
                      <option key={p.id} value={p.id} disabled={!isWoSigned}>
                        {!isWoSigned ? `🔒 [Signed WO Required] ` : ''}{p.poNumber} — Vendor: {p.vendorName} ({currencySymbol}{Number(p.totalAmount).toLocaleString()}){itemSummary}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Select Receiving Warehouse</label>
                <select 
                  value={selectedWarehouseId} 
                  onChange={e => setSelectedWarehouseId(e.target.value)} 
                  required 
                  className="block w-full rounded-md border-slate-200 p-2 border bg-white text-sm"
                >
                  <option value="">-- Select Destination --</option>
                  {warehouses.filter((w: any) => w.status === 'Active').map((w: any) => <option key={w.id} value={w.id}>{w.name} ({w.location})</option>)}
                </select>
              </div>

              {selectedPo && (
                <form onSubmit={handleCreateGrn} className="space-y-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Receive Quantities</h4>
                  <div className="space-y-3">
                    {selectedPo.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{item.itemName}</div>
                          <div className="text-xs text-slate-500">Ordered Qty: {item.quantity} {item.uom}</div>
                        </div>
                        <div className="w-32">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Received Qty</label>
                          <input 
                            type="number" 
                            required
                            min="0"
                            max={item.quantity}
                            value={receiveQtys[item.id] ?? ''}
                            onChange={e => setReceiveQtys(prev => ({
                              ...prev,
                              [item.id]: parseInt(e.target.value) || 0
                            }))}
                            className="w-full border border-slate-200 rounded p-1.5 bg-white text-sm text-center font-bold text-slate-800" 
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowCreateModal(false);
                        setSelectedPo(null);
                        setSelectedPoId('');
                      }}
                      className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="px-5 py-2.5 bg-brand-orange text-white rounded-lg text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors disabled:opacity-50"
                    >
                      Create GRN
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

