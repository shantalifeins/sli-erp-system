import { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Plus, Trash2, Edit, Eye, X, ArrowLeft } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import PageLayout from '@/src/shared/components/PageLayout';
import { usePluginSettings } from '@/src/shared/hooks/usePluginSettings';

export default function PurchaseRequisitions() {
  const location = useLocation();
  const isItemRequisition = location.pathname.startsWith('/item-requisition');
  const documentType = isItemRequisition ? 'Item Requisition' : 'Purchase Request';

  const { getToken, dbUser, permissions } = useAuth();
  const [prs, setPrs] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editPr, setEditPr] = useState<any | null>(null);
  const [editPrId, setEditPrId] = useState<number | null>(null);
  const [selectedPrDetails, setSelectedPrDetails] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const itemsPerPage = 10;

  // Phase 4: Retrieve custom settings for the procurement plugin
  const procurementSettings = usePluginSettings('procurement');
  const maxPrAmount = procurementSettings?.max_pr_amount;
  const requireQc = procurementSettings?.require_qc !== false; // Defaults to true if undefined

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const permissionModule = isItemRequisition ? 'Item Requisitions' : 'Purchase Requisitions';
  const prPerms = permissions?.find((p: any) => p.module === permissionModule) || {};
  const canCreate = isSuperAdmin || prPerms.canCreate;
  const canEdit = isSuperAdmin || prPerms.canEdit;
  const canDelete = isSuperAdmin || prPerms.canDelete;
  const canApprove = isSuperAdmin || prPerms.canApprove;

  const defaultFormValues = {
    department: dbUser?.department || '',
    priority: 'Normal',
    estimatedCost: 0,
    justification: '',
    items: [{ itemId: '', itemName: '', category: '', quantity: 1, uom: 'Pcs', estimatedPrice: 0 }]
  };

  const { register, control, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: defaultFormValues
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const loadData = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const type = isItemRequisition ? 'IR' : 'PR';
      const [prsData, invData, catData] = await Promise.all([
        fetchWithAuth(`/api/pr?type=${type}`, token),
        fetchWithAuth('/api/inventory', token),
        fetchWithAuth('/api/inventory/categories', token)
      ]);
      setPrs(prsData);
      setInventoryItems(invData);
      setCategories(catData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [getToken]);

  const handleItemSelect = (index: number, itemId: string) => {
    if (!itemId) {
      (setValue as any)(`items.${index}.itemName`, '');
      (setValue as any)(`items.${index}.uom`, 'Pcs');
      return;
    }
    const selectedItem = inventoryItems.find(i => i.id.toString() === itemId);
    if (selectedItem) {
      (setValue as any)(`items.${index}.itemName`, selectedItem.name);
      (setValue as any)(`items.${index}.category`, selectedItem.category);
      (setValue as any)(`items.${index}.uom`, selectedItem.uom);
    }
  };

  const handleCategorySelect = (index: number, categoryName: string) => {
    (setValue as any)(`items.${index}.category`, categoryName);
    (setValue as any)(`items.${index}.itemId`, '');
    (setValue as any)(`items.${index}.itemName`, '');
  };

  const onSubmit = async (data: any, isDraft: boolean) => {
    // Validate mixed items
    let hasAdmin = false;
    let hasIT = false;
    
    for (const formItem of data.items) {
      if (formItem.itemId) {
        const itemDetail = inventoryItems.find(i => i.id === parseInt(formItem.itemId));
        if (itemDetail) {
          if (itemDetail.isAdminItem) hasAdmin = true;
          if (itemDetail.isItItem) hasIT = true;
        }
      }
    }

    if (hasAdmin && hasIT) {
      alert("You cannot mix Admin and IT items in the same Requisition. Please create separate requests.");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = await getToken();
      const payload = {
        ...data,
        requestor: dbUser?.email,
        isDraft,
        documentType
      };

      if (editPrId) {
        await fetchWithAuth(`/api/pr/${editPrId}`, token, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchWithAuth('/api/pr', token, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      closeForm();
      loadData();
    } catch (error) {
      console.error("Failed to submit Item Requisition", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (pr: any) => {
    setEditPrId(pr.id);
    setEditPr(pr);
    reset({
      department: pr.department || '',
      priority: pr.priority || 'Normal',
      estimatedCost: parseFloat(pr.estimatedCost || '0'),
      justification: pr.justification || '',
      items: pr.items?.length > 0 ? pr.items.map((i: any) => ({
        itemId: i.itemId || '',
        itemName: i.itemName,
        category: i.category || '',
        quantity: i.quantity,
        uom: i.uom,
        estimatedPrice: i.estimatedPrice || 0
      })) : defaultFormValues.items
    });
    setShowForm(true);
  };

  const closeForm = () => {
    reset(defaultFormValues);
    setEditPrId(null);
    setEditPr(null);
    setShowForm(false);
  };

  const filteredPrs = prs.filter(pr => 
    (pr.prNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || '') || 
    (pr.department?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (pr.requestor?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
  );
  const totalPages = Math.ceil(filteredPrs.length / itemsPerPage);
  const paginatedPrs = filteredPrs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <PageLayout 
      loading={loading}
      search={{ placeholder: "Search requisitions...", onSearch: setSearchQuery }}
      pagination={{ currentPage, totalPages, onPageChange: setCurrentPage }}
    >
      <div className="space-y-6 flex flex-col h-full">
        {!showForm && !selectedPrDetails && (
        <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800">All Requisitions</h2>
        {canCreate && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors"
          >
            <Plus className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
            Create Request
          </button>
        )}
      </div>
        )}

      {showForm && canCreate && (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden mb-6">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-3">
            <button onClick={closeForm} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors" title="Back to List">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-800">
              {editPrId ? 'Edit Draft Requisition' : 'New Item Requisition'}
            </h3>
          </div>
          <div className="p-6">

          {editPr?.approvals && editPr.approvals.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-bold text-slate-800 mb-2">Review & Approval History</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                {editPr.approvals.map((appr: any, idx: number) => (
                  <div key={idx} className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs ${appr.status === 'Review' ? 'bg-amber-50/50' : appr.status === 'Rejected' ? 'bg-red-50/50' : 'bg-slate-50/30'} hover:bg-slate-50`}>
                    <div>
                      <div className="font-bold text-slate-800">Step {appr.stepOrder}: {appr.roleRequired}</div>
                      {appr.comments && (
                        <div className="text-xs text-slate-700 font-medium mt-1 p-2 bg-white rounded border border-slate-100 shadow-sm">
                          <span className="text-slate-400 mr-1">Note:</span>"{appr.comments}"
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 mt-1">
                        {new Date(appr.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-2 sm:mt-0">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        appr.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        appr.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        appr.status === 'Review' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {appr.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form className="space-y-6">
            
            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Requested By</label>
                <input value={dbUser?.email?.split('@')[0] || ''} readOnly className="block w-full rounded-md border-slate-200 shadow-sm bg-slate-100 text-slate-500 sm:text-sm border p-2 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Department</label>
                <input {...register("department")} readOnly className="block w-full rounded-md border-slate-200 shadow-sm bg-slate-100 text-slate-500 sm:text-sm border p-2 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Priority</label>
                <select {...register("priority")} className="block w-full rounded-md border-slate-200 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm border p-2 bg-white">
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Justification</label>
                <textarea {...register("justification")} rows={2} required className="block w-full rounded-md border-slate-200 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm border p-2"></textarea>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-bold text-slate-800">Requisition Items</h4>
                <button type="button" onClick={() => append({ itemId: '', itemName: '', category: '', quantity: 1, uom: 'Pcs', estimatedPrice: 0 })} className="text-xs font-bold text-brand-orange hover:text-blue-800">
                  + Add Row
                </button>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left bg-white">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <tr>
                      <th className="p-2">Category</th>
                      <th className="p-2">Inventory Item</th>
                      <th className="p-2">Item Name (Manual)</th>
                      <th className="p-2 w-20">Qty</th>
                      <th className="p-2 w-24">UOM</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fields.map((item, index) => {
                      const rowCategory = watch(`items.${index}.category`);
                      const filteredInventory = rowCategory 
                        ? inventoryItems.filter(i => i.category === rowCategory)
                        : inventoryItems;
                      return (
                        <tr key={item.id}>
                          <td className="p-2">
                            <select 
                              {...register(`items.${index}.category`)}
                              onChange={(e) => {
                                register(`items.${index}.category`).onChange(e);
                                handleCategorySelect(index, e.target.value);
                              }}
                              className="block w-full rounded border-slate-200 text-xs border p-1.5"
                            >
                              <option value="">-- Select Category --</option>
                              {categories.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <select 
                              {...register(`items.${index}.itemId`)} 
                              onChange={(e) => {
                                register(`items.${index}.itemId`).onChange(e);
                                handleItemSelect(index, e.target.value);
                              }}
                              className="block w-full rounded border-slate-200 text-xs border p-1.5"
                            >
                              <option value="">-- Custom Item --</option>
                              {filteredInventory.map(inv => (
                                <option key={inv.id} value={inv.id}>
                                  {inv.itemCode} - {inv.name} {inv.isAdminItem ? '(Admin)' : ''} {inv.isItItem ? '(IT)' : ''}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2"><input {...register(`items.${index}.itemName`)} required className="block w-full rounded border-slate-200 text-xs border p-1.5" /></td>
                          <td className="p-2"><input type="number" {...register(`items.${index}.quantity`)} required min="1" className="block w-full rounded border-slate-200 text-xs border p-1.5" /></td>
                          <td className="p-2"><input {...register(`items.${index}.uom`)} readOnly className="block w-full rounded border-slate-200 bg-slate-50 text-slate-500 text-xs border p-1.5 cursor-not-allowed" /></td>
                          <td className="p-2 text-center">
                            <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={closeForm} className="px-4 py-2 border border-slate-200 shadow-sm text-sm font-bold rounded text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button 
                type="button" 
                disabled={isSubmitting}
                onClick={handleSubmit((data) => onSubmit(data, true))}
                className="px-4 py-2 border border-brand-orange text-brand-orange bg-brand-orange/5 rounded text-sm font-bold hover:bg-brand-orange/10 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save as Draft'}
              </button>
              <button 
                type="button" 
                disabled={isSubmitting}
                onClick={handleSubmit((data) => onSubmit(data, false))}
                className="px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {!showForm && !selectedPrDetails && (
      <div className="bg-white border border-slate-200 rounded-xl overflow-auto shadow-sm flex-1 min-h-0">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <th className="px-4 py-3">{isItemRequisition ? 'IR Number' : 'PR Number'}</th>
              <th className="px-4 py-3">Requested By</th>
              <th className="px-4 py-3">Department</th>
              {!isItemRequisition && <th className="px-4 py-3">Procurement Method</th>}
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-100">
            {paginatedPrs.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm font-medium text-slate-500">No Requisitions Found</td></tr>
            ) : (
              paginatedPrs.map((pr) => (
                <tr key={pr.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 font-mono font-bold">{pr.prNumber}</td>
                  <td className="px-4 py-4 font-medium">{pr.requestor}</td>
                  <td className="px-4 py-4">
                    <div className="text-slate-600 font-medium">{pr.department}</div>
                  </td>
                  {!isItemRequisition && (
                    <td className="px-4 py-4 text-slate-600 font-medium">{pr.procurementMethod || 'N/A'}</td>
                  )}
                  <td className="px-4 py-4">{pr.priority}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${
                      pr.status === 'Draft' && pr.approvals?.some((a: any) => a.status === 'Review') ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                      pr.status === 'Draft' ? 'bg-slate-100 text-slate-700 border border-slate-200' : 
                      pr.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                      pr.status === 'PR Created' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                      pr.status === 'Rejected' ? 'bg-red-100 text-red-700 border border-red-200' :
                      'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}>
                      {pr.status === 'Draft' && pr.approvals?.some((a: any) => a.status === 'Review') ? 'Review' : pr.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-500 text-xs">
                    {new Date(pr.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setSelectedPrDetails(pr)}
                        className="p-1.5 text-slate-400 hover:text-brand-orange hover:bg-brand-orange/10 rounded transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {pr.status === 'Draft' && canEdit && (
                        <button
                          onClick={() => handleEdit(pr)}
                          className="p-1.5 text-slate-400 hover:text-brand-orange hover:bg-brand-orange/10 rounded transition-colors"
                          title="Edit Draft"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      {selectedPrDetails && (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden flex flex-col flex-1">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedPrDetails(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Back to List"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Requisition Details</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedPrDetails.prNumber}</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Requested By</span>
                  <span className="font-medium text-slate-700">{selectedPrDetails.requestor}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Department</span>
                  <span className="font-medium text-slate-700">{selectedPrDetails.department}</span>
                </div>
                {!isItemRequisition && (
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Procurement Method</span>
                    <span className="font-medium text-slate-700">{selectedPrDetails.procurementMethod || 'N/A'}</span>
                  </div>
                )}
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Priority</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                    selectedPrDetails.priority === 'Emergency' ? 'bg-red-100 text-red-700' :
                    selectedPrDetails.priority === 'High' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>{selectedPrDetails.priority}</span>
                </div>
                <div className="col-span-3">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Justification</span>
                  <p className="text-slate-600 leading-relaxed mt-1">{selectedPrDetails.justification || 'No justification provided.'}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-3">Requisition Items</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left bg-white text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      <tr>
                        <th className="p-3">Category</th>
                        <th className="p-3">Item Name</th>
                        <th className="p-3 text-right">Qty</th>
                        <th className="p-3 text-left w-24">UOM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPrDetails.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 text-slate-600">{item.category}</td>
                          <td className="p-3 font-medium text-slate-800">
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

              {selectedPrDetails.approvals && selectedPrDetails.approvals.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-3">Approval Workflow Steps</h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 bg-white">
                    {selectedPrDetails.approvals.map((approval: any, idx: number) => (
                      <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            Step {approval.stepOrder}: {approval.roleRequired}
                          </p>
                          {approval.comments && (
                            <p className="text-xs text-slate-500 mt-1 italic border-l-2 border-slate-200 pl-2">
                              "{approval.comments}"
                            </p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded text-xs font-bold ${
                          approval.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                          approval.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                          approval.status === 'Review' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {approval.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
      )}
    </div>
    </PageLayout>
  );
}


