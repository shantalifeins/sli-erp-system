import React from 'react';
import { useAuth } from './AuthProvider';
import { ShieldAlert } from 'lucide-react';

interface PermissionProtectedRouteProps {
  menu: string;
  action?: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canApprove';
  children: React.ReactNode;
}

export default function PermissionProtectedRoute({ menu, action = 'canView', children }: PermissionProtectedRouteProps) {
  const { dbUser, permissions, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center text-slate-500">
        Verifying permissions...
      </div>
    );
  }

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const userPerm = permissions?.find((p: any) => p.module === menu);

  const hasAccess = isSuperAdmin || (userPerm && (userPerm[action] || userPerm.canView));

  if (!hasAccess) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
          <p className="text-slate-500 text-sm">
            Your current role (<strong className="text-slate-700">{dbUser?.role || 'User'}</strong>) does not have permission to access the <strong>{menu}</strong> page.
          </p>
          <p className="text-xs text-slate-400">
            Please contact your System Administrator if you require access to this module.
          </p>
          <div className="pt-4">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-md shadow-sm text-white bg-slate-800 hover:bg-slate-900 focus:outline-none"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
