export const fetchWithAuth = async (url: string, token: string | null, options: RequestInit = {}) => {
  if (!token) throw new Error("No token provided");
  
  const activeTenantId = localStorage.getItem('activeTenantId');
  
  const headers: any = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  if (activeTenantId) {
    headers['x-tenant-id'] = activeTenantId;
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'API Request Failed');
  }
  return response.json();
};
