import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Download, FileText, ArrowLeft, Filter, Eye, X } from 'lucide-react';
import PageLayout from '@/src/shared/components/PageLayout';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';

export default function InventoryReport() {
  const { getToken, dbUser, permissions } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewRow, setViewRow] = useState<any>(null);
  
  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [itemId, setItemId] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [vendorId, setVendorId] = useState('');

  // Dropdown options
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  // Report Data
  const [reportData, setReportData] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Column visibility
  const defaultColumns = [
    { key: 'createdAt', label: 'Date', visible: true },
    { key: 'transactionType', label: 'Type', visible: true },
    { key: 'itemCode', label: 'Item Code', visible: true },
    { key: 'itemName', label: 'Item Name', visible: true },
    { key: 'category', label: 'Category', visible: true },
    { key: 'warehouseName', label: 'Warehouse', visible: true },
    { key: 'vendorName', label: 'Vendor', visible: true },
    { key: 'quantity', label: 'Quantity', visible: true },
    { key: 'uom', label: 'UOM', visible: true },
    { key: 'referenceId', label: 'Reference', visible: true },
    { key: 'performedByName', label: 'Performed By', visible: true }
  ];
  const [columns, setColumns] = useState(defaultColumns);
  const [showColumnFilter, setShowColumnFilter] = useState(false);

  useEffect(() => {
    loadDropdowns();
  }, [getToken]);

  const loadDropdowns = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      
      const [whData, itemData, vendorData] = await Promise.all([
        fetchWithAuth('/api/warehouses', token), // or my-warehouses depending on admin vs user
        fetchWithAuth('/api/inventory', token),
        fetchWithAuth('/api/vendors', token)
      ]);
      setWarehouses(whData || []);
      setItems(itemData || []);
      setVendors(vendorData || []);
    } catch (error) {
      console.error('Failed to load dropdowns:', error);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setHasSearched(true);
    try {
      const token = await getToken();
      if (!token) return;

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (warehouseId) params.append('warehouseId', warehouseId);
      if (itemId) params.append('itemId', itemId);
      if (transactionType) params.append('transactionType', transactionType);
      if (vendorId) params.append('vendorId', vendorId);

      const data = await fetchWithAuth(`/api/inventory-reports?${params.toString()}`, token);
      setReportData(data || []);
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const filteredReportData = reportData.filter(row => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return Object.values(row).some((val: any) => 
      val && val.toString().toLowerCase().includes(q)
    );
  });

  const toggleColumn = (key: string) => {
    setColumns(columns.map(c => c.key === key ? { ...c, visible: !c.visible } : c));
  };

  const exportExcel = () => {
    const visibleCols = columns.filter(c => c.visible);
    
    // Format data for excel
    const excelData = filteredReportData.map(row => {
      const formattedRow: any = {};
      visibleCols.forEach(col => {
        let val = row[col.key];
        if (col.key === 'createdAt' && val) {
          val = new Date(val).toLocaleDateString();
        }
        formattedRow[col.label] = val || '-';
      });
      return formattedRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Report");
    XLSX.writeFile(workbook, "Inventory_Report.xlsx");
  };

  const exportPDF = () => {
    const visibleCols = columns.filter(c => c.visible);
    const doc = new jsPDF('landscape');
    
    const tableData = filteredReportData.map(row => {
      return visibleCols.map(col => {
        let val = row[col.key];
        if (col.key === 'createdAt' && val) {
          return new Date(val).toLocaleDateString();
        }
        return val || '-';
      });
    });

    autoTable(doc, {
      head: [visibleCols.map(c => c.label)],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [249, 115, 22] } // brand-orange
    });

    doc.save('Inventory_Report.pdf');
  };

  return (
    <PageLayout 
      loading={loading}
      search={{ placeholder: "Search within results...", onSearch: setSearchQuery }}
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/inventory-dashboard')}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors bg-slate-100"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Inventory Report</h1>
            <p className="text-sm text-slate-500 font-medium">Generate and export customized stock transaction reports.</p>
          </div>
        </div>
        
        {hasSearched && filteredReportData.length > 0 && (
          <div className="flex gap-2">
            <button 
              onClick={exportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm transition-colors text-sm"
            >
              <FileText className="w-4 h-4" /> PDF
            </button>
            <button 
              onClick={exportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm transition-colors text-sm"
            >
              <Download className="w-4 h-4" /> Excel
            </button>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          <div className="col-span-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Start Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm focus:border-brand-orange outline-none"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">End Date</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm focus:border-brand-orange outline-none"
            />
          </div>
          <div className="col-span-1 lg:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Transaction Type</label>
            <select 
              value={transactionType} 
              onChange={e => setTransactionType(e.target.value)}
              className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm focus:border-brand-orange outline-none"
            >
              <option value="">All Types</option>
              <option value="Stock In">Stock In</option>
              <option value="Stock Out">Stock Out</option>
              <option value="GRN">GRN</option>
              <option value="Issue">Issue</option>
              <option value="Adjustment">Adjustment</option>
            </select>
          </div>
          <div className="col-span-1 lg:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Warehouse</label>
            <select 
              value={warehouseId} 
              onChange={e => setWarehouseId(e.target.value)}
              className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm focus:border-brand-orange outline-none"
            >
              <option value="">All Warehouses</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Item</label>
            <select 
              value={itemId} 
              onChange={e => setItemId(e.target.value)}
              className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm focus:border-brand-orange outline-none"
            >
              <option value="">All Items</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>{i.itemCode} - {i.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Vendor</label>
            <select 
              value={vendorId} 
              onChange={e => setVendorId(e.target.value)}
              className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm focus:border-brand-orange outline-none"
            >
              <option value="">All Vendors</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-1 md:col-span-2 flex gap-2">
            <button 
              type="submit" 
              className="flex-1 px-4 py-2 bg-brand-charcoal text-white font-bold rounded-lg shadow-sm hover:bg-slate-800 transition-colors text-sm"
            >
              Generate Report
            </button>
            <button 
              type="button" 
              onClick={() => {
                setStartDate(''); setEndDate(''); setWarehouseId(''); setItemId(''); setTransactionType(''); setVendorId('');
              }}
              className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg shadow-sm hover:bg-slate-200 transition-colors text-sm"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {hasSearched && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
          <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
            <div className="text-sm font-bold text-slate-700">
              Results ({filteredReportData.length})
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowColumnFilter(!showColumnFilter)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <Filter className="w-4 h-4" /> Columns
              </button>
              
              {showColumnFilter && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-10 p-2">
                  <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest px-2">Show/Hide Columns</div>
                  {columns.map(col => (
                    <label key={col.key} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 cursor-pointer rounded">
                      <input 
                        type="checkbox" 
                        checked={col.visible} 
                        onChange={() => toggleColumn(col.key)}
                        className="rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                      />
                      <span className="text-sm text-slate-700">{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse min-w-max">
              <thead className="bg-slate-50 sticky top-0 z-0">
                <tr>
                  {columns.filter(c => c.visible).map(col => (
                    <th key={col.key} className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                  <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReportData.length > 0 ? (
                  filteredReportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      {columns.filter(c => c.visible).map(col => (
                        <td key={col.key} className="p-3 text-sm text-slate-700 whitespace-nowrap">
                          {col.key === 'createdAt' && row[col.key] 
                            ? new Date(row[col.key]).toLocaleDateString() 
                            : row[col.key] || <span className="text-slate-300">-</span>}
                        </td>
                      ))}
                      <td className="p-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => setViewRow(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-xs font-bold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.filter(c => c.visible).length + 1} className="p-8 text-center text-slate-400 font-medium">
                      No data found for the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inventory Transaction Detail View Modal */}
      {viewRow && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">
                  Inventory Transaction Detail
                </h3>
                <p className="text-xs text-slate-500 font-mono">Ref: {viewRow.referenceId || 'N/A'}</p>
              </div>
              <button 
                onClick={() => setViewRow(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Transaction Type</span><span className="font-semibold text-brand-orange">{viewRow.transactionType || 'N/A'}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Item Name</span><span className="font-semibold text-slate-800">{viewRow.itemName || 'N/A'}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Item Code</span><span className="font-semibold text-slate-800">{viewRow.itemCode || 'N/A'}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Category</span><span className="font-semibold text-slate-800">{viewRow.category || 'N/A'}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Warehouse</span><span className="font-semibold text-slate-800">{viewRow.warehouseName || 'N/A'}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Vendor</span><span className="font-semibold text-slate-800">{viewRow.vendorName || 'N/A'}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Quantity</span><span className="font-bold text-slate-900 text-base">{viewRow.quantity || 0} {viewRow.uom || ''}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Performed By</span><span className="font-semibold text-slate-800">{viewRow.performedByName || 'N/A'}</span></div>
                <div><span className="text-slate-400 block text-xs font-bold uppercase">Date</span><span className="font-semibold text-slate-800">{viewRow.createdAt ? new Date(viewRow.createdAt).toLocaleDateString() : 'N/A'}</span></div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setViewRow(null)}
                className="px-5 py-2 bg-slate-800 text-white font-bold text-sm rounded shadow-sm hover:bg-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
