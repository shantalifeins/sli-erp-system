import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/src/shared/lib/supabase';
import { User } from '@supabase/supabase-js';

export interface PluginData {
  slug: string;
  settings: any;
}

interface AuthContextType {
  user: User | null;
  dbUser: any | null;
  company: any | null;
  permissions: any[];
  activePlugins: PluginData[];
  loading: boolean;
  signIn: () => Promise<void>;
  signInWithEmail?: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  activeTenantId: string | null;
  setActiveTenantId: (id: string | null) => void;
  availableCompanies: any[];
  isGlobalSuperAdmin: boolean;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUser: null,
  company: null,
  permissions: [],
  activePlugins: [],
  loading: true,
  signIn: async () => { },
  signInWithEmail: async () => { },
  signOut: async () => { },
  activeTenantId: null,
  setActiveTenantId: () => {},
  availableCompanies: [],
  isGlobalSuperAdmin: false,
  getToken: async () => null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<any | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [activePlugins, setActivePlugins] = useState<PluginData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTenantId, setActiveTenantIdState] = useState<string | null>(localStorage.getItem('activeTenantId'));
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
  const [isGlobalSuperAdmin, setIsGlobalSuperAdmin] = useState(false);

  const setActiveTenantId = (id: string | null) => {
    setActiveTenantIdState(id);
    if (id) {
      localStorage.setItem('activeTenantId', id);
      const matched = availableCompanies.find(c => c.id === id);
      if (matched) setCompany(matched);
    } else {
      localStorage.removeItem('activeTenantId');
    }
    // Reload the page to refresh context for the new tenant
    window.location.reload();
  };

  useEffect(() => {
    const syncUser = async (currentUser: User | null) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;

          if (!token) throw new Error('No token found');

          let response = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          let retries = 3;
          while (!response.ok && response.status >= 500 && retries > 0) {
            console.warn(`Backend sync failed with ${response.status}, retrying...`);
            await new Promise(r => setTimeout(r, 1000));
            response = await fetch('/api/auth/sync', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            retries--;
          }
          if (response.ok) {
            const data = await response.json();
            setPermissions(data.permissions || []);
            setAvailableCompanies(data.availableCompanies || []);
            
            const isGSA = data.user?.role === 'Super Admin' && !data.user?.companyId;
            setIsGlobalSuperAdmin(isGSA);
            
            let finalCompany = data.company || null;
            let finalTenantId = data.company?.id || null;

            if (isGSA) {
              const savedTenant = localStorage.getItem('activeTenantId');
              if (!savedTenant && data.availableCompanies?.length > 0) {
                finalTenantId = data.availableCompanies[0].id;
                finalCompany = data.availableCompanies[0];
                localStorage.setItem('activeTenantId', finalTenantId);
              } else if (savedTenant) {
                const matched = data.availableCompanies?.find((c:any) => c.id === savedTenant);
                if (matched) {
                  finalCompany = matched;
                  finalTenantId = savedTenant;
                }
              }
            } else {
              localStorage.removeItem('activeTenantId');
            }

            setCompany(finalCompany);
            setActiveTenantIdState(finalTenantId);

            // Fetch active plugins in parallel (or you can merge this into /api/auth/sync on backend)
            try {
              const headers: any = { 'Authorization': `Bearer ${token}` };
              const currentTenant = isGSA ? localStorage.getItem('activeTenantId') : null;
              if (currentTenant) headers['x-tenant-id'] = currentTenant;

              const pluginRes = await fetch('/api/plugins/active', { headers });
              if (pluginRes.ok) {
                const pluginData = await pluginRes.json();
                setActivePlugins(pluginData.plugins || []);
              }
            } catch (err) {
              console.error("Failed to fetch active plugins", err);
            }

            // Set dbUser last to prevent premature navigation or access denied flashes
            setDbUser(data.user);
          } else {
            console.error('Failed to sync user with backend', response.statusText);
            if (response.status === 401 || response.status === 403) {
              setUser(null);
              setDbUser(null);
              setCompany(null);
              setPermissions([]);
              setActivePlugins([]);
              // Ensure the dead/rejected session is removed from local storage
              await supabase.auth.signOut();
              setAvailableCompanies([]);
              setIsGlobalSuperAdmin(false);
            }
          }
        } catch (e: any) {
          console.error('Failed to sync user with backend', e);
          // Don't auto-logout on network error, but app may crash if dbUser is missing
        }
      } else {
        setDbUser(null);
        setCompany(null);
        setPermissions([]);
        setActivePlugins([]);
        setAvailableCompanies([]);
        setIsGlobalSuperAdmin(false);
      }
      setLoading(false);
    };

    // Initial session fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncUser(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google'
      });
    } catch (error) {
      console.error('Error signing in', error);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const getToken = async () => {
    if (user) {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    }
    return null;
  };

  return (
    <AuthContext.Provider value={{ 
      user, dbUser, company, permissions, activePlugins, loading, 
      signIn, signInWithEmail, signOut, getToken,
      activeTenantId, setActiveTenantId, availableCompanies, isGlobalSuperAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};
