import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  QrCode, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Building, 
  ShieldAlert, 
  RefreshCw, 
  CheckSquare, 
  FileText
} from 'lucide-react';
import { useAuth } from '@/src/shared/components/AuthProvider';

interface VerificationSession {
  id: string;
  verificationCode: string;
  branchId: number | null;
  branchName: string | null;
  status: string;
  verificationDate: string;
  verifiedByName: string;
  totalAssetsCounted: number;
  totalMissing: number;
  totalMisplaced: number;
  notes: string | null;
  createdAt: string;
}

interface VerificationDetail {
  id: string;
  verificationId: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  serialNumber: string | null;
  categoryName: string | null;
  expectedBranchId: number | null;
  foundBranchId: number | null;
  condition: string;
  verificationStatus: string;
  scannedAt: string | null;
  notes: string | null;
}

export default function AssetVerification() {
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [sessions, setSessions] = useState<VerificationSession[]>([]);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Form state for Starting Session
  const [showStartModal, setShowStartModal] = useState<boolean>(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [startNotes, setStartNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Active Session Detail View
  const [activeSession, setActiveSession] = useState<VerificationSession | null>(null);
  const [sessionDetails, setSessionDetails] = useState<VerificationDetail[]>([]);
  const [scanCodeInput, setScanCodeInput] = useState<string>('');
  const [scanCondition, setScanCondition] = useState<string>('Good');
  const [scanNotes, setScanNotes] = useState<string>('');
  const [detailFilter, setDetailFilter] = useState<string>('');

  // Fetch branches and sessions
  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const [resSessions, resBranches] = await Promise.all([
        fetch('/api/assets/verifications', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/branches', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (resSessions.ok) {
        const data = await resSessions.json();
        setSessions(data.verifications || []);
      }
      if (resBranches.ok) {
        const branchData = await resBranches.json();
        setBranches(branchData.branches || branchData || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load physical verification sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [getToken]);

  // Open a session detail view
  const openSessionDetail = async (session: VerificationSession) => {
    setActiveSession(session);
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/assets/verifications/${session.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSession(data.session);
        setSessionDetails(data.details || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  // Start new physical verification audit
  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/assets/verifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          branchId: selectedBranchId ? Number(selectedBranchId) : null,
          notes: startNotes
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to start verification audit session');
      }

      const data = await res.json();
      setShowStartModal(false);
      setSelectedBranchId('');
      setStartNotes('');
      await fetchSessions();
      openSessionDetail(data.verification);
    } catch (err: any) {
      setError(err.message || 'Error starting session');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Scan/Audit an Asset Code inside active session
  const handleAuditScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !scanCodeInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/assets/verifications/${activeSession.id}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          assetCode: scanCodeInput.trim(),
          condition: scanCondition,
          notes: scanNotes
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to record asset scan');
      }

      setScanCodeInput('');
      setScanNotes('');
      // Reload active session details
      await openSessionDetail(activeSession);
    } catch (err: any) {
      setError(err.message || 'Error recording audit scan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Audit scan line by line
  const handleLineScan = async (detailId: string, condition: string) => {
    if (!activeSession) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/assets/verifications/${activeSession.id}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          detailId,
          condition
        })
      });
      if (res.ok) {
        openSessionDetail(activeSession);
      }
    } catch (err) {
      console.error('Scan error:', err);
    }
  };

  // Complete Audit Session
  const handleCompleteSession = async () => {
    if (!activeSession || isSubmitting) return;
    if (!window.confirm('Are you sure you want to complete this verification audit? Any unverified assets will be marked as Missing.')) return;

    setIsSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/assets/verifications/${activeSession.id}/complete`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to complete audit session');

      await fetchSessions();
      setActiveSession(null);
    } catch (err: any) {
      setError(err.message || 'Error completing audit session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDetails = sessionDetails.filter(d => {
    if (!detailFilter) return true;
    return d.verificationStatus === detailFilter;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Local Header Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => activeSession ? setActiveSession(null) : navigate('/asset-dashboard')}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <QrCode className="w-6 h-6 text-brand-orange" />
              {activeSession ? `Audit Session: ${activeSession.verificationCode}` : 'Physical Verification Audits'}
            </h1>
            <p className="text-sm text-slate-500">
              {activeSession 
                ? `Branch: ${activeSession.branchName || 'All Branches'} | Status: ${activeSession.status}` 
                : 'Manage QR/Barcode physical asset count sessions and discrepancy audits.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeSession ? (
            activeSession.status === 'In-Progress' && (
              <button
                onClick={handleCompleteSession}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Complete Audit Session
              </button>
            )
          ) : (
            <button
              onClick={() => setShowStartModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-orange hover:bg-brand-orange/90 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Audit Session
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* VIEW 1: SESSIONS LIST */}
      {!activeSession && (() => {
        const totalPages = Math.ceil(sessions.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedSessions = sessions.slice(startIndex, startIndex + itemsPerPage);

        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Audit Code</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Auditor</th>
                    <th className="py-3 px-4 text-center">Counted</th>
                    <th className="py-3 px-4 text-center">Missing</th>
                    <th className="py-3 px-4 text-center">Misplaced</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No physical verification audit sessions found. Click "New Audit Session" to start.
                      </td>
                    </tr>
                  ) : (
                    paginatedSessions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-brand-orange">
                          {s.verificationCode}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{s.branchName || 'All Branches'}</td>
                        <td className="py-3 px-4 text-slate-600">{s.verifiedByName || 'System'}</td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-800">{s.totalAssetsCounted}</td>
                        <td className="py-3 px-4 text-center font-semibold text-rose-600">{s.totalMissing}</td>
                        <td className="py-3 px-4 text-center font-semibold text-amber-600">{s.totalMisplaced}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            s.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openSessionDetail(s)}
                            className="px-3 py-1.5 text-xs font-medium text-brand-orange bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                          >
                            Open Session
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(startIndex + itemsPerPage, sessions.length)}</span> of{' '}
                  <span className="font-medium">{sessions.length}</span> results
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-600 px-2 font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* VIEW 2: ACTIVE SESSION AUDIT WORKSPACE */}
      {activeSession && (
        <div className="space-y-6">
          {/* Quick Scan Input Bar */}
          {activeSession.status === 'In-Progress' && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-brand-orange" />
                Scan Asset Tag / Manual Code Entry
              </h3>
              <form onSubmit={handleAuditScan} className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[240px]">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Asset Tag Code / Serial No.
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AST-20260906-0001"
                    value={scanCodeInput}
                    onChange={(e) => setScanCodeInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange font-mono"
                  />
                </div>

                <div className="w-48">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Asset Condition</label>
                  <select
                    value={scanCondition}
                    onChange={(e) => setScanCondition(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange bg-white"
                  >
                    <option value="Good">Good</option>
                    <option value="Damaged">Damaged</option>
                    <option value="NeedsRepair">Needs Repair</option>
                    <option value="Missing">Missing</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  Record Audit
                </button>
              </form>
            </div>
          )}

          {/* Session Detail Lines */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">Asset Audit Register Lines</h3>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Filter Status:</span>
                <select
                  value={detailFilter}
                  onChange={(e) => setDetailFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="Verified">Verified</option>
                  <option value="Misplaced">Misplaced</option>
                  <option value="Missing">Missing</option>
                  <option value="Unverified">Unverified</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Asset Code</th>
                    <th className="py-3 px-4">Asset Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Condition</th>
                    <th className="py-3 px-4 text-center">Audit Status</th>
                    <th className="py-3 px-4">Scanned At</th>
                    {activeSession.status === 'In-Progress' && <th className="py-3 px-4 text-right">Quick Mark</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDetails.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No asset detail lines match selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredDetails.map((detail) => (
                      <tr key={detail.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-brand-orange">
                          {detail.assetCode}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{detail.assetName}</td>
                        <td className="py-3 px-4 text-slate-600">{detail.categoryName || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                            detail.condition === 'Good' ? 'bg-emerald-50 text-emerald-700' :
                            detail.condition === 'Missing' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {detail.condition}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            detail.verificationStatus === 'Verified' ? 'bg-emerald-100 text-emerald-700' :
                            detail.verificationStatus === 'Misplaced' ? 'bg-amber-100 text-amber-700' :
                            detail.verificationStatus === 'Missing' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {detail.verificationStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-xs">
                          {detail.scannedAt ? new Date(detail.scannedAt).toLocaleTimeString() : '-'}
                        </td>
                        {activeSession.status === 'In-Progress' && (
                          <td className="py-3 px-4 text-right space-x-1">
                            <button
                              onClick={() => handleLineScan(detail.id, 'Good')}
                              className="px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded transition-colors"
                            >
                              ✓ Verify Good
                            </button>
                            <button
                              onClick={() => handleLineScan(detail.id, 'Damaged')}
                              className="px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 rounded transition-colors"
                            >
                              ⚠️ Damaged
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: START NEW AUDIT SESSION */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-brand-orange" />
              Start Physical Verification Audit
            </h2>

            <form onSubmit={handleStartSession} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Target Branch Scope
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-orange bg-white"
                >
                  <option value="">All Company Branches (Company-wide)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Audit Notes / Scope Description
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Q3 Annual Physical Verification Audit"
                  value={startNotes}
                  onChange={(e) => setStartNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-orange"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStartModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-brand-orange hover:bg-brand-orange/90 rounded-lg transition-colors"
                >
                  {isSubmitting ? 'Starting...' : 'Start Audit Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
