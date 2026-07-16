import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Building2, Plus, Edit, Image as ImageIcon, Globe, Mail, Phone, MapPin, Check, ArrowLeft, Monitor } from 'lucide-react';
import { useSettings } from '@/src/shared/components/SettingsProvider';
import PluginManager from './PluginManager';

export default function CompanyManager({ searchQuery = '' }: { searchQuery?: string }) {
  const { getToken, dbUser, permissions } = useAuth();
  const { refreshSettings } = useSettings();
  const [companies, setCompanies] = useState<any[]>([]);

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const companyPerms = permissions?.find((p: any) => p.module === 'Company Profile') || {};
  const canEdit = isSuperAdmin || companyPerms.canEdit;
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  
  // Field States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logoPrimary, setLogoPrimary] = useState<string | null>(null);
  const [logoWhite, setLogoWhite] = useState<string | null>(null);
  const [favicon, setFavicon] = useState<string | null>(null);
  const [currency, setCurrency] = useState('BDT ৳');
  
  // SSO State
  const [isSsoEnabled, setIsSsoEnabled] = useState(false);
  const [ssoEmailDomain, setSsoEmailDomain] = useState('');
  const [ssoClientId, setSsoClientId] = useState('');
  const [ssoTenantId, setSsoTenantId] = useState('');
  const [ssoClientSecret, setSsoClientSecret] = useState('');
  
  const [submitting, setSubmitting] = useState(false);

  // Global branding state (login page logo & favicon)
  const [showGlobalBranding, setShowGlobalBranding] = useState(false);
  const [globalLogo, setGlobalLogo] = useState<string | null>(null);
  const [globalFavicon, setGlobalFavicon] = useState<string | null>(null);
  const [globalSaving, setGlobalSaving] = useState(false);

  const loadCompanies = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await fetchWithAuth('/api/companies', token);
      setCompanies(data || []);
    } catch (error) {
      console.error("Failed to load companies:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    loadGlobalBranding();
  }, [getToken]);

  const loadGlobalBranding = async () => {
    try {
      const res = await fetch('/api/settings/global', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.global_logo) setGlobalLogo(data.global_logo);
        if (data.global_favicon) setGlobalFavicon(data.global_favicon);
      }
    } catch (err) {
      console.error('Failed to load global branding', err);
    }
  };

  const handleSaveGlobalBranding = async () => {
    if (globalSaving) return;
    setGlobalSaving(true);
    try {
      const token = await getToken();
      const updates: Record<string, string> = {};
      if (globalLogo) updates['global_logo'] = globalLogo;
      if (globalFavicon) updates['global_favicon'] = globalFavicon;

      await fetchWithAuth('/api/settings/global', token, {
        method: 'POST',
        body: JSON.stringify(updates)
      });
      alert('Login page branding saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save login page branding.');
    } finally {
      setGlobalSaving(false);
    }
  };

  const handleEdit = async (company: any) => {
    setEditingCompanyId(company.id);
    setName(company.name);
    setIsSsoEnabled(company.isSsoEnabled || false);
    setSsoEmailDomain(company.ssoEmailDomain || '');
    setSsoClientId(company.ssoClientId || '');
    setSsoTenantId(company.ssoTenantId || '');
    setSsoClientSecret(company.ssoClientSecret || '');
    setShowForm(true);
    
    // Reset other fields first
    setEmail('');
    setPhone('');
    setAddress('');
    setLogoPrimary(null);
    setLogoWhite(null);
    setFavicon(null);
    setCurrency('BDT ৳');

    try {
      const token = await getToken();
      const settingsData = await fetchWithAuth(`/api/settings?companyId=${company.id}`, token);
      if (settingsData) {
        if (settingsData.company_email) setEmail(settingsData.company_email);
        if (settingsData.company_phone) setPhone(settingsData.company_phone);
        if (settingsData.company_address) setAddress(settingsData.company_address);
        if (settingsData.logo_primary) setLogoPrimary(settingsData.logo_primary);
        if (settingsData.logo_white) setLogoWhite(settingsData.logo_white);
        if (settingsData.favicon) setFavicon(settingsData.favicon);
        if (settingsData.currency) setCurrency(settingsData.currency);
      }
    } catch (error) {
      console.error("Failed to load company settings", error);
    }
  };

  const handleCreateNew = () => {
    setEditingCompanyId(null);
    setName('');
    setIsSsoEnabled(false);
    setSsoEmailDomain('');
    setSsoClientId('');
    setSsoTenantId('');
    setSsoClientSecret('');
    setEmail('');
    setPhone('');
    setAddress('');
    setLogoPrimary(null);
    setLogoWhite(null);
    setFavicon(null);
    setCurrency('BDT ৳');
    setShowForm(true);
  };

  /**
   * Compress an image file using canvas before converting to base64.
   * Logos → max 300px height, favicons → max 64px. Output as WebP at 0.8 quality.
   * This reduces base64 size from MBs to ~10-50KB for fast DB storage and API loads.
   */
  const compressImage = (file: File, maxHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (height > maxHeight) {
          width = Math.round(width * (maxHeight / height));
          height = maxHeight;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));
        ctx.drawImage(img, 0, 0, width, height);
        // Use WebP for best compression; fall back to PNG for favicons
        const mimeType = maxHeight <= 64 ? 'image/png' : 'image/webp';
        const quality = maxHeight <= 64 ? 1.0 : 0.8;
        resolve(canvas.toDataURL(mimeType, quality));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string | null>>, isFavicon = false) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const maxH = isFavicon ? 64 : 300;
        const compressed = await compressImage(file, maxH);
        setter(compressed);
      } catch {
        // Fallback to raw base64 if compression fails
        const reader = new FileReader();
        reader.onloadend = () => setter(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setSubmitting(true);
    try {
      const token = await getToken();
      let targetCompanyId = editingCompanyId;
      
      if (!editingCompanyId) {
        // Create new company
        const newCompany = await fetchWithAuth('/api/companies', token, {
          method: 'POST',
          body: JSON.stringify({ name: name.trim(), isSsoEnabled, ssoEmailDomain, ssoClientId, ssoTenantId, ssoClientSecret })
        });
        targetCompanyId = newCompany.id;
      } else {
        // Update existing company name
        await fetchWithAuth(`/api/companies/${editingCompanyId}`, token, {
          method: 'PUT',
          body: JSON.stringify({ name: name.trim(), isSsoEnabled, ssoEmailDomain, ssoClientId, ssoTenantId, ssoClientSecret })
        });
      }

      // Update Settings
      const updates: Record<string, string> = {
        company_email: email,
        company_phone: phone,
        company_address: address,
        currency: currency,
      };
      if (logoPrimary) updates['logo_primary'] = logoPrimary;
      if (logoWhite) updates['logo_white'] = logoWhite;
      if (favicon) updates['favicon'] = favicon;

      await fetchWithAuth(`/api/settings?companyId=${targetCompanyId}`, token, {
        method: 'POST',
        body: JSON.stringify(updates)
      });

      await loadCompanies();
      await refreshSettings();
      setShowForm(false);
      alert(`Company ${editingCompanyId ? 'updated' : 'created'} successfully!`);
    } catch (error) {
      alert("Failed to save company details.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-500">Loading companies...</div>;

  return (
    <div className="space-y-6">
      {!showForm && (
        <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-brand-orange" />
          <div>
            <h3 className="text-lg font-bold text-slate-800">Companies / Tenants</h3>
            <p className="text-sm text-slate-500">Manage organizations, contact info, and branding assets.</p>
          </div>
        </div>
         <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGlobalBranding(!showGlobalBranding)}
            className="inline-flex items-center px-4 py-2 bg-slate-700 text-white rounded text-sm font-bold hover:bg-slate-800 shadow-sm transition-colors"
          >
            <Monitor className="-ml-1 mr-2 h-4 w-4" />
            Login Page Branding
          </button>
          <button 
            onClick={() => {
              if (showForm) {
                setShowForm(false);
              } else {
                handleCreateNew();
              }
            }}
            className="inline-flex items-center px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors"
          >
            <Plus className="-ml-1 mr-2 h-4 w-4" /> 
            {showForm ? 'Cancel' : 'Register Company'}
          </button>
         </div>
      </div>
      )}

      {/* Global Login Page Branding Card */}
      {showGlobalBranding && !showForm && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="bg-slate-800 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="w-5 h-5 text-brand-orange" />
              <div>
                <h4 className="font-bold text-white text-sm">Login Page Branding</h4>
                <p className="text-[10px] text-slate-400 font-medium">This logo and favicon appear on the login screen for all users (not tenant-specific).</p>
              </div>
            </div>
            <button onClick={() => setShowGlobalBranding(false)} className="text-slate-400 hover:text-white text-xs font-bold">✕ Close</button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Global Logo */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Login Page Logo</label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors relative h-32">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setGlobalLogo)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {globalLogo ? (
                    <img src={globalLogo} alt="Global Logo" className="h-16 max-w-full object-contain mb-2" />
                  ) : (
                    <div className="w-10 h-10 bg-slate-200 rounded-full mb-2 flex items-center justify-center"><ImageIcon className="w-5 h-5 text-slate-400" /></div>
                  )}
                  <span className="text-[10px] font-medium text-brand-orange uppercase tracking-widest">Upload Logo</span>
                </div>
              </div>

              {/* Global Favicon */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Login Page Favicon</label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors relative h-32">
                  <input type="file" accept="image/x-icon,image/png" onChange={(e) => handleFileChange(e, setGlobalFavicon, true)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {globalFavicon ? (
                    <img src={globalFavicon} alt="Global Favicon" className="h-10 w-10 object-contain mb-2 rounded shadow-sm" />
                  ) : (
                    <div className="w-10 h-10 bg-slate-200 rounded-full mb-2 flex items-center justify-center"><Globe className="w-5 h-5 text-slate-400" /></div>
                  )}
                  <span className="text-[10px] font-medium text-brand-orange uppercase tracking-widest">Upload Favicon</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
              <button
                onClick={handleSaveGlobalBranding}
                disabled={globalSaving}
                className="px-5 py-2 flex items-center gap-2 bg-slate-800 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-slate-900 disabled:opacity-50 transition-colors"
              >
                <Check className="w-4 h-4" /> {globalSaving ? 'Saving...' : 'Save Login Branding'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-3">
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors" title="Back to List">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h4 className="font-bold text-slate-800">
                {editingCompanyId ? 'Edit Company Settings' : 'New Company'}
              </h4>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              {/* Basic Info Section */}
              <div>
                <h5 className="text-sm font-bold text-brand-charcoal border-b border-slate-100 pb-2 mb-4">Basic Information</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Company Name *</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Acme Corporation" className="block w-full rounded-md border-slate-200 pl-9 p-2 border sm:text-sm focus:ring-brand-orange focus:border-brand-orange bg-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@acme.com" className="block w-full rounded-md border-slate-200 pl-9 p-2 border sm:text-sm focus:ring-brand-orange focus:border-brand-orange bg-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 890" className="block w-full rounded-md border-slate-200 pl-9 p-2 border sm:text-sm focus:ring-brand-orange focus:border-brand-orange bg-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, City" className="block w-full rounded-md border-slate-200 pl-9 p-2 border sm:text-sm focus:ring-brand-orange focus:border-brand-orange bg-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Currency</label>
                    <div className="relative">
                      <select 
                        value={currency} 
                        onChange={e => setCurrency(e.target.value)}
                        className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm focus:ring-brand-orange focus:border-brand-orange text-slate-700 bg-white"
                      >
                        <option value="BDT ৳">BDT (৳)</option>
                        <option value="USD $">USD ($)</option>
                        <option value="EUR €">EUR (€)</option>
                        <option value="GBP £">GBP (£)</option>
                        <option value="INR ₹">INR (₹)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* SSO Configuration Section */}
              <div>
                <h5 className="text-sm font-bold text-brand-charcoal border-b border-slate-100 pb-2 mb-4">Microsoft SSO Configuration</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-full">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isSsoEnabled} 
                        onChange={(e) => setIsSsoEnabled(e.target.checked)}
                        className="rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                      />
                      <span className="text-sm font-bold text-slate-700">Enable Microsoft SSO</span>
                    </label>
                  </div>
                  {isSsoEnabled && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email Domain (e.g. acme.com) <span className="text-red-500">*</span></label>
                        <input type="text" value={ssoEmailDomain} onChange={e => setSsoEmailDomain(e.target.value)} required={isSsoEnabled} placeholder="acme.com" className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm focus:ring-brand-orange focus:border-brand-orange bg-white" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Client ID <span className="text-red-500">*</span></label>
                        <input type="text" value={ssoClientId} onChange={e => setSsoClientId(e.target.value)} required={isSsoEnabled} className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm focus:ring-brand-orange focus:border-brand-orange bg-white" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tenant ID <span className="text-red-500">*</span></label>
                        <input type="text" value={ssoTenantId} onChange={e => setSsoTenantId(e.target.value)} required={isSsoEnabled} className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm focus:ring-brand-orange focus:border-brand-orange bg-white" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Client Secret (Optional)</label>
                        <input type="password" value={ssoClientSecret} onChange={e => setSsoClientSecret(e.target.value)} className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm focus:ring-brand-orange focus:border-brand-orange bg-white" />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Branding Section */}
              <div>
                <h5 className="text-sm font-bold text-brand-charcoal border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-brand-orange" /> Brand Appearance
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Primary Logo */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">Primary Logo</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors relative h-32">
                      <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setLogoPrimary)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      {logoPrimary ? (
                        <img src={logoPrimary} alt="Primary" className="h-16 max-w-full object-contain mb-2" />
                      ) : (
                        <div className="w-10 h-10 bg-slate-200 rounded-full mb-2 flex items-center justify-center"><ImageIcon className="w-5 h-5 text-slate-400" /></div>
                      )}
                      <span className="text-[10px] font-medium text-brand-orange uppercase tracking-widest">Upload Primary</span>
                    </div>
                  </div>

                  {/* White Logo */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">White Logo</label>
                    <div className="border-2 border-dashed border-slate-700 rounded-lg p-4 flex flex-col items-center justify-center bg-brand-charcoal hover:bg-[#2c2c2b] transition-colors relative h-32">
                      <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setLogoWhite)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      {logoWhite ? (
                        <img src={logoWhite} alt="White" className="h-16 max-w-full object-contain mb-2 filter brightness-0 invert" />
                      ) : (
                        <div className="w-10 h-10 bg-slate-700 rounded-full mb-2 flex items-center justify-center"><ImageIcon className="w-5 h-5 text-slate-400" /></div>
                      )}
                      <span className="text-[10px] font-medium text-white uppercase tracking-widest">Upload White</span>
                    </div>
                  </div>

                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-6 py-2.5 flex items-center gap-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  <Check className="w-4 h-4" /> {submitting ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* Plugin Manager Section - Only for Super Admin */}
          {dbUser?.role === 'Super Admin' && (
            editingCompanyId ? (
              <div className="mt-8 mb-6">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                  <PluginManager companyId={editingCompanyId} />
                </div>
              </div>
            ) : (
              <div className="mt-8 mb-6">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Plugins & Modules</h3>
                  <p className="text-sm text-slate-500">
                    Please save this new company first. Once the company is registered, you will be able to enable and configure modules here.
                  </p>
                </div>
              </div>
            )
          )}
        </>
      )}

      {!showForm && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Company Name</th>
              <th className="px-6 py-4">Slug</th>
              <th className="px-6 py-4">Created At</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-100">
            {companies
              .filter(company => 
                (company.name?.toLowerCase().includes(searchQuery.toLowerCase()) || '') || 
                (company.slug?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
              )
              .map((company) => (
              <tr key={company.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4 font-bold text-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-brand-orange/10 text-brand-orange flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    {company.name}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-500 font-mono text-xs">{company.slug}</td>
                <td className="px-6 py-4 text-slate-500 text-xs">
                  {new Date(company.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  {canEdit && (
                    <button 
                      onClick={() => handleEdit(company)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 hover:text-brand-orange transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {companies.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.slug?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No companies found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
