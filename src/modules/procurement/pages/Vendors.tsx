import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Users, Plus, ArrowLeft, Eye, Landmark, Edit } from 'lucide-react';
import PageLayout from '@/src/shared/components/PageLayout';

export default function Vendors() {
  const { getToken, dbUser, permissions } = useAuth();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<number | null>(null);
  const [selectedVendorDetails, setSelectedVendorDetails] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [bin, setBin] = useState('');
  const [tin, setTin] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Banking detail fields
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const vPerms = permissions?.find((p: any) => p.module === 'Vendors') || {};
  const canCreate = isSuperAdmin || vPerms.canCreate;
  const canEdit = isSuperAdmin || vPerms.canEdit;

  const resetForm = () => {
    setName('');
    setBin('');
    setTin('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setBankName('');
    setBranchName('');
    setAccountName('');
    setAccountNumber('');
    setRoutingNumber('');
    setEditingVendorId(null);
    setShowRegisterForm(false);
  };

  const handleEditClick = (vendor: any) => {
    setName(vendor.name || '');
    setBin(vendor.bin || '');
    setTin(vendor.tin || '');
    setContactPerson(vendor.contactPerson || '');
    setEmail(vendor.email || '');
    setPhone(vendor.phone || '');
    setBankName(vendor.bankName || '');
    setBranchName(vendor.branchName || '');
    setAccountName(vendor.accountName || '');
    setAccountNumber(vendor.accountNumber || '');
    setRoutingNumber(vendor.routingNumber || '');
    setEditingVendorId(vendor.id);
    setShowRegisterForm(true);
  };

  const [qualityMetrics, setQualityMetrics] = useState<Record<number, any>>({});

  const loadVendors = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const [data, metrics] = await Promise.all([
        fetchWithAuth('/api/vendors', token),
        fetchWithAuth('/api/vendors/quality-metrics', token).catch(() => [])
      ]);
      setVendors(data);
      const metricsMap: Record<number, any> = {};
      if (Array.isArray(metrics)) {
        metrics.forEach((m: any) => {
          if (m.vendorId) metricsMap[m.vendorId] = m;
        });
      }
      setQualityMetrics(metricsMap);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, [getToken]);

  const handleRegisterVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (!token) return;

      const payload = {
        name,
        bin,
        tin,
        contactPerson,
        email,
        phone,
        bankName,
        branchName,
        accountName,
        accountNumber,
        routingNumber
      };

      const url = editingVendorId ? `/api/vendors/${editingVendorId}` : '/api/vendors';
      const method = editingVendorId ? 'PUT' : 'POST';

      const response = await fetchWithAuth(url, token, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response && !response.error) {
        resetForm();
        await loadVendors();
      } else {
        alert(response?.error || 'Failed to save vendor');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to save vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredVendors = vendors.filter(v => 
    (v.name?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (v.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (v.email?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (v.bankName?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (v.accountNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
  );
  
  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);
  const paginatedVendors = filteredVendors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <PageLayout
      loading={loading}
      search={showRegisterForm || selectedVendorDetails ? undefined : { placeholder: "Search vendors, banks, accounts...", onSearch: setSearchQuery }}
      pagination={showRegisterForm || selectedVendorDetails ? undefined : { currentPage, totalPages, onPageChange: setCurrentPage }}
    >
    <div className="space-y-6 flex flex-col h-full">
      {!showRegisterForm && !selectedVendorDetails && (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Vendor Directory</h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage vendor profiles, tax identifiers, and banking info</p>
            </div>
            {canCreate && (
              <button
                onClick={() => {
                  resetForm();
                  setShowRegisterForm(true);
                }}
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
                  <th className="px-4 py-3">Vendor Name</th>
                  <th className="px-4 py-3">Contact Person</th>
                  <th className="px-4 py-3">Email & Phone</th>
                  <th className="px-4 py-3">Bank Info</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm font-medium text-slate-500">Loading vendors...</td></tr>
                ) : paginatedVendors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Users className="mx-auto h-12 w-12 text-slate-300" />
                      <p className="mt-2 text-sm font-medium text-slate-500">No vendors found.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedVendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{vendor.name}</span>
                          {qualityMetrics[vendor.id] ? (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-bold flex items-center gap-1" title={`Quality Score: ${qualityMetrics[vendor.id].qualityScore}/10 (${qualityMetrics[vendor.id].rejectionRate}% rejection rate)`}>
                              ⭐ {qualityMetrics[vendor.id].qualityScore}/10
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold">
                              ⭐ 10.0/10
                            </span>
                          )}
                        </div>
                        {vendor.bin && <div className="text-[10px] text-slate-400 font-medium mt-0.5">BIN: {vendor.bin}</div>}
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-700">{vendor.contactPerson || '-'}</td>
                      <td className="px-4 py-4">
                        <div className="text-xs font-semibold text-slate-800">{vendor.email || '-'}</div>
                        <div className="text-[11px] text-slate-500">{vendor.phone || ''}</div>
                      </td>
                      <td className="px-4 py-4">
                        {vendor.bankName ? (
                          <div className="flex items-start gap-1.5">
                            <Landmark className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                            <div>
                              <div className="text-xs font-bold text-slate-800">{vendor.bankName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">A/C: {vendor.accountNumber || '-'}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No bank info</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${vendor.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {vendor.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedVendorDetails(vendor)}
                            className="p-1.5 text-slate-400 hover:text-brand-orange hover:bg-brand-orange/10 rounded transition-colors"
                            title="View Full Profile & Bank Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => handleEditClick(vendor)}
                              className="p-1.5 text-slate-400 hover:text-brand-blue hover:bg-blue-50 rounded transition-colors"
                              title="Edit Vendor"
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
        </>
      )}

      {/* Vendor Profile View Drawer */}
      {selectedVendorDetails && !showRegisterForm && (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden flex flex-col flex-1 mb-6 max-h-[calc(100vh-7rem)]">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-xl shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedVendorDetails(null)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors" title="Back to Directory">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-lg font-bold text-slate-800">{selectedVendorDetails.name}</h3>
                <p className="text-xs text-slate-500">Vendor Information & Banking Profile</p>
              </div>
            </div>
            {canEdit && (
              <button
                onClick={() => {
                  const v = selectedVendorDetails;
                  setSelectedVendorDetails(null);
                  handleEditClick(v);
                }}
                className="px-3 py-1.5 bg-brand-blue text-white rounded text-xs font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"
              >
                <Edit className="w-3.5 h-3.5" /> Edit Vendor
              </button>
            )}
          </div>

          <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
            {/* General Info */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">General & Contact Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Contact Person</span>
                  <span className="font-semibold text-slate-800">{selectedVendorDetails.contactPerson || '-'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Email Address</span>
                  <span className="font-semibold text-slate-800">{selectedVendorDetails.email || '-'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Phone Number</span>
                  <span className="font-semibold text-slate-800">{selectedVendorDetails.phone || '-'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">BIN (Business ID)</span>
                  <span className="font-semibold text-slate-800">{selectedVendorDetails.bin || '-'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">TIN (Tax ID)</span>
                  <span className="font-semibold text-slate-800">{selectedVendorDetails.tin || '-'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Status</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase ${selectedVendorDetails.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {selectedVendorDetails.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Banking Details */}
            <div className="bg-amber-50/50 p-5 rounded-xl border border-amber-200 space-y-4">
              <div className="flex items-center gap-2 text-brand-orange">
                <Landmark className="w-5 h-5" />
                <h4 className="text-sm font-extrabold uppercase tracking-wide">Bank Account Information</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Bank Name</span>
                  <span className="font-bold text-slate-900 text-base">{selectedVendorDetails.bankName || 'Not Provided'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Branch Name</span>
                  <span className="font-semibold text-slate-800">{selectedVendorDetails.branchName || 'Not Provided'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Account Name</span>
                  <span className="font-semibold text-slate-800">{selectedVendorDetails.accountName || 'Not Provided'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Account Number</span>
                  <span className="font-mono font-bold text-brand-blue text-base">{selectedVendorDetails.accountNumber || 'Not Provided'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Routing Number</span>
                  <span className="font-mono font-bold text-slate-800">{selectedVendorDetails.routingNumber || 'Not Provided'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0 rounded-b-xl">
            <button onClick={() => setSelectedVendorDetails(null)} className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100">
              Close Profile
            </button>
          </div>
        </div>
      )}

      {/* Register/Edit Vendor Form */}
      {showRegisterForm && (
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 flex flex-col flex-1 max-h-[calc(100vh-7rem)] min-h-0 overflow-hidden mb-6">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50 rounded-t-xl shrink-0">
            <button
              onClick={resetForm}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
              title="Back to List"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-800">
              {editingVendorId ? 'Edit Vendor Profile' : 'Register Vendor'}
            </h2>
          </div>

          <form onSubmit={handleRegisterVendor} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
              {/* Section 1: Basic Information */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">1. Company & Contact Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Vendor Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange"
                      placeholder="E.g. Acme Corporation Ltd."
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Contact Person</label>
                    <input
                      type="text"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange"
                      placeholder="E.g. John Doe"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange"
                      placeholder="E.g. vendor@example.com"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange"
                      placeholder="E.g. +8801700000000"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">BIN (Business ID)</label>
                    <input
                      type="text"
                      value={bin}
                      onChange={(e) => setBin(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange"
                      placeholder="Business Identification Number"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">TIN (Tax ID)</label>
                    <input
                      type="text"
                      value={tin}
                      onChange={(e) => setTin(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange"
                      placeholder="Taxpayer Identification Number"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Banking Information */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Landmark className="w-4 h-4 text-brand-orange" />
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">2. Bank Account Information</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue bg-white"
                      placeholder="E.g. Dutch-Bangla Bank PLC"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Branch Name</label>
                    <input
                      type="text"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue bg-white"
                      placeholder="E.g. Gulshan Branch"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Account Name</label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue bg-white"
                      placeholder="E.g. Acme Corporation Ltd."
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Account Number</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue bg-white font-mono"
                      placeholder="E.g. 1011200045678"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Routing Number</label>
                    <input
                      type="text"
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue bg-white font-mono"
                      placeholder="E.g. 090261453"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-slate-200 bg-slate-50 shrink-0 sticky bottom-0 z-20 rounded-b-xl">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-slate-200 rounded text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isSubmitting ? (editingVendorId ? 'Saving...' : 'Registering...') : (editingVendorId ? 'Save Changes' : 'Register Vendor')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
    </PageLayout>
  );
}
