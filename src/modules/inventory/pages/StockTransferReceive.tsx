import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Loader2, Download, PackageOpen } from 'lucide-react';
import PageLayout from '@/src/shared/components/PageLayout';

export default function StockTransferReceive() {
  const { getToken, dbUser, permissions } = useAuth();
  const [incoming, setIncoming] = useState<any[]>([]);

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const stPerms = permissions?.find((p: any) => p.module === 'Stock Transfer') || {};
  const canCreate = isSuperAdmin || stPerms.canCreate;
  const [loading, setLoading] = useState(true);
  const [receiving, setReceiving] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const data = await fetchWithAuth('/api/stock-transfers/incoming', token);
      setIncoming(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [getToken]);

  const handleReceive = async (transferId: number) => {
    if (!confirm("Are you sure you want to receive this stock transfer into the destination warehouse?")) return;
    
    try {
      setReceiving(transferId);
      const token = await getToken();
      await fetchWithAuth(`/api/stock-transfers/${transferId}/receive`, token, {
        method: 'POST'
      });
      loadData();
    } catch (error) {
      console.error(error);
      alert("Failed to receive transfer.");
    } finally {
      setReceiving(null);
    }
  };

  const filtered = incoming.filter(t => 
    t.transferNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.sourceWarehouseName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageLayout
      search={{
        placeholder: "Search incoming transfers...",
        onSearch: setSearchQuery
      }}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-slate-800">Transfer Receive</h1>
            <p className="text-sm text-slate-500">Receive incoming stock transfers</p>
          </div>
        </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-bold text-slate-600">Transfer No</th>
                <th className="p-4 font-bold text-slate-600">Source</th>
                <th className="p-4 font-bold text-slate-600">Destination</th>
                <th className="p-4 font-bold text-slate-600">Date Sent</th>
                <th className="p-4 font-bold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <PackageOpen size={48} className="text-slate-300 mb-4" />
                      <p>No incoming transfers</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-800">{t.transferNumber}</td>
                    <td className="p-4">{t.sourceWarehouseName}</td>
                    <td className="p-4">{t.destinationWarehouseName}</td>
                    <td className="p-4 text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="p-4">
                      {canCreate && (
                        <button
                          onClick={() => handleReceive(t.id)}
                          disabled={receiving === t.id}
                          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-green-700 disabled:opacity-50"
                        >
                          {receiving === t.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                          Receive Stock
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </PageLayout>
  );
}
