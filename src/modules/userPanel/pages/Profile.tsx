import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import {
  User, Mail, Phone, Briefcase, Building2, Camera, Save,
  KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Edit3, X, ChevronDown
} from 'lucide-react';

interface UserProfile {
  id: number;
  uid: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  designation: string | null;
  phone: string | null;
  role: string | null;
  department: string | null;
  status: string | null;
  branchName?: string | null;
  supervisorName?: string | null;
}

type AlertType = { type: 'success' | 'error'; message: string } | null;

function Alert({ alert, onClose }: { alert: AlertType; onClose: () => void }) {
  if (!alert) return null;
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium mb-5 border ${
        alert.type === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-red-50 border-red-200 text-red-700'
      }`}
    >
      {alert.type === 'success'
        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
        : <AlertCircle className="w-4 h-4 shrink-0" />}
      <span className="flex-1">{alert.message}</span>
      <button onClick={onClose} className="text-current opacity-60 hover:opacity-100">×</button>

    </div>
  );

}


function SearchableSelect({ 
  value, 
  onChange, 
  options, 
  placeholder 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  options: { value: string; label: string; subLabel?: string }[]; 
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  
  const filtered = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase()) || 
    (o.subLabel && o.subLabel.toLowerCase().includes(search.toLowerCase()))
  );
  
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={isOpen ? "relative z-50" : "relative"}>
      <div 
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus-within:ring-2 focus-within:ring-[#F37021]/50 bg-slate-50 cursor-pointer flex justify-between items-center min-h-[38px]"
      >
        <span className={selectedOption ? "text-slate-900 truncate pr-2" : "text-slate-400 truncate pr-2"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </div>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
          <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
            <div className="p-2 sticky top-0 bg-white border-b border-slate-100 z-10">
              <input 
                type="text" 
                placeholder="Search..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-1.5 text-sm focus:ring-[#F37021] focus:border-[#F37021] outline-none"
                onClick={e => e.stopPropagation()}
                autoFocus
              />
            </div>
            <div 
              className="px-3 py-2.5 text-sm hover:bg-slate-50 cursor-pointer text-slate-500 italic border-b border-slate-50"
              onClick={() => { onChange(''); setIsOpen(false); }}
            >
              None
            </div>
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-sm text-slate-400 text-center">No results found</div>
            ) : (
              filtered.map(opt => (
                <div 
                  key={opt.value} 
                  className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                  onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
                >
                  <div className="font-medium text-slate-700">{opt.label}</div>
                  {opt.subLabel && <div className="text-xs text-slate-400">{opt.subLabel}</div>}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function Profile() {
  const { getToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [alert, setAlert] = useState<AlertType>(null);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editRole, setEditRole] = useState('');
  const [editBranchId, setEditBranchId] = useState('');
  const [editSupervisorUid, setEditSupervisorUid] = useState('');
  const [masterData, setMasterData] = useState<{
    departments: any[];
    designations: any[];
    branches: any[];
    users: any[];
  }>({ departments: [], designations: [], branches: [], users: [] });


  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editDepartment, setEditDepartment] = useState('');

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const data: UserProfile = await fetchWithAuth('/api/profile', token);
      setProfile(data);
      setEditName(data.name || '');
      setEditPhone(data.phone || '');
      setEditDesignation(data.designation || '');
      setEditDepartment(data.department || '');
      setEditRole(data.role || '');
      
      try {
        const pending = await fetchWithAuth('/api/profile/change-request/pending', token);
        setPendingRequest(pending);
      } catch (e) {
        console.error('No pending request found or error', e);
      }
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  
  const openEditModal = async () => {
    setIsEditModalOpen(true);
    try {
      const token = await getToken();
      if (!token) return;
      const [deptRes, desigRes, branchRes, usersRes] = await Promise.all([
        fetchWithAuth('/api/departments', token),
        fetchWithAuth('/api/designations', token),
        fetchWithAuth('/api/branches', token),
        fetchWithAuth('/api/users?status=Active', token)
      ]);
      setMasterData({
        departments: Array.isArray(deptRes) ? deptRes : (deptRes?.data || []),
        designations: Array.isArray(desigRes) ? desigRes : (desigRes?.data || []),
        branches: Array.isArray(branchRes) ? branchRes : (branchRes?.data || []),
        users: Array.isArray(usersRes) ? usersRes : (usersRes?.data || [])
      });
      // pre-fill IDs if possible
      const branches = Array.isArray(branchRes) ? branchRes : (branchRes?.data || []);
      const matchedBranch = branches.find((b: any) => b.name === profile?.branchName);
      if (matchedBranch) setEditBranchId(matchedBranch.id.toString());
      
      const usersList = Array.isArray(usersRes) ? usersRes : (usersRes?.data || []);
      const matchedUser = usersList.find((u: any) => u.name === profile?.supervisorName);
      if (matchedUser) setEditSupervisorUid(matchedUser.uid);
    } catch (err) {
      console.error(err);
    }
  };

  
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingRequest) {
      showAlert('error', 'You already have a pending profile change request.');
      return;
    }
    try {
      setSaving(true);
      const token = await getToken();
      if (!token) return;
      const result = await fetchWithAuth('/api/profile/change-request', token, {
        method: 'POST',
        body: JSON.stringify({
          phone: editPhone,
          designation: editDesignation,
          department: editDepartment,
          role: editRole,
          branchId: editBranchId ? parseInt(editBranchId) : null,
          supervisorUid: editSupervisorUid || null
        }),
      });
      setPendingRequest(result);
      setIsEditModalOpen(false);
      showAlert('success', 'Profile change request submitted successfully!');
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to submit request');
    } finally {
      setSaving(false);
    }
  };


  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showAlert('error', 'Image size must be less than 2MB');
      return;
    }
    try {
      setAvatarUploading(true);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        const token = await getToken();
        if (!token) return;
        const result = await fetchWithAuth('/api/profile/avatar', token, {
          method: 'PUT',
          body: JSON.stringify({ avatarUrl: base64 }),
        });
        setProfile(prev => prev ? { ...prev, avatarUrl: result.avatarUrl } : prev);
        showAlert('success', 'Profile picture updated!');
        setAvatarUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to upload avatar');
      setAvatarUploading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showAlert('error', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      showAlert('error', 'Password must be at least 6 characters');
      return;
    }
    try {
      setChangingPassword(true);
      const token = await getToken();
      if (!token) return;
      await fetchWithAuth('/api/profile/password', token, {
        method: 'PUT',
        body: JSON.stringify({ newPassword }),
      });
      showAlert('success', 'Password changed successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mr-3" />
        Loading profile...
      </div>
    );
  }

  const initials = (profile?.name || profile?.email || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-1">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">View and manage your personal information</p>
      </div>

      <Alert alert={alert} onClose={() => setAlert(null)} />

      
      {pendingRequest && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-5 py-4 rounded-2xl mb-6 flex items-start gap-3 shadow-sm">
          <Loader2 className="w-5 h-5 text-amber-500 animate-spin shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Update Request Pending</h4>
            <p className="text-sm text-amber-700/80 mt-1">
              Your profile data change request has been submitted and is currently <strong>Pending HR Approval</strong>. It will be updated once approved.
            </p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">


        {/* ── Left: Avatar + Summary card ── */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Header gradient */}
            <div className="h-24 bg-gradient-to-br from-[#F37021] to-[#e05e10]" />

            {/* Avatar */}
            <div className="px-6 pb-6">
              <div className="relative -mt-12 mb-4 w-fit">
                <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-brand-olive">
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                      {initials}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#F37021] hover:bg-[#e05e10] text-white rounded-full flex items-center justify-center shadow-md transition-colors disabled:opacity-50"
                  title="Change photo"
                >
                  {avatarUploading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Camera className="w-4 h-4" />
                  }
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <h2 className="text-lg font-bold text-slate-800">{profile?.name || 'No name set'}</h2>
              <p className="text-sm text-slate-400 mt-0.5">{profile?.email}</p>

              <div className="mt-4 space-y-2">
                {profile?.role && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="inline-flex items-center gap-1 bg-[#F37021]/10 text-[#F37021] px-3 py-1 rounded-full text-xs font-semibold">
                      {profile.role}
                    </span>
                  </div>
                )}
                {profile?.status && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                      profile.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-red-50 text-red-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${profile.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {profile.status}
                    </span>
                  </div>
                )}
              </div>

              </div>
          </div>
        </div>

        {/* ── Right: Edit forms ── */}
        <div className="xl:col-span-2 space-y-6">

          
          {/* Personal Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Edit3 className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Personal Information</h3>
                  <p className="text-xs text-slate-400">Your current profile details</p>
                </div>
              </div>
              <button 
                onClick={openEditModal}
                disabled={!!pendingRequest}
                className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Request Change
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Full Name</p>
                <p className="text-sm font-medium text-slate-800">{profile?.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email</p>
                <p className="text-sm font-medium text-slate-800">{profile?.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Phone Number</p>
                <p className="text-sm font-medium text-slate-800">{profile?.phone || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Designation</p>
                <p className="text-sm font-medium text-slate-800">{profile?.designation || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Department</p>
                <p className="text-sm font-medium text-slate-800">{profile?.department || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Office (Branch)</p>
                <p className="text-sm font-medium text-slate-800">{profile?.branchName || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Supervisor</p>
                <p className="text-sm font-medium text-slate-800">{profile?.supervisorName || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Role</p>
                <p className="text-sm font-medium text-slate-800">{profile?.role || '-'}</p>
              </div>
            </div>
          </div>


          {/* Change Password */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Change Password</h3>
                <p className="text-xs text-slate-400">Minimum 6 characters required</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Old password */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    placeholder="Your current password"
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-400 bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New password + confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="New password"
                      className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-400 bg-slate-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className={`w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 bg-slate-50 ${
                        confirmPassword && confirmPassword !== newPassword
                          ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                          : 'border-slate-200 focus:ring-amber-300/50 focus:border-amber-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>
              </div>

              {/* Password strength indicator */}
              {newPassword && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(level => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          newPassword.length >= level * 3
                            ? level <= 1 ? 'bg-red-400'
                              : level <= 2 ? 'bg-amber-400'
                              : level <= 3 ? 'bg-blue-400'
                              : 'bg-emerald-500'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">
                    {newPassword.length < 6 ? 'Too short' : newPassword.length < 9 ? 'Fair' : newPassword.length < 12 ? 'Good' : 'Strong'}
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changingPassword || !newPassword || !confirmPassword}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      {/* ── Edit Modal ── */}
      {/* ── Edit Modal ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Request Profile Update</h3>
                <p className="text-sm text-slate-500">Submit a request to HR to update your information.</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="profileEditForm" onSubmit={handleSaveDetails} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Phone Number</label>
                    <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F37021]/50 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Requested Role</label>
                    <input type="text" value={editRole} onChange={e => setEditRole(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F37021]/50 bg-slate-50" placeholder="e.g. SLI Employee" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Department</label>
                    <SearchableSelect 
                      value={editDepartment} 
                      onChange={setEditDepartment} 
                      placeholder="Select Department"
                      options={masterData.departments.map(d => ({ value: d.name, label: d.name }))} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Designation</label>
                    <SearchableSelect 
                      value={editDesignation} 
                      onChange={setEditDesignation} 
                      placeholder="Select Designation"
                      options={masterData.designations.map(d => ({ value: d.name, label: d.name }))} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Office (Branch)</label>
                    <SearchableSelect 
                      value={editBranchId} 
                      onChange={setEditBranchId} 
                      placeholder="Select Branch"
                      options={masterData.branches.map(b => ({ value: b.id.toString(), label: b.name }))} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Supervisor</label>
                    <SearchableSelect 
                      value={editSupervisorUid} 
                      onChange={setEditSupervisorUid} 
                      placeholder="Select Supervisor"
                      options={masterData.users.map(u => ({ value: u.uid, label: u.name || 'Unknown', subLabel: u.email }))} 
                    />
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
              <button form="profileEditForm" type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-[#F37021] hover:bg-[#e05e10] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
