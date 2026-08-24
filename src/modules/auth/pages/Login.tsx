import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { PublicClientApplication } from '@azure/msal-browser';
import { supabase } from '@/src/shared/lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signInWithEmail, user, dbUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSsoModal, setShowSsoModal] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(
    typeof window !== 'undefined' && (
      window.location.hash.includes('code=') || window.location.hash.includes('state=') ||
      window.location.search.includes('code=') || window.location.search.includes('state=')
    )
  );
  const isProcessingRef = React.useRef(false);
  const [ssoEmail, setSsoEmail] = useState(() => {
    try { return localStorage.getItem('_ssoEmail') || ''; } catch { return ''; }
  });

  // Fetch global branding (logo & favicon) for login page — not tenant-specific
  // Read cached global branding instantly (no flicker on repeat visits)
  const [globalLogo, setGlobalLogo] = useState<string | null>(() => {
    try { return localStorage.getItem('_globalLogo'); } catch { return null; }
  });

  useEffect(() => {
    // Fetch fresh global branding in background, update cache
    (async () => {
      try {
        const res = await fetch('/api/settings/global', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.global_logo) {
            setGlobalLogo(data.global_logo);
            try { localStorage.setItem('_globalLogo', data.global_logo); } catch {}
          }
          if (data.global_favicon) {
            try { localStorage.setItem('_globalFavicon', data.global_favicon); } catch {}
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.head.appendChild(link);
            }
            link.href = data.global_favicon;
          }
        }
      } catch (err) {
        console.error('Failed to fetch global settings:', err);
      }
    })();

    // Also apply cached favicon instantly
    try {
      const cachedFav = localStorage.getItem('_globalFavicon');
      if (cachedFav) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = cachedFav;
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!authLoading && user && dbUser) {
      navigate('/user-dashboard');
    }
  }, [user, dbUser, authLoading, navigate]);

  // Handle MSAL Redirect Return
  useEffect(() => {
    // Check if we returned from Microsoft login (URL has code or state)
    if (
      window.location.hash.includes('code=') || window.location.hash.includes('state=') ||
      window.location.search.includes('code=') || window.location.search.includes('state=')
    ) {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      setGlobalLoading(true);
      
      const email = localStorage.getItem('_ssoEmail');
      if (email) {
        const domain = email.split('@')[1];
        fetch(`/api/auth/sso/sso-config?domain=${domain}`)
          .then(res => res.json())
          .then(async (config) => {
            if (config.clientId && config.tenantId) {
              const msalConfig = {
                auth: {
                  clientId: config.clientId,
                  authority: `https://login.microsoftonline.com/${config.tenantId}`,
                  redirectUri: window.location.origin + '/login',
                },
                cache: {
                  cacheLocation: 'localStorage',
                  storeAuthStateInCookie: true,
                }
              };
              const msalInstance = new PublicClientApplication(msalConfig);
              await msalInstance.initialize();
              
              const response = await msalInstance.handleRedirectPromise();
              if (response) {
                const ssoRes = await fetch('/api/auth/sso/microsoft', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ accessToken: response.accessToken, domain })
                });
                const ssoData = await ssoRes.json();
                if (ssoRes.status === 202) {
                  setError(ssoData.message || 'Account is pending HR approval.');
                } else if (!ssoRes.ok) {
                  throw new Error(ssoData.error || 'Failed to login via SSO');
                } else {
                  const { error: sessionError } = await supabase.auth.setSession({ 
                    access_token: ssoData.token, 
                    refresh_token: ssoData.refreshToken || ssoData.token 
                  });
                  if (sessionError) {
                    console.error('Set Session Error:', sessionError);
                    throw new Error(`Session Error: ${sessionError.message}`);
                  }
                  // Clear URL on success
                  window.history.replaceState({}, document.title, window.location.pathname);
                }
              }
            }
          })
          .catch(async (err) => {
            console.error("MSAL Redirect Error:", err);
            // Clear stuck MSAL state immediately
            Object.keys(localStorage).forEach(key => { if (key.includes('msal')) localStorage.removeItem(key); });
            Object.keys(sessionStorage).forEach(key => { if (key.includes('msal')) sessionStorage.removeItem(key); });

            if (err.message && err.message.includes('state_mismatch')) {
              console.log("Auto-retrying MSAL login due to state mismatch...");
              if (email) {
                const domain = email.split('@')[1];
                try {
                  const configRes = await fetch(`/api/auth/sso/sso-config?domain=${domain}`);
                  if (configRes.ok) {
                    const config = await configRes.json();
                    const msalConfig = {
                      auth: {
                        clientId: config.clientId,
                        authority: `https://login.microsoftonline.com/${config.tenantId}`,
                        redirectUri: window.location.origin + '/login',
                      },
                      cache: { cacheLocation: 'localStorage', storeAuthStateInCookie: true }
                    };
                    const msalInstance = new PublicClientApplication(msalConfig);
                    await msalInstance.initialize();
                    
                    // Clear any lingering interaction state before redirecting
                    Object.keys(localStorage).forEach(key => { if (key.includes(config.clientId)) localStorage.removeItem(key); });
                    Object.keys(sessionStorage).forEach(key => { if (key.includes(config.clientId)) sessionStorage.removeItem(key); });

                    await msalInstance.loginRedirect({
                      scopes: ["user.read"],
                      prompt: "select_account",
                      loginHint: email
                    });
                    // DO NOT clear loading state or history if we are redirecting again
                    return;
                  }
                } catch (retryErr) {
                  console.error("Auto-retry failed", retryErr);
                }
              }
              setError('Login session expired. Please click "Continue with Microsoft" again.');
            } else {
              setError(err.message || 'Failed to process Microsoft redirect');
            }
            
            setGlobalLoading(false);
            window.history.replaceState({}, document.title, window.location.pathname);
          });
      } else {
        setGlobalLoading(false);
        setError('Login session was lost during redirect. Please try again in this exact browser window.');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const processMicrosoftLogin = async (e?: React.FormEvent, isRetry = false) => {
    if (e) e.preventDefault();
    if (!ssoEmail) {
      setError('Please enter your email address first to use SSO.');
      return;
    }
    const domain = ssoEmail.split('@')[1];
    if (!domain) {
      setError('Invalid email address.');
      return;
    }

    try {
      try { localStorage.setItem('_ssoEmail', ssoEmail); } catch {}
      setLoading(true);
      setError('');
      
      const configRes = await fetch(`/api/auth/sso/sso-config?domain=${domain}`);
      if (!configRes.ok) {
        if (configRes.status === 404) {
          throw new Error('SSO is not configured for your domain.');
        }
        throw new Error('Failed to fetch SSO config.');
      }
      
      const { clientId, tenantId } = await configRes.json();
      
      const msalConfig = {
        auth: {
          clientId: clientId,
          authority: `https://login.microsoftonline.com/${tenantId}`,
          redirectUri: window.location.origin + '/login',
        },
        cache: {
          cacheLocation: 'localStorage',
          storeAuthStateInCookie: true,
        }
      };
      
      const msalInstance = new PublicClientApplication(msalConfig);
      await msalInstance.initialize();
      
      // Clear any old MSAL state to ensure a clean login and prevent state_mismatch
      Object.keys(localStorage).forEach(key => {
        if (key.includes('msal') || key.includes(clientId)) localStorage.removeItem(key);
      });
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('msal') || key.includes(clientId)) sessionStorage.removeItem(key);
      });

      // Redirect the entire page to Microsoft
      await msalInstance.loginRedirect({
        scopes: ["user.read"],
        prompt: "select_account",
        loginHint: ssoEmail
      });
      
      // We don't need to do anything else here, as the page will redirect.
    } catch (err: any) {
      console.error("MSAL Login Error:", err);
      if (err.errorCode === 'interaction_in_progress' || err?.message?.includes('interaction_in_progress') || err?.message?.includes('state_mismatch')) {
        // Clear MSAL's stuck interaction state from both storages
        Object.keys(sessionStorage).forEach(key => {
          if (key.includes('msal')) sessionStorage.removeItem(key);
        });
        Object.keys(localStorage).forEach(key => {
          if (key.includes('msal')) localStorage.removeItem(key);
        });
        
        if (!isRetry) {
          console.log("Auto-retrying Microsoft login...");
          return processMicrosoftLogin(undefined, true);
        } else {
          setError('Login session expired. Please refresh the page and try again.');
        }
      } else {
        setError(err.message || 'Microsoft login failed');
      }
      setLoading(false);
      setShowSsoModal(false);
    }
  };
  if (globalLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4]">
         <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F37021]"></div>
            <p className="mt-4 text-gray-600 font-medium">Processing Microsoft Sign-In...</p>
         </div>
      </div>
    );
  }

  // Prevent flashing the login form if we are still checking the session
  // Or if we already have a user and are about to redirect
  if (authLoading || (user && dbUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4]">
         <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F37021]"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading...</p>
         </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      if (signInWithEmail) {
        await signInWithEmail(email.trim(), password);
      } else {
        throw new Error('signInWithEmail not implemented');
      }
      // Note: Navigation is now handled by the useEffect above
    } catch (err: any) {
      setError(err.message || 'Failed to login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[420px] w-full bg-white p-10 pb-12 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <img
            src={globalLogo || '/logo-primary.png'}
            alt="Brand Logo"
            className="h-32 w-auto object-contain"
          />
          <p className="mt-4 text-center text-[10px] font-bold text-[#A19A36] tracking-widest uppercase">
            Empowering Enterprise Operations
          </p>
        </div>

        {/* Form */}
        <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="text-red-600 text-sm text-center font-semibold bg-red-50 border border-red-100 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Email address
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              className="appearance-none block w-full px-4 py-3 border border-gray-200 bg-gray-50/50 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#F37021]/50 focus:border-[#F37021] sm:text-sm transition-colors"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                className="appearance-none block w-full px-4 py-3 pr-10 border border-gray-200 bg-gray-50/50 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#F37021]/50 focus:border-[#F37021] sm:text-sm transition-colors"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Eye className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-[#F37021] hover:bg-[#E06015] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F37021] disabled:opacity-50 transition-all shadow-sm"
            >
              {loading ? 'Signing in...' : 'Sign in with Email'}
            </button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500 font-medium">Or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSsoModal(true)}
              disabled={loading}
              className="group relative w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-gray-300 text-sm font-bold rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F37021] disabled:opacity-50 transition-all shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 0H0V10H10V0Z" fill="#f25022"/>
                <path d="M21 0H11V10H21V0Z" fill="#7fba00"/>
                <path d="M10 11H0V21H10V11Z" fill="#00a4ef"/>
                <path d="M21 11H11V21H21V11Z" fill="#ffb900"/>
              </svg>
              Sign in with Microsoft
            </button>
          </div>
        </form>
      </div>

      {/* SSO Email Modal */}
      {showSsoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowSsoModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Microsoft Single Sign-On</h3>
            <p className="text-sm text-gray-500 mb-6">Enter your company email to continue with Microsoft.</p>
            
            <form onSubmit={processMicrosoftLogin} className="space-y-4">
              <div>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="appearance-none block w-full px-4 py-3 border border-gray-200 bg-gray-50/50 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#F37021]/50 focus:border-[#F37021] sm:text-sm transition-colors"
                  placeholder="name@company.com"
                  value={ssoEmail}
                  onChange={e => setSsoEmail(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 transition-all"
              >
                {loading ? 'Processing...' : 'Continue with Microsoft'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}