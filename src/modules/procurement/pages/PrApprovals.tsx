import React from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { CheckCircle, XCircle, Eye, Truck, ShoppingCart, ArrowLeft } from 'lucide-react';
import { cn } from '@/src/shared/lib/utils';
import PageLayout from '@/src/shared/components/PageLayout';

export default function PrApprovals() {
  const { getToken, dbUser, permissions } = useAuth();
  const [loading, setLoading] = useState(true);
  // PR approvals
  const [prs, setPrs] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals & comments
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [actionModal, setActionModal] = useState<{ id: number, docType: 'PR' | 'CS' | 'PO', action: 'Approved' | 'Rejected' } | null>(null);
  const [comments, setComments] = useState('');
  
  const [fulfillmentMode, setFulfillmentMode] = useState(false);
  const [fulfillmentData, setFulfillmentData] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouseStock, setWarehouseStock] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');

  const closeModal = () => {
    setSelectedItem(null);
    setFulfillmentMode(false);
    setPrCreationMode(false);
  };

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const approvalPerms = permissions?.find((p: any) => p.module === 'Requisition Approval') || {};
  const canApprove = isSuperAdmin || approvalPerms.canApprove;
  const canCreate = isSuperAdmin || approvalPerms.canCreate;

  const [prCreationMode, setPrCreationMode] = useState(false);
  const [prCreationData, setPrCreationData] = useState<{
    procurementMethod: string;
    items: any[];
  }>({ procurementMethod: '', items: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const [prsData, whData, whStockData] = await Promise.all([
        fetchWithAuth('/api/pr/approvals', token),
        fetchWithAuth('/api/my-warehouses', token),
        fetchWithAuth('/api/inventory/warehouse-stock', token)
      ]);
      setPrs(prsData);
      setWarehouses(whData || []);
      if (whData?.length > 0) {
        setSelectedWarehouseId(String(whData[0].id));
      }
      setWarehouseStock(whStockData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [getToken]);

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal) return;

    try {
      const token = await getToken();
      await fetchWithAuth(`/api/pr/approvals/${actionModal.id}`, token, {
        method: 'POST',
        body: JSON.stringify({ status: actionModal.action, comments })
      });
      setActionModal(null);
      setComments('');
      setSelectedItem(null);
      loadData();
    } catch (error) {
      console.error(error);
      alert("Verification failed. Ensure you have the correct workflow role.");
    }
  };

  const handleFulfillClick = () => {
    setFulfillmentMode(true);
    setFulfillmentData(selectedItem.items.map((i: any) => ({
      ...i,
      issueQuantity: 0,
      prQuantity: i.quantity - (i.deliveredQuantity || 0) - (i.prCreatedQuantity || 0),
      deliveredQuantity: i.deliveredQuantity || 0,
      prCreatedQuantity: i.prCreatedQuantity || 0,
    })));
  };

  const handleIssueQtyChange = (index: number, val: string) => {
    const parsed = parseInt(val) || 0;
    const item = fulfillmentData[index];
    const pendingQty = item.quantity - item.deliveredQuantity - item.prCreatedQuantity;
    
    // Calculate stock from selected warehouse
    const whStockItem = warehouseStock.find(ws => ws.itemId === item.itemId && ws.warehouseId === parseInt(selectedWarehouseId));
    const whAvailableStock = whStockItem?.quantity || 0;
    
    const maxAllowed = Math.min(pendingQty, whAvailableStock);
    const qty = Math.min(Math.max(0, parsed), maxAllowed);
    
    const newData = [...fulfillmentData];
    newData[index].issueQuantity = qty;
    // Auto-adjust PR qty to the remaining balance
    newData[index].prQuantity = pendingQty - qty;
    setFulfillmentData(newData);
  };

  const handlePrQtyChange = (index: number, val: string) => {
    const parsed = parseInt(val) || 0;
    const item = fulfillmentData[index];
    const pendingQty = item.quantity - item.deliveredQuantity - item.prCreatedQuantity;
    const maxAllowed = pendingQty - item.issueQuantity;
    const qty = Math.min(Math.max(0, parsed), maxAllowed);
    
    const newData = [...fulfillmentData];
    newData[index].prQuantity = qty;
    setFulfillmentData(newData);
  };

  const submitFulfillment = async () => {
    try {
      if (!selectedWarehouseId) {
        alert("Please select a warehouse first.");
        return;
      }
      setIsSubmitting(true);
      const token = await getToken();
      await fetchWithAuth(`/api/pr/fulfill/${selectedItem.id}`, token, {
        method: 'POST',
        body: JSON.stringify({ items: fulfillmentData, warehouseId: selectedWarehouseId })
      });
      closeModal();
      loadData();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to fulfill requisition.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePrClick = () => {
    setPrCreationMode(true);
    setFulfillmentMode(false);
    const remainingItems = selectedItem.items
      .filter((i: any) => i.quantity - (i.deliveredQuantity || 0) - (i.prCreatedQuantity || 0) > 0)
      .map((i: any) => ({
        ...i,
        prQuantity: i.quantity - (i.deliveredQuantity || 0) - (i.prCreatedQuantity || 0),
        estimatedPrice: ''
      }));
    setPrCreationData({ procurementMethod: '', items: remainingItems });
  };

  const submitPrCreation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const token = await getToken();
      await fetchWithAuth(`/api/pr`, token, {
        method: 'POST',
        body: JSON.stringify({
          sourceIrId: selectedItem.id,
          documentType: 'Purchase Requisition',
          requestor: selectedItem.requestor,
          department: selectedItem.department,
          costCenter: selectedItem.costCenter,
          priority: selectedItem.priority,
          justification: selectedItem.justification,
          isDraft: false,
          procurementMethod: prCreationData.procurementMethod,
          estimatedCost: prCreationData.items.reduce((s: number, i: any) => s + (Number(i.estimatedPrice) || 0) * (Number(i.prQuantity) || 0), 0),
          items: prCreationData.items.map((i: any) => ({
            itemId: i.itemId,
            itemName: i.itemName,
            category: i.category,
            quantity: i.prQuantity,
            uom: i.uom,
            estimatedPrice: i.estimatedPrice
          }))
        })
      });
      
      // Update original IR to mark these items as PR created
      await fetchWithAuth(`/api/pr/fulfill/${selectedItem.id}`, token, {
         method: 'POST',
         body: JSON.stringify({ items: prCreationData.items, warehouseId: selectedWarehouseId || undefined }) // only prQuantity is non-zero
      });

      closeModal();
      loadData();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to create Purchase Requisition.");
    } finally {
      setIsSubmitting(false);
    }
  };


  const filteredPrs = prs.filter(pr => 
    (pr.prNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (pr.requestor?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
  );
  const paginatedPrs = filteredPrs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);



  const getPaginationConfig = () => {
    return { currentPage, totalPages: Math.ceil(filteredPrs.length / itemsPerPage), onPageChange: setCurrentPage };
  };

  return (
    <PageLayout
      loading={loading}
      search={{ placeholder: "Search Requisitions...", onSearch: setSearchQuery }}
      pagination={getPaginationConfig()}
    >
    <div className="space-y-6 flex flex-col h-full">
      {!selectedItem && (
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extrabold text-brand-charcoal">Item Req. by User</h1>
        <p className="text-sm text-slate-500 mt-1">Review and process requisitions currently going through approval workflows</p>
      </div>
      )}

      {!selectedItem && (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-left">
            <tr className="bg-slate-50 border-y border-slate-200">
              <th className="p-4 font-bold text-slate-500 uppercase tracking-wider">IR Number</th>
              <th className="p-4 font-bold text-slate-500 uppercase tracking-wider">Requestor</th>
              <th className="p-4 font-bold text-slate-500 uppercase tracking-wider">Department</th>
              <th className="p-4 font-bold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="p-4 font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="p-4 font-bold text-slate-500 uppercase tracking-wider">Delivery Status</th>
              <th className="p-4 font-bold text-slate-500 uppercase tracking-wider">Fulfillment</th>
              <th className="p-4 text-right font-bold text-slate-500 uppercase tracking-wider w-32">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedPrs.length === 0 ? (
              <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">No requisitions found.</td></tr>
            ) : paginatedPrs.map((pr) => {
              return (
                <tr key={pr.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-medium text-slate-800">{pr.prNumber}</td>
                  <td className="p-4">{pr.requestor}</td>
                  <td className="p-4 text-slate-600">{pr.department}</td>
                  <td className="p-4 text-slate-600">{new Date(pr.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-semibold border",
                      pr.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      pr.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                      pr.status === 'Draft' ? 'bg-slate-50 text-slate-700 border-slate-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    )}>
                      {pr.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-semibold border",
                      pr.deliveryStatus === 'Fully Delivered' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                      pr.deliveryStatus === 'Partially Delivered' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      pr.deliveryStatus === 'PR Created' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      'bg-slate-50 text-slate-700 border-slate-200'
                    )}>
                      {pr.deliveryStatus}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {pr.items.reduce((s: number, i: any) => s + (i.deliveredQuantity || 0) + (i.prCreatedQuantity || 0), 0)} / {pr.items.reduce((s: number, i: any) => s + i.quantity, 0)}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setSelectedItem({ ...pr, docType: 'PR' })}
                      className="text-brand-orange hover:text-[#e06214] font-medium text-sm inline-flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" /> View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* Details View Form */}
      {selectedItem && !actionModal && (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden flex flex-col flex-1 mb-6">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50 rounded-t-xl">
              <button onClick={closeModal} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors" title="Back to List">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-xl font-extrabold text-slate-800">
                  {selectedItem.prNumber}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Review details and approval steps</p>
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {!prCreationMode && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Requestor</div>
                    <div className="text-sm font-semibold text-slate-800">{selectedItem.requestor}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Department</div>
                    <div className="text-sm font-semibold text-slate-800">{selectedItem.department}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Priority</div>
                    <div className="text-sm font-semibold text-slate-800">{selectedItem.priority}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase mb-1">Justification</div>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded">{selectedItem.justification || 'N/A'}</p>
                </div>
              </div>
              )}

              {fulfillmentMode ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-800">Fulfillment & Delivery</h4>
                    
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-600 uppercase">Select Warehouse</label>
                      <select
                        value={selectedWarehouseId}
                        onChange={(e) => {
                           setSelectedWarehouseId(e.target.value);
                           const resetData = fulfillmentData.map(item => ({...item, issueQuantity: 0}));
                           setFulfillmentData(resetData);
                        }}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                        required
                      >
                        <option value="">-- Choose Warehouse --</option>
                        {warehouses.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-4">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        <tr>
                          <th className="p-3">Item Name</th>
                          <th className="p-3 text-right">Req. Qty</th>
                          <th className="p-3 text-right text-emerald-600">Delivered</th>
                          <th className="p-3 text-right text-brand-blue">In Stock (WH)</th>
                          <th className="p-3 text-center">Issue Qty</th>
                          <th className="p-3 text-center">PR Qty</th>
                          <th className="p-3 text-right text-amber-600">Pending</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {fulfillmentData.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3 font-medium text-slate-800">
                              {item.itemName}
                              <div className="flex gap-1 mt-1">
                                {item.isAdminItem && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">ADMIN</span>}
                                {item.isItItem && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold">IT</span>}
                              </div>
                            </td>
                            <td className="p-3 text-right font-semibold">{item.quantity}</td>
                            <td className="p-3 text-right text-emerald-600 font-bold">
                              {item.deliveredQuantity || 0} {item.uom}
                            </td>
                            <td className="p-3 text-right text-brand-blue font-bold">
                              {warehouseStock.find(ws => ws.itemId === item.itemId && ws.warehouseId === parseInt(selectedWarehouseId))?.quantity || 0} {item.uom}
                            </td>
                            <td className="p-3">
                              <div className="flex justify-center">
                                {(() => {
                                   const selectedWh = warehouses.find(w => String(w.id) === selectedWarehouseId);
                                   const itemType = selectedWh?.itemType || 'None';
                                   let hasPermission = false;
                                   if (itemType === 'Both') hasPermission = true;
                                   else if (item.isAdminItem && itemType === 'Admin') hasPermission = true;
                                   else if (item.isItItem && itemType === 'IT') hasPermission = true;

                                   if (!hasPermission) {
                                      return <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded">No Permission</span>;
                                   }

                                   return (
                                     <input
                                       type="number"
                                       min="0"
                                       max={Math.min(item.quantity - (item.deliveredQuantity || 0) - (item.prCreatedQuantity || 0), warehouseStock.find(ws => ws.itemId === item.itemId && ws.warehouseId === parseInt(selectedWarehouseId))?.quantity || 0)}
                                       value={item.issueQuantity}
                                       onChange={(e) => handleIssueQtyChange(idx, e.target.value)}
                                       className="w-20 px-2 py-1 border border-slate-300 rounded text-center text-sm focus:ring-1 focus:ring-brand-orange"
                                     />
                                   );
                                })()}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              {(() => {
                                 const selectedWh = warehouses.find(w => String(w.id) === selectedWarehouseId);
                                 const itemType = selectedWh?.itemType || 'None';
                                 let hasPermission = false;
                                 if (itemType === 'Both') hasPermission = true;
                                 else if (item.isAdminItem && itemType === 'Admin') hasPermission = true;
                                 else if (item.isItItem && itemType === 'IT') hasPermission = true;

                                 if (!hasPermission) return <span className="text-slate-300">-</span>;

                                 return (
                                   <input 
                                     type="number" 
                                     min="0" 
                                     max={(item.quantity - item.deliveredQuantity - item.prCreatedQuantity) - item.issueQuantity}
                                     value={item.prQuantity}
                                     onChange={(e) => handlePrQtyChange(idx, e.target.value)}
                                     className="w-20 px-2 py-1 border border-slate-300 rounded text-center text-sm focus:ring-1 focus:ring-brand-blue"
                                   />
                                 );
                              })()}
                            </td>
                            <td className="p-3 text-right font-bold text-amber-600">
                              {(item.quantity - (item.deliveredQuantity || 0) - (item.prCreatedQuantity || 0)) - item.issueQuantity - item.prQuantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : prCreationMode ? (
                <form id="pr-create-form" onSubmit={submitPrCreation} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Procurement Method</label>
                    <select
                      required
                      value={prCreationData.procurementMethod}
                      onChange={e => setPrCreationData({...prCreationData, procurementMethod: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option value="">-- Select Method --</option>
                      <option value="Single Quotation">Single Quotation</option>
                      <option value="Minimum 3 Quotations">Minimum 3 Quotations</option>
                      <option value="RFQ with CS">RFQ with CS</option>
                      <option value="Tender/RFP">Tender/RFP</option>
                    </select>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-3">Items for Purchase Requisition</h4>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left bg-white text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          <tr>
                            <th className="p-3">Item Name</th>
                            <th className="p-3 text-center">PR Qty</th>
                            <th className="p-3">UOM</th>
                            <th className="p-3 w-32">Est. Unit Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {prCreationData.items.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-3 font-medium text-slate-850">
                                {item.itemName}
                              </td>
                              <td className="p-3 text-center font-semibold">
                                <input
                                  type="number"
                                  min="1"
                                  max={item.quantity - (item.deliveredQuantity || 0) - (item.prCreatedQuantity || 0)}
                                  required
                                  value={item.prQuantity}
                                  onChange={e => {
                                    const newData = [...prCreationData.items];
                                    newData[idx].prQuantity = Number(e.target.value);
                                    setPrCreationData({...prCreationData, items: newData});
                                  }}
                                  className="w-20 px-2 py-1 border border-slate-200 rounded text-center text-xs"
                                />
                              </td>
                              <td className="p-3 text-slate-500">{item.uom}</td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  required
                                  placeholder="0.00"
                                  value={item.estimatedPrice}
                                  onChange={e => {
                                    const newData = [...prCreationData.items];
                                    newData[idx].estimatedPrice = e.target.value;
                                    setPrCreationData({...prCreationData, items: newData});
                                  }}
                                  className="w-full px-2 py-1 border border-slate-200 rounded text-right text-xs focus:ring-1 focus:ring-brand-blue"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </form>
              ) : (
                <>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-3">Requisition Items</h4>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left bg-white text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          <tr>
                            <th className="p-3">Category</th>
                            <th className="p-3">Item Name</th>
                            <th className="p-3 text-right">Qty</th>
                            <th className="p-3">UOM</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedItem.items?.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-3 text-slate-650">{item.category}</td>
                              <td className="p-3 font-medium text-slate-850">
                                {item.itemName}
                                <div className="flex gap-1 mt-1">
                                  {item.isAdminItem && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">ADMIN</span>}
                                  {item.isItItem && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold">IT</span>}
                                </div>
                              </td>
                              <td className="p-3 text-right font-semibold">{item.quantity}</td>
                              <td className="p-3 text-slate-500">{item.uom}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-3">Approval Workflow Steps</h4>
                    <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                      {selectedItem.approvals?.map((appr: any, idx: number) => (
                        <div key={idx} className="p-4 flex items-center justify-between text-sm hover:bg-slate-50">
                          <div>
                            <div className="font-bold text-slate-800">Step {appr.stepOrder}: {appr.roleRequired}</div>
                            {appr.comments && (
                              <div className="text-xs text-slate-500 mt-1">Comment: "{appr.comments}"</div>
                            )}
                          </div>
                          <div>
                            <span className={`px-2.5 py-1 text-xs font-bold rounded ${
                              appr.status === 'Approved' ? 'bg-green-100 text-green-700' :
                              appr.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>{appr.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 rounded-b-xl">
                {!fulfillmentMode && !prCreationMode && selectedItem.status === 'Approved' && selectedItem.deliveryStatus !== 'Fully Delivered' && canCreate && (
                  <>
                    <button
                      onClick={handleFulfillClick}
                      className="px-4 py-2 bg-brand-orange text-white rounded-lg text-sm font-bold hover:bg-[#e06214] shadow-sm flex items-center gap-2"
                    >
                      <Truck className="w-4 h-4" /> Fulfill Requisition
                    </button>
                    {selectedItem.items.some((i: any) => i.quantity - (i.deliveredQuantity || 0) - (i.prCreatedQuantity || 0) > 0) && (
                      <button
                        onClick={handleCreatePrClick}
                        className="px-4 py-2 bg-brand-blue text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm flex items-center gap-2"
                      >
                        <ShoppingCart className="w-4 h-4" /> Create PR
                      </button>
                    )}
                  </>
                )}
                {fulfillmentMode && (
                  <button 
                    onClick={submitFulfillment}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-brand-orange text-white rounded-lg text-sm font-bold hover:bg-[#e06214] shadow-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Confirming...' : 'Confirm & Complete'}
                  </button>
                )}
                {prCreationMode && (
                  <button 
                    type="submit"
                    form="pr-create-form"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-brand-blue text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Purchase Requisition'}
                  </button>
                )}
              <button onClick={closeModal} className="px-6 py-2 border border-slate-200 bg-white rounded-lg text-sm font-bold text-slate-650 hover:bg-slate-50">
                {(fulfillmentMode || prCreationMode) ? 'Cancel' : 'Close'}
              </button>
            </div>
          </div>
      )}
    </div>
    </PageLayout>
  );
}
