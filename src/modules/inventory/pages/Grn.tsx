import React from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Plus, Eye, Truck, ClipboardCheck, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
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
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  
  // QC Inspection states
  const [selectedGrn, setSelectedGrn] = useState<any>(null);
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const [passedQty, setPassedQty] = useState<number>(0);
  const [failedQty, setFailedQty] = useState<number>(0);
  const [remarks, setRemarks] = useState('');

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
      const [grnData, poData, whData] = await Promise.all([
        fetchWithAuth('/api/grn', token),
        fetchWithAuth('/api/purchase', token),
        fetchWithAuth('/api/warehouses', token)
      ]);
      setGrns(grnData);
      setPos(poData.filter((p: any) => p.status === 'Approved'));
      setWarehouses(whData);
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
    setSelectedPo(po);
    const initialQtys: any = {};
    po?.items?.forEach((i: any) => {
      initialQtys[i.id] = i.quantity; // Default to full pending quantity
    });
    setReceiveQtys(initialQtys);
  };

  const handleCreateGrn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPo) return;
    try {
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
    }
  };

  const handleInspectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItemId) return;
    try {
      const token = await getToken();
      await fetchWithAuth('/api/qc/inspection', token, {
        method: 'POST',
        body: JSON.stringify({
          grnItemId: activeItemId,
          inspectedQty: passedQty + failedQty,
          passedQty,
          failedQty,
          remarks
        })
      });
      setActiveItemId(null);
      setPassedQty(0);
      setFailedQty(0);
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
      pagination={{ currentPage, totalPages, onPageChange: setCurrentPage }}
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
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No GRN records found.</td></tr>
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
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden flex flex-col flex-1 mb-6">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50 rounded-t-xl">
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
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">GRN Delivery Checklist</h4>
                <div className="space-y-3">
                  {selectedGrn.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                      <div>
                        <div className="font-bold text-slate-800 text-sm">Item ID #{item.poItemId}</div>
                        <div className="text-xs text-slate-500">Qty Received: <span className="font-semibold text-slate-700">{item.quantityReceived}</span></div>
                      </div>
                      <div className="flex gap-2">
                        {item.status === 'Pending QC' ? (
                          canApprove && (
                            <button 
                              onClick={() => {
                                setActiveItemId(item.id);
                                setPassedQty(item.quantityReceived);
                                setFailedQty(0);
                              }}
                              className="px-4 py-1.5 bg-brand-orange text-white text-xs font-bold rounded hover:bg-[#e06214]"
                            >
                              Inspect Item
                            </button>
                          )
                        ) : (
                          <span className={cn(
                            "inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-bold",
                            item.status === 'Passed' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          )}>
                            {item.status === 'Passed' ? <CheckCircle className="w-3.5 h-3.5"/> : <XCircle className="w-3.5 h-3.5"/>}
                            {item.status === 'Failed' ? 'Hold' : item.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inspection Form Popup Overlay */}
              {activeItemId && (
                <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
                    <div className="p-4 bg-slate-50 border-b border-slate-100">
                      <h4 className="font-bold text-slate-800 text-sm">QC Audit Form</h4>
                    </div>
                    <form onSubmit={handleInspectSubmit} className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Passed Quantity</label>
                          <input 
                            type="number" 
                            required
                            min="0"
                            value={passedQty}
                            onChange={e => setPassedQty(parseInt(e.target.value) || 0)}
                            className="w-full border border-slate-200 rounded p-2 text-sm text-center font-bold" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Hold Qty</label>
                          <input 
                            type="number" 
                            required
                            min="0"
                            value={failedQty}
                            onChange={e => setFailedQty(parseInt(e.target.value) || 0)}
                            className="w-full border border-slate-200 rounded p-2 text-sm text-center font-bold text-red-600" 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Remarks / Audit Note</label>
                        <textarea 
                          value={remarks}
                          onChange={e => setRemarks(e.target.value)}
                          placeholder="e.g. 2 units had broken packaging"
                          className="w-full border border-slate-200 rounded p-2 text-sm" 
                          rows={2}
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button 
                          type="button" 
                          onClick={() => setActiveItemId(null)}
                          className="px-4 py-2 border border-slate-200 rounded text-sm font-bold text-slate-600"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214]"
                        >
                          Submit QC Result
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
                  {pos.map(p => <option key={p.id} value={p.id}>{p.poNumber} - {p.vendorName} ({currencySymbol}{Number(p.totalAmount).toLocaleString()})</option>)}
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

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowCreateModal(false);
                        setSelectedPo(null);
                        setSelectedPoId('');
                      }}
                      className="px-4 py-2 border border-slate-200 rounded text-sm font-bold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214]"
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

