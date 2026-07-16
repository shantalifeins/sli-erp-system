import { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Users, Plus } from 'lucide-react';
import PageLayout from '@/src/shared/components/PageLayout';

export default function Vendors() {
  const { getToken, dbUser, permissions } = useAuth();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const vPerms = permissions?.find((p: any) => p.module === 'Vendors') || {};
  const canCreate = isSuperAdmin || vPerms.canCreate;

  const loadVendors = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await fetchWithAuth('/api/vendors', token);
      setVendors(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, [getToken]);

  const filteredVendors = vendors.filter(v => 
    (v.name?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (v.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (v.email?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
  );
  
  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);
  const paginatedVendors = filteredVendors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <PageLayout
      loading={loading}
      search={{ placeholder: "Search vendors...", onSearch: setSearchQuery }}
      pagination={{ currentPage, totalPages, onPageChange: setCurrentPage }}
    >
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800">Vendor Directory</h2>
        {canCreate && (
          <button
            className="inline-flex items-center px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors"
          >
            <Plus className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
            Register Vendor
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-auto shadow-sm flex-1 min-h-0">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Rating</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm font-medium text-slate-500">Loading...</td></tr>
            ) : paginatedVendors.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-2 text-sm font-medium text-slate-500">No vendors found.</p>
                </td>
              </tr>
            ) : (
              paginatedVendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 font-bold">{vendor.name}</td>
                  <td className="px-4 py-4 font-medium">{vendor.contactPerson}</td>
                  <td className="px-4 py-4 text-slate-500">{vendor.email}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${vendor.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {vendor.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right font-mono font-bold">{vendor.rating}/5.0</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
    </PageLayout>
  );
}



