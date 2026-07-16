import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { LayoutDashboard, ShoppingCart, Box, Users, LogOut, FileText, Shield, ArrowLeft, ChevronDown, Image as ImageIcon, User as UserIcon, Truck, ClipboardCheck, DollarSign, FileSpreadsheet, Send, Loader2, ChevronLeft, ChevronRight, Tags, Menu, X, Network, ArrowDownToLine, ArrowUpFromLine, Bell, LayoutList, Inbox, Mail, Settings, Warehouse, ClipboardList, ArrowRightLeft, LayoutGrid } from 'lucide-react';
import { cn } from '@/src/shared/lib/utils';
import { useLayoutControl } from '@/src/shared/contexts/LayoutContext';

import Logo from './Logo.js';
import NotificationBell from './NotificationBell.js';

function SidebarGroup({ item, pathname, search, closeSidebar }: { key?: React.Key, item: any, pathname: string, search: string, closeSidebar: () => void }) {
  const [expanded, setExpanded] = useState(false);
  if (item.show === false) return null;

  if (item.subMenus) {
    return (
      <div className="mb-2">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-brand-seashell/70 hover:bg-white/5 hover:text-white transition-colors border-l-2 border-transparent rounded-r-md focus:outline-none"
        >
          <span>{item.name}</span>
          <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", expanded ? "rotate-180" : "")} />
        </button>
        {expanded && (
          <div className="mt-1 space-y-1">
            {item.subMenus.map((sub: any) => {
              if (sub.show === false) return null;
              const fullPath = pathname + search;
              const isActive = fullPath === sub.href;
              return (
                <Link
                  key={sub.name}
                  to={sub.href}
                  className={cn(
                    isActive 
                      ? 'bg-brand-orange/15 text-brand-orange font-medium border-l-2 border-brand-orange' 
                      : 'text-brand-seashell/70 hover:bg-white/5 hover:text-white transition-colors border-l-2 border-transparent',
                    'flex items-center gap-3 pl-6 pr-3 py-2 rounded-r-md'
                  )}
                  onClick={closeSidebar}
                >
                  {sub.icon && <sub.icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}
                  <span className="text-sm">{sub.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Normal Link
  const isActive = pathname === item.href || (item.href !== '/' && item.href !== '/procurement-dashboard' && item.href !== '/inventory-dashboard' && pathname.startsWith(item.href + '/'));
  return (
    <Link
      to={item.href}
      className={cn(
        isActive 
          ? 'bg-brand-orange/15 text-brand-orange font-medium border-l-2 border-brand-orange' 
          : 'text-brand-seashell/70 hover:bg-white/5 hover:text-white transition-colors border-l-2 border-transparent',
        'flex items-center gap-3 px-3 py-2 rounded-r-md mb-1'
      )}
      onClick={closeSidebar}
    >
      {item.icon && <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />}
      <span className="text-sm">{item.name}</span>
    </Link>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { signOut, user, dbUser, permissions, company, activeTenantId, setActiveTenantId, availableCompanies, isGlobalSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { globalLoading, searchConfig, paginationConfig } = useLayoutControl();
  const [localSearch, setLocalSearch] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const closeSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  // Sync local search when search config changes
  React.useEffect(() => {
    setLocalSearch('');
  }, [location.pathname]);

  // Handle window resize for sidebar
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);



  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const getPermission = (modName: string) => permissions?.find((p: any) => p.module === modName);
  const hasOtherModules = isGlobalSuperAdmin || permissions?.some((p: any) => !['Global Tasks', 'Item Requisitions', 'My Profile'].includes(p.module) && p.canView);

  // Determine active high-level module
  const path = location.pathname;
  let activeModule = '';
  let activeModuleName = '';
  
  // User Panel paths must be checked FIRST to avoid /profile matching /pr
  if (path === '/user-dashboard' || path.startsWith('/inbox') || path.startsWith('/my-tasks') || path.startsWith('/profile') || path === '/item-requisition' || path.startsWith('/item-requisition/')) {
    activeModule = 'user-panel';
    activeModuleName = 'My Panel';
  } else if (path.startsWith('/procurement') || path === '/purchase-requisition' || path.startsWith('/purchase-requisition/') || path.startsWith('/pr-') || path.startsWith('/purchase') || path.startsWith('/po') || path.startsWith('/rfq') || path.startsWith('/cs') || path.startsWith('/invoices')) {
    activeModule = 'procurement';
    activeModuleName = 'Procurement';
  } else if (path === '/inventory-dashboard' || path === '/requisition-list' || path.startsWith('/requisition-report') || path.startsWith('/inventory') || path.startsWith('/grn') || path.startsWith('/qc') || path.startsWith('/stock') || path.startsWith('/vendors') || path.startsWith('/transfer-receive')) {
    activeModule = 'inventory';
    activeModuleName = 'Inventory Management';
  } else if (path.startsWith('/admin')) {
    activeModule = 'admin';
    activeModuleName = 'System Configuration';
  }

  // Define menus for each module
  const procurementMenus = [
    { name: 'Dashboard', href: '/procurement-dashboard', icon: LayoutDashboard, show: isSuperAdmin || getPermission('Dashboard')?.canView },
    { name: 'Purchase Requisitions', href: '/purchase-requisition', icon: FileText, show: isSuperAdmin || getPermission('Purchase Requisitions')?.canView },
    { name: 'RFQ (Quotation)', href: '/rfq', icon: Send, show: isSuperAdmin || getPermission('RFQ (Quotation)')?.canView },
    { name: 'Comparative Statement', href: '/cs', icon: FileSpreadsheet, show: isSuperAdmin || getPermission('Comparative Statement')?.canView },
    { name: 'Purchase Orders', href: '/po', icon: ShoppingCart, show: isSuperAdmin || getPermission('Purchase Orders')?.canView },
    { name: 'Invoices & Payments', href: '/invoices-payments', icon: DollarSign, show: isSuperAdmin || getPermission('Invoices & Payments')?.canView },
    {
      name: 'Reports',
      show: isSuperAdmin || getPermission('Reports')?.canView,
      icon: FileText,
      subMenus: [
        { name: 'Procurement Report', href: '/procurement-report', icon: FileSpreadsheet, show: isSuperAdmin || getPermission('Reports')?.canView },
      ]
    },
  ].filter(nav => nav.show !== false);

  const inventoryMenus = [
    { name: 'Dashboard', href: '/inventory-dashboard', icon: LayoutDashboard, show: isSuperAdmin || getPermission('Dashboard')?.canView },
    { name: 'Item Req. by User', href: '/requisition-list', icon: Shield, show: isSuperAdmin || getPermission('Requisition Approval')?.canView },
    { name: 'Stock In', href: '/stock-in', icon: ArrowDownToLine, show: isSuperAdmin || getPermission('Stock In')?.canView },
    { name: 'Stock Out', href: '/stock-out', icon: ArrowUpFromLine, show: isSuperAdmin || getPermission('Stock Out')?.canView },
    { name: 'Stock Transfer', href: '/stock-transfer', icon: ArrowRightLeft, show: isSuperAdmin || getPermission('Stock Transfer')?.canView },
    { name: 'Transfer Receive', href: '/transfer-receive', icon: ClipboardCheck, show: isSuperAdmin || getPermission('Transfer Receive')?.canView },
    { name: 'Goods Receipt (GRN)', href: '/grn', icon: Truck, show: isSuperAdmin || getPermission('Goods Receipt (GRN)')?.canView },

    {
      name: 'Reports',
      show: isSuperAdmin || getPermission('Reports')?.canView || getPermission('Requisition Report')?.canView,
      icon: FileText,
      subMenus: [
        { name: 'Inventory Report', href: '/inventory-report', icon: FileSpreadsheet, show: isSuperAdmin || getPermission('Reports')?.canView },
        { name: 'Requisition Report', href: '/requisition-report', icon: FileText, show: isSuperAdmin || getPermission('Requisition Report')?.canView },
      ]
    },
    {
      name: 'Inventory Setting',
      show: isSuperAdmin || getPermission('Inventory Items')?.canView || getPermission('Warehouses')?.canView || getPermission('Vendors')?.canView,
      icon: Settings,
      subMenus: [
        { name: 'Item Categories', href: '/inventory-categories', icon: Tags, show: isSuperAdmin || getPermission('Inventory Items')?.canView },
        { name: 'Inventory Items', href: '/inventory', icon: Box, show: isSuperAdmin || getPermission('Inventory Items')?.canView },
        { name: 'Vendors', href: '/vendors', icon: Users, show: isSuperAdmin || getPermission('Vendors')?.canView },
      ]
    }
  ].filter(nav => nav.show !== false);

  const adminMenus = [
    { name: 'Dashboard', href: '/admin?tab=dashboard', icon: LayoutDashboard, show: isSuperAdmin || getPermission('Dashboard')?.canView },
    {
      name: 'System Setting',
      show: isSuperAdmin || getPermission('System Setting')?.canView || getPermission('Branches')?.canView,
      subMenus: [
        { name: 'Companies', href: '/admin?tab=companies', icon: Shield, show: isSuperAdmin || getPermission('System Setting')?.canView },
        { name: 'Branches', href: '/admin?tab=branches', icon: Shield, show: isSuperAdmin || getPermission('Branches')?.canView },
        { name: 'Workflow Setting', href: '/admin?tab=workflows', icon: Shield, show: isSuperAdmin || getPermission('System Setting')?.canView },
        { name: 'Notification Settings', href: '/admin?tab=notifications', icon: Bell, show: isSuperAdmin || getPermission('System Setting')?.canView },
      ]
    },
    {
      name: 'User Setting',
      show: isSuperAdmin || getPermission('User Setting')?.canView,
      subMenus: [
        { name: 'Department', href: '/admin?tab=departments', icon: Shield },
        { name: 'Unit', href: '/admin?tab=units', icon: Shield },
        { name: 'Designation', href: '/admin?tab=designations', icon: Shield },
        { name: 'Roles', href: '/admin?tab=permissions', icon: Shield },
        { name: 'User', href: '/admin?tab=users', icon: UserIcon },
        { name: 'Organization Chart', href: '/admin/organogram', icon: Network },
        { name: 'Warehouses', href: '/admin/warehouses', icon: Warehouse, show: isSuperAdmin || getPermission('Warehouses')?.canView },
        { name: 'Warehouse Managers', href: '/admin?tab=warehouse-managers', icon: Shield },
      ]
    },
    // Global Tasks moved to User Panel
  ].filter(nav => nav.show !== false);

  const userPanelMenus = [
    { name: 'Dashboard', href: '/user-dashboard', icon: LayoutDashboard, show: isSuperAdmin || getPermission('User Dashboard')?.canView },
    { name: 'Global Tasks', href: '/inbox', icon: Bell, show: isSuperAdmin || getPermission('Global Tasks')?.canView },
    { name: 'Item Requisitions', href: '/item-requisition', icon: FileText, show: isSuperAdmin || getPermission('Item Requisitions')?.canView },
    { name: 'My Profile', href: '/profile', icon: UserIcon, show: isSuperAdmin || getPermission('My Profile')?.canView !== false }, // Allow by default unless explicitly denied
  ].filter(nav => nav.show !== false);

  // Determine which menu to show
  let currentMenus: any[] = [];
  if (activeModule === 'procurement') currentMenus = procurementMenus;
  else if (activeModule === 'inventory') currentMenus = inventoryMenus;
  else if (activeModule === 'admin') currentMenus = adminMenus;
  else if (activeModule === 'user-panel') currentMenus = userPanelMenus;

  return (
    <div className="flex h-screen w-full bg-brand-seashell font-sans text-brand-charcoal overflow-hidden">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-brand-charcoal border-r border-slate-700 shadow-xl transition-all duration-300 ease-in-out lg:relative",
        isSidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full overflow-hidden"
      )}>
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex-1 flex justify-center">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <Logo variant="charcoal" size="lg" showText={false} />
            </Link>
          </div>
          {/* Close button for mobile inside sidebar */}
          <button 
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Module Switcher */}
        <div className="p-4 border-b border-white/10 bg-black/10">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-xs font-bold text-brand-orange hover:text-white transition-colors uppercase tracking-wider mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Modules
          </Link>
          <div className="text-white font-bold text-lg">{activeModuleName}</div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          {currentMenus.map((item) => (
            <SidebarGroup key={item.name} item={item} pathname={location.pathname} search={location.search} closeSidebar={closeSidebar} />
          ))}
        </nav>
        
        <div className="p-4 bg-black/20 border-t border-white/10 flex flex-col gap-4">
          <Link to="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-brand-olive overflow-hidden shrink-0">
               {dbUser?.avatarUrl ? (
                 <img src={dbUser.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white uppercase">
                   {(dbUser?.name || user?.email || 'U').charAt(0)}
                 </div>
               )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white uppercase truncate">{dbUser?.name || user?.email?.split('@')[0] || 'User'}</div>
              <div className="text-[10px] text-brand-orange uppercase font-semibold tracking-tighter truncate" title={dbUser?.designation || dbUser?.role || 'User'}>{dbUser?.designation || dbUser?.role || 'User'}</div>
            </div>
            <button onClick={(e) => { e.preventDefault(); signOut(); }} className="text-brand-seashell/50 hover:text-white shrink-0" title="Sign Out">
              <LogOut className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2 sm:gap-4 flex-1">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {searchConfig && (
              <div className="relative w-full max-w-sm hidden sm:block">
                <input 
                  type="text" 
                  value={localSearch}
                  onChange={(e) => {
                    setLocalSearch(e.target.value);
                    searchConfig.onSearch(e.target.value);
                  }}
                  placeholder={searchConfig.placeholder || `Search in ${activeModuleName}...`} 
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            <NotificationBell />
            {isGlobalSuperAdmin ? (
              <div className="flex items-center gap-4">
                <div className="h-8 w-px bg-slate-200"></div>
                <div className="flex flex-col items-end">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Global Context</div>
                  <select 
                    value={activeTenantId || ''}
                    onChange={(e) => setActiveTenantId(e.target.value)}
                    className="text-sm font-black text-brand-orange bg-transparent border-none focus:ring-0 cursor-pointer text-right p-0"
                  >
                    {availableCompanies.map(c => (
                      <option key={c.id} value={c.id} className="text-black">{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : company ? (
              <div className="flex items-center gap-4">
              <div className="h-8 w-px bg-slate-200"></div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Tenant</div>
                <div className="text-sm font-black text-brand-orange max-w-[150px] truncate" title={company.name}>{company.name}</div>
              </div>
            </div>
            ) : null}
            <div className="hidden sm:block h-8 w-px bg-slate-200"></div>
            
            <div className="flex items-center gap-2">
              {hasOtherModules && (
                <Link to="/" className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors" title="Switch Module">
                  <LayoutGrid className="w-5 h-5" />
                </Link>
              )}
              {/* Global Inbox / Tasks */}
              <Link to="/inbox" className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors" title="My Inbox">
                <Mail className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-brand-orange rounded-full"></span>
              </Link>
            </div>

            <div className="hidden sm:block h-8 w-px bg-slate-200"></div>
            <div className="hidden sm:block text-right">
              <div className="text-xs text-slate-400 font-semibold uppercase">Last Login</div>
              <div className="text-sm font-medium">Today, 09:41 AM</div>
            </div>
          </div>
        </header>
        <div className="flex-1 p-8 overflow-y-auto relative">
          {globalLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-brand-orange animate-spin mb-2" />
              <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loading...</div>
            </div>
          )}
          {children}
        </div>
        
        {paginationConfig && paginationConfig.totalPages > 1 && (
          <footer className="h-14 bg-white border-t border-slate-200 flex items-center justify-between px-8 shrink-0">
            <div className="text-sm text-slate-500 flex items-center gap-3">
              <span>Showing page <span className="font-bold">{paginationConfig.currentPage}</span> of <span className="font-bold">{paginationConfig.totalPages}</span></span>
              {paginationConfig.totalItems !== undefined && (
                <>
                  <span className="text-slate-300">|</span>
                  <span>Total <span className="font-bold">{paginationConfig.totalItems}</span> items</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => paginationConfig.onPageChange(Math.max(1, paginationConfig.currentPage - 1))}
                disabled={paginationConfig.currentPage === 1}
                className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: paginationConfig.totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => paginationConfig.onPageChange(page)}
                    className={cn(
                      "w-8 h-8 rounded-md text-sm font-medium transition-colors",
                      paginationConfig.currentPage === page
                        ? "bg-brand-orange text-white"
                        : "hover:bg-slate-100 text-slate-600"
                    )}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => paginationConfig.onPageChange(Math.min(paginationConfig.totalPages, paginationConfig.currentPage + 1))}
                disabled={paginationConfig.currentPage === paginationConfig.totalPages}
                className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}
