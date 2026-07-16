import React, { useEffect } from 'react';
import { useLayoutControl, SearchConfig, PaginationConfig } from '@/src/shared/contexts/LayoutContext';

interface PageLayoutProps {
  children: React.ReactNode;
  loading?: boolean;
  search?: SearchConfig;
  pagination?: PaginationConfig;
}

export default function PageLayout({ children, loading, search, pagination }: PageLayoutProps) {
  const { setGlobalLoading, setSearchConfig, setPaginationConfig } = useLayoutControl();

  useEffect(() => {
    setGlobalLoading(!!loading);
    return () => setGlobalLoading(false);
  }, [loading, setGlobalLoading]);

  useEffect(() => {
    setSearchConfig(search || null);
    return () => setSearchConfig(null);
  }, [search?.onSearch, search?.placeholder, setSearchConfig]);

  useEffect(() => {
    setPaginationConfig(pagination || null);
    return () => setPaginationConfig(null);
  }, [pagination?.currentPage, pagination?.totalPages, pagination?.onPageChange, setPaginationConfig]);

  return <>{children}</>;
}
