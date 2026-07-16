import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface PaginationConfig {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
}

export interface SearchConfig {
  placeholder?: string;
  onSearch: (query: string) => void;
}

interface LayoutContextType {
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
  searchConfig: SearchConfig | null;
  setSearchConfig: (config: SearchConfig | null) => void;
  paginationConfig: PaginationConfig | null;
  setPaginationConfig: (config: PaginationConfig | null) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [globalLoading, setGlobalLoading] = useState(false);
  const [searchConfig, setSearchConfig] = useState<SearchConfig | null>(null);
  const [paginationConfig, setPaginationConfig] = useState<PaginationConfig | null>(null);

  return (
    <LayoutContext.Provider value={{
      globalLoading, setGlobalLoading,
      searchConfig, setSearchConfig,
      paginationConfig, setPaginationConfig
    }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutControl() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayoutControl must be used within a LayoutProvider');
  }
  return context;
}
