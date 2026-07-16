import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface PluginProtectedRouteProps {
  pluginSlug: string;
  children: React.ReactNode;
}

export default function PluginProtectedRoute({ pluginSlug, children }: PluginProtectedRouteProps) {
  const { activePlugins, loading } = useAuth();

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center">Loading module...</div>;
  }

  // If the plugin is not in the active plugins list, block access
  if (!activePlugins.some(p => p.slug === pluginSlug)) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
          <p className="text-slate-500 text-sm">
            The <strong>{pluginSlug}</strong> module is currently inactive or not subscribed for your company.
          </p>
          <div className="pt-4">
            <a href="/" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-md shadow-sm text-white bg-brand-orange hover:bg-[#e06214] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange">
              Return Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
