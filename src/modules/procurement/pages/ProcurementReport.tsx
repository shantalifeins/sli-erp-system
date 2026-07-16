import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Download, FileText, ArrowLeft, Filter } from 'lucide-react';
import PageLayout from '@/src/shared/components/PageLayout';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';

export default function ProcurementReport() {
  const { getToken, dbUser, permissions } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [prNumber, setPrNumber] = useState('');

  // Dropdown options
  const [vendors, setVendors] = useState<any[]>([]);

  // Report Data
  const [reportData, setReportData] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Column visibility
  const defaultColumns = [
    { key: 'createdAt', label: 'PO Date', visible: true },
    { key: 'poNumber', label: 'PO Number', visible: true },
    { key: 'prNumber', label: 'PR Number', visible: true },
    { key: 'department', label: 'Department', visible: true },
    { key: 'vendorName', label: 'Vendor Name', visible: true },
    { key: 'totalAmount', label: 'Total Amount', visible: true },
    { key: 'status', label: 'Status', visible: true },
    { key: 'deliveryDate', label: 'Delivery Date', visible: true },
    { key: 'createdByName', label: 'Created By', visible: true }
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
      const vendorData = await fetchWithAuth('/api/vendors', token);
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
      if (status) params.append('status', status);
      if (vendorId) params.append('vendorId', vendorId);
      if (prNumber) params.append('prNumber', prNumber);

      const data = await fetchWithAuth(`/api/procurement-reports?${params.toString()}`, token);
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
        if ((col.key === 'createdAt' || col.key === 'deliveryDate') && val) {
          val = new Date(val).toLocaleDateString();
        }
        formattedRow[col.label] = val || '-';
      });
      return formattedRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Procurement Report");
    XLSX.writeFile(workbook, "Procurement_Report.xlsx");
  };

  const exportPDF = () => {
    const visibleCols = columns.filter(c => c.visible);
    const doc = new jsPDF('landscape');
    
    const tableData = filteredReportData.map(row => {
      return visibleCols.map(col => {
        let val = row[col.key];
        if ((col.key === 'createdAt' || col.key === 'deliveryDate') && val) {
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
      headStyles: { fillColor: [59, 130, 246] } // brand-blue for procurement? using a nice blue
    });

    doc.save('Procurement_Report.pdf');
  };

  return (
    <PageLayout 
      loading={loading}
      search={{ placeholder: "Search within results...", onSearch: setSearchQuery }}
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/procurement-dashboard')}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors bg-slate-100"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Procurement Report</h1>
            <p className="text-sm text-slate-500 font-medium">Generate and export purchase order and vendor reports.</p>
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
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="col-span-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Start Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm focus:border-brand-blue outline-none"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">End Date</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm focus:border-brand-blue outline-none"
            />
          </div>
          <div className="col-span-1 lg:col-span-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">PO Status</label>
            <select 
              value={status} 
              onChange={e => setStatus(e.target.value)}
              className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm focus:border-brand-blue outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Approved">Approved</option>
              <option value="Sent">Sent</option>
              <option value="Delivered">Delivered</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div className="col-span-1 lg:col-span-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Vendor</label>
            <select 
              value={vendorId} 
              onChange={e => setVendorId(e.target.value)}
              className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm focus:border-brand-blue outline-none"
            >
              <option value="">All Vendors</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-1 lg:col-span-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">PR Number</label>
            <input 
              type="text" 
              placeholder="Ex: PR-1001"
              value={prNumber} 
              onChange={e => setPrNumber(e.target.value)}
              className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm focus:border-brand-blue outline-none"
            />
          </div>
          <div className="col-span-1 md:col-span-2 lg:col-span-5 flex gap-2">
            <button 
              type="submit" 
              className="flex-1 px-4 py-2 bg-brand-charcoal text-white font-bold rounded-lg shadow-sm hover:bg-slate-800 transition-colors text-sm"
            >
              Generate Report
            </button>
            <button 
              type="button" 
              onClick={() => {
                setStartDate(''); setEndDate(''); setStatus(''); setVendorId(''); setPrNumber('');
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
                        className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReportData.length > 0 ? (
                  filteredReportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      {columns.filter(c => c.visible).map(col => (
                        <td key={col.key} className="p-3 text-sm text-slate-700 whitespace-nowrap">
                          {(col.key === 'createdAt' || col.key === 'deliveryDate') && row[col.key] 
                            ? new Date(row[col.key]).toLocaleDateString() 
                            : row[col.key] || <span className="text-slate-300">-</span>}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.filter(c => c.visible).length} className="p-8 text-center text-slate-400 font-medium">
                      No data found for the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
