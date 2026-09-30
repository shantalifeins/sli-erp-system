import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { FileText, AlertCircle, Clock, Search, Filter, Download } from 'lucide-react';
import { useCurrency } from '@/src/shared/components/SettingsProvider';

export default function ReportsDashboard() {
  const { getToken } = useAuth();
  const currencySymbol = useCurrency();
  const [activeTab, setActiveTab] = useState('grni');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadReport = async (tab: string) => {
    setLoading(true);
    let endpoint = '';
    switch(tab) {
      case 'grni': endpoint = '/api/reports/grni'; break;
      case 'invoiced_not_received': endpoint = '/api/reports/invoiced-not-received'; break;
      case 'pending_capitalization': endpoint = '/api/assets/pending-capitalization'; break;
      case 'unmapped_po_lines': endpoint = '/api/reports/unmapped-po-lines'; break;
      case 'expiring_licenses': endpoint = '/api/reports/expiring-licences?days=30'; break;
      case 'seat_overallocation': endpoint = '/api/reports/seat-overallocation'; break;
    }
    
    try {
      const token = await getToken();
      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` }});
      const result = await res.json();
      setData(result || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(activeTab);
  }, [activeTab]);

  const tabs = [
    { id: 'grni', label: 'GRNI (Received Not Invoiced)', icon: FileText },
    { id: 'invoiced_not_received', label: 'Invoiced Not Received', icon: FileText },
    { id: 'unmapped_po_lines', label: 'Unmapped PO Lines', icon: AlertCircle },
    { id: 'pending_capitalization', label: 'Pending Capitalization', icon: Clock },
    { id: 'expiring_licenses', label: 'Expiring Licenses', icon: AlertCircle },
    { id: 'seat_overallocation', label: 'Seat Over-Allocation', icon: AlertCircle },
  ];

  const filteredData = data.filter(item => 
    Object.values(item).some(val => 
      String(val).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Master Analytics & Reports</h1>
          <p className="text-sm text-slate-500">View cross-module procurement and asset reports</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-slate-200 overflow-x-auto pb-2">
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setSearchQuery(''); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                isActive 
                  ? 'text-purple-600 bg-purple-50 border-b-2 border-purple-600' 
                  : 'text-slate-600 hover:text-purple-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search report data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border-slate-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                {data.length > 0 && Object.keys(data[0]).map(k => (
                  <th key={k} className="p-3 border-b border-slate-200 font-medium">{k.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={10} className="p-8 text-center text-slate-500">Loading data...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-slate-500">No records found.</td></tr>
              ) : (
                filteredData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    {Object.entries(row).map(([k, v]: any, j) => (
                      <td key={j} className="p-3 text-slate-700">
                        {k.includes('price') || k.includes('cost') || k.includes('total') || k.includes('liability') 
                          ? `${currencySymbol}${Number(v).toFixed(2)}` 
                          : String(v)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
