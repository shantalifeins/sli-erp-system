import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useAuth } from './AuthProvider';

interface SettingsContextType {
  settings: Record<string, string>;
  loading: boolean;
  currencySymbol: string;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

/**
 * Parses a currency string like "BDT ৳" and returns just the symbol "৳".
 * Falls back to "৳" if parsing fails or no value is set.
 */
function parseCurrencySymbol(currencyValue?: string): string {
  if (!currencyValue) return '৳';
  const parts = currencyValue.trim().split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { company } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const currencySymbol = useMemo(() => parseCurrencySymbol(settings.currency), [settings.currency]);

  const fetchSettings = async () => {
    try {
      const query = company?.id ? `?companyId=${company.id}` : '';
      const res = await fetch(`/api/settings${query}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        
        // Dynamically apply favicon if present
        const dynamicFavicon = data.favicon || data.global_favicon || data.logo_primary || data.global_logo;
        if (dynamicFavicon) {
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = dynamicFavicon;
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [company?.id]);

  return (
    <SettingsContext.Provider value={{ settings, loading, currencySymbol, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

/**
 * Convenience hook to get the active currency symbol (e.g. "৳", "$", "€").
 * Must be used within a SettingsProvider.
 */
export function useCurrency(): string {
  const { currencySymbol } = useSettings();
  return currencySymbol;
}
