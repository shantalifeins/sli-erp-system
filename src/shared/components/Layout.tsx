import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { LayoutDashboard, ShoppingCart, Box, Users, LogOut, FileText, Shield, ArrowLeft, ChevronDown, Image as ImageIcon, User as UserIcon, Truck, ClipboardCheck, DollarSign, FileSpreadsheet, Send, Loader2, ChevronLeft, ChevronRight, Tags, Menu, X, Network, ArrowDownToLine, ArrowUpFromLine, Bell, LayoutList, Inbox, Mail, Settings, Warehouse, ClipboardList, ArrowRightLeft, LayoutGrid, AlertTriangle, Layers, Wrench, Trash2, QrCode, TrendingDown, MapPin, ListTodo, Upload, Calendar } from 'lucide-react';


import { cn } from '@/src/shared/lib/utils';
import { useLayoutControl } from '@/src/shared/contexts/LayoutContext';

import Logo from './Logo.js';
import NotificationBell from './NotificationBell.js';

function SidebarGroup({ item, pathname, search, closeSidebar }: { key?: React.Key, item: any, pathname: string, search: string, closeSidebar: () => void }) {
  const visibleSubMenus = React.useMemo(() => {
    if (!item?.subMenus) return [];
    return item.subMenus.filter((sub: any) => sub && Boolean(sub.show));
  }, [item?.subMenus]);

  const isAnySubActive = React.useMemo(() => {
    if (!visibleSubMenus.length) return false;
    const fullPath = pathname + search;
    return visibleSubMenus.some((sub: any) => fullPath === sub.href || pathname === sub.href || (sub.href !== '/' && pathname.startsWith(sub.href + '/')));
  }, [visibleSubMenus, pathname, search]);

  const [expanded, setExpanded] = useState(isAnySubActive);

  React.useEffect(() => {
    if (isAnySubActive) {
      setExpanded(true);
    }
  }, [isAnySubActive]);

  if (!item || item.show === false || !Boolean(item.show)) return null;

  if (item.subMenus) {
    if (visibleSubMenus.length === 0) return null;

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
            {visibleSubMenus.map((sub: any) => {
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
  const { signOut, user, dbUser, permissions, company, activeTenantId, setActiveTenantId, availableCompanies, isGlobalSuperAdmin, activePlugins } = useAuth();
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
  const hasMenuAccess = (menuName: string, alsoCheckCreate = false): boolean => {
    if (isSuperAdmin) return true;
    const perm = getPermission(menuName);
    if (!perm) return false;
    if (alsoCheckCreate) {
      return Boolean(perm.canView || perm.canCreate);
    }
    return Boolean(perm.canView);
  };

  const filterAccessibleMenus = (menus: any[]) => {
    return (menus || [])
      .map(item => {
        if (!item) return null;
        if (item.subMenus) {
          const visibleSubs = item.subMenus.filter((sub: any) => sub && Boolean(sub.show));
          if (visibleSubs.length === 0) return null;
          return {
            ...item,
            show: true,
            subMenus: visibleSubs
          };
        }
        return Boolean(item.show) ? item : null;
      })
      .filter(Boolean);
  };

  const hasOtherModules = isGlobalSuperAdmin || permissions?.some((p: any) => !['Global Tasks', 'Item Requisitions', 'My Profile'].includes(p.module) && p.canView);

  // Determine active high-level module
  const path = location.pathname;
  let activeModule = '';
  let activeModuleName = '';
  
  // User Panel paths must be checked FIRST to avoid /profile matching /pr
  if (path === '/user-dashboard' || path.startsWith('/inbox') || path.startsWith('/my-tasks') || path.startsWith('/profile') || path === '/item-requisition' || path.startsWith('/item-requisition/')) {
    activeModule = 'user-panel';
    activeModuleName = 'My Panel';
  } else if (path.startsWith('/procurement') || path === '/purchase-requisition' || path.startsWith('/purchase-requisition/') || path.startsWith('/pr-') || path.startsWith('/purchase') || path.startsWith('/po') || path.startsWith('/work-orders') || path.startsWith('/rfq') || path.startsWith('/cs') || path.startsWith('/invoices')) {
    activeModule = 'procurement';
    activeModuleName = 'Procurement';
  } else if (path === '/inventory-dashboard' || path === '/requisition-list' || path.startsWith('/requisition-report') || path.startsWith('/inventory') || path.startsWith('/grn') || path.startsWith('/qc') || path.startsWith('/stock') || path.startsWith('/vendors') || path.startsWith('/transfer-receive') || path.startsWith('/rejected-items') || path.startsWith('/stock-reconciliation') || path.startsWith('/opening-stock-upload') || path.startsWith('/inventory-bulk-upload') || path.startsWith('/stock-adjustment')) {
    activeModule = 'inventory';
    activeModuleName = 'Inventory Management';
  } else if (path === '/assets-dashboard' || path.startsWith('/assets') || path.startsWith('/asset-') || path.startsWith('/digital-assets')) {
    activeModule = 'asset-management';
    activeModuleName = 'Asset Management';
  } else if (path.startsWith('/admin')) {
    activeModule = 'admin';
    activeModuleName = 'System Configuration';
  }

  // Top Module Navigation Tabs configuration
  const moduleMenusMap: Record<string, string[]> = {
    'user-panel': ['User Dashboard', 'Global Tasks', 'Item Requisitions', 'My Profile', 'To-Do List'],
    'admin': ['Companies', 'Branches', 'Departments', 'Units', 'Designations', 'Warehouses', 'Users', 'Roles & Permissions', 'BPMN Definitions', 'Module Setup', 'Admin Dashboard', 'System Setting', 'User Setting', 'Company Profile', 'Workflow Engine'],
    'procurement': ['Purchase Requisitions', 'Purchase Orders', 'Vendors', 'Comparative Statements', 'Comparative Statement', 'RFQ (Quotation)', 'Work Orders', 'Invoices & Payments', 'Procurement Report', 'Procurement Reports', 'Procurement Dashboard', 'Traceability Report'],
    'inventory': ['Stock In', 'Stock Out', 'Stock Movements', 'Stock Transfer', 'Transfer Receive', 'Item Categories', 'Units', 'Item Setup', 'Requisition Approval', 'Goods Receipt (GRN)', 'Rejected Items', 'Stock Reconciliation', 'Inventory Report', 'Inventory Reports', 'Requisition Report', 'Inventory Dashboard', 'Inventory Items', 'Item Bulk Upload', 'Opening Stock Upload', 'Stock Adjustment'],
    'asset-management': ['Assets Register', 'Asset Categories', 'Depreciation Schedule', 'Depreciation Reports', 'Maintenance', 'Asset Maintenance', 'Disposals', 'Asset Disposal', 'Physical Audit', 'Reports', 'Asset Reports', 'Asset Management', 'Asset Dashboard', 'Asset Capitalization', 'Asset Assignment', 'Asset Import', 'Asset Location', 'Asset Transfers', 'Digital Asset Register', 'Digital Acceptance', 'Digital Asset Import', 'Digital Subscriptions', 'License Vault', 'Digital Amortization', 'Digital Asset Reports']
  };

  const allModuleTabs = [
    {
      slug: 'user-panel',
      title: 'My Panel',
      path: '/user-dashboard',
      icon: LayoutList,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      activeBorder: 'border-indigo-600 text-indigo-950 bg-indigo-50/30 font-bold'
    },
    {
      slug: 'admin',
      title: 'System Configuration',
      path: '/admin',
      icon: Shield,
      color: 'text-slate-700',
      bgColor: 'bg-slate-100',
      activeBorder: 'border-slate-800 text-slate-900 bg-slate-100/50 font-bold'
    },
    {
      slug: 'procurement',
      title: 'Procurement',
      path: '/procurement-dashboard',
      icon: ShoppingCart,
      color: 'text-[#F37021]',
      bgColor: 'bg-[#FFF3EC]',
      activeBorder: 'border-[#F37021] text-brand-charcoal bg-[#FFF3EC]/40 font-bold'
    },
    {
      slug: 'inventory',
      title: 'Inventory',
      path: '/inventory-dashboard',
      icon: Box,
      color: 'text-[#9F9C30]',
      bgColor: 'bg-[#F4F4EB]',
      activeBorder: 'border-[#9F9C30] text-slate-900 bg-[#F4F4EB]/40 font-bold'
    },
    {
      slug: 'asset-management',
      title: 'Asset Management',
      path: '/assets-dashboard',
      icon: Layers,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      activeBorder: 'border-purple-600 text-purple-950 bg-purple-50/40 font-bold'
    }
  ];

  const visibleModuleTabs = allModuleTabs.filter(mod => {
    let hasPlugin = false;
    if (mod.slug === 'admin' || mod.slug === 'user-panel' || mod.slug === 'asset-management') {
      hasPlugin = true;
    } else if (activePlugins && activePlugins.length > 0) {
      hasPlugin = activePlugins.some(p => p.slug === mod.slug);
    } else {
      hasPlugin = true;
    }
    
    if (!hasPlugin) return false;

    const userRole = (dbUser?.role || (dbUser as any)?.userRole || '').toLowerCase();
    if (isGlobalSuperAdmin || userRole.includes('super admin') || userRole.includes('superadmin')) {
      return true;
    }

    if (mod.slug === 'user-panel') return true;
    
    const requiredMenus = moduleMenusMap[mod.slug] || [];
    if (!permissions || permissions.length === 0) return false;

    return permissions.some((p: any) => 
      (requiredMenus.includes(p.module) || (mod.slug === 'asset-management' && p.module === 'Asset Management') || p.module === mod.title) && p.canView
    );
  });


  // Define menus for each module
  const procurementMenus = [
    { 
      name: 'Dashboard', 
      href: '/procurement-dashboard', 
      icon: LayoutDashboard, 
      show: hasMenuAccess('Procurement Dashboard') || hasMenuAccess('Purchase Requisitions') || hasMenuAccess('Purchase Orders') || hasMenuAccess('Vendors') || hasMenuAccess('Comparative Statement') || hasMenuAccess('RFQ (Quotation)') 
    },
    { name: 'Purchase Requisitions', href: '/purchase-requisition', icon: FileText, show: hasMenuAccess('Purchase Requisitions') },
    { name: 'RFQ (Quotation)', href: '/rfq', icon: Send, show: hasMenuAccess('RFQ (Quotation)') },
    { name: 'Comparative Statement', href: '/cs', icon: FileSpreadsheet, show: hasMenuAccess('Comparative Statement') },
    { name: 'Purchase Orders', href: '/po', icon: ShoppingCart, show: hasMenuAccess('Purchase Orders') },
    { name: 'Work Orders', href: '/work-orders', icon: ClipboardList, show: hasMenuAccess('Work Orders') || hasMenuAccess('Purchase Orders') },
    { name: 'Invoices & Payments', href: '/invoices-payments', icon: DollarSign, show: hasMenuAccess('Invoices & Payments') },
    {
      name: 'Reports',
      show: hasMenuAccess('Procurement Reports') || hasMenuAccess('Traceability Report'),
      icon: FileText,
      subMenus: [
        { name: 'Procurement Report', href: '/procurement-report', icon: FileSpreadsheet, show: hasMenuAccess('Procurement Reports') },
        { name: 'Traceability Report', href: '/traceability-report', icon: Network, show: hasMenuAccess('Traceability Report') },
      ]
    },
  ];

  const inventoryMenus = [
    { 
      name: 'Dashboard', 
      href: '/inventory-dashboard', 
      icon: LayoutDashboard, 
      show: hasMenuAccess('Inventory Dashboard') || hasMenuAccess('Stock In') || hasMenuAccess('Stock Out') || hasMenuAccess('Goods Receipt (GRN)') || hasMenuAccess('Requisition Approval') || hasMenuAccess('Inventory Items') 
    },
    { name: 'Item Req. by User', href: '/requisition-list', icon: Shield, show: hasMenuAccess('Requisition Approval') },
    { name: 'Stock In', href: '/stock-in', icon: ArrowDownToLine, show: hasMenuAccess('Stock In') },
    { name: 'Stock Out', href: '/stock-out', icon: ArrowUpFromLine, show: hasMenuAccess('Stock Out') },
    { name: 'Stock Transfer', href: '/stock-transfer', icon: ArrowRightLeft, show: hasMenuAccess('Stock Transfer') },
    { name: 'Transfer Receive', href: '/transfer-receive', icon: ClipboardCheck, show: hasMenuAccess('Transfer Receive') },
    { name: 'Goods Receipt (GRN)', href: '/grn', icon: Truck, show: hasMenuAccess('Goods Receipt (GRN)') },
    { name: 'Rejected Items', href: '/rejected-items', icon: AlertTriangle, show: hasMenuAccess('Rejected Items') },
    { name: 'Stock Reconciliation', href: '/stock-reconciliation', icon: ClipboardCheck, show: hasMenuAccess('Stock Reconciliation') },
    {
      name: 'Reports',
      show: hasMenuAccess('Inventory Reports') || hasMenuAccess('Requisition Report'),
      icon: FileText,
      subMenus: [
        { name: 'Inventory Report', href: '/inventory-report', icon: FileSpreadsheet, show: hasMenuAccess('Inventory Reports') },
        { name: 'Requisition Report', href: '/requisition-report', icon: FileText, show: hasMenuAccess('Requisition Report') },
      ]
    },
    {
      name: 'Inventory Setting',
      show: hasMenuAccess('Inventory Items') || hasMenuAccess('Item Bulk Upload', true) || hasMenuAccess('Opening Stock Upload', true) || hasMenuAccess('Stock Adjustment') || hasMenuAccess('Vendors'),
      icon: Settings,
      subMenus: [
        { name: 'Item Categories', href: '/inventory-categories', icon: Tags, show: hasMenuAccess('Inventory Items') },
        { name: 'Inventory Items', href: '/inventory', icon: Box, show: hasMenuAccess('Inventory Items') },
        { name: 'Item Bulk Upload', href: '/inventory-bulk-upload', icon: Upload, show: hasMenuAccess('Item Bulk Upload', true) || hasMenuAccess('Inventory Items') },
        { name: 'Opening Stock Upload', href: '/opening-stock-upload', icon: FileSpreadsheet, show: hasMenuAccess('Opening Stock Upload', true) },
        { name: 'Stock Adjustment', href: '/stock-adjustment', icon: Settings, show: hasMenuAccess('Stock Adjustment') },
        { name: 'Vendors', href: '/vendors', icon: Users, show: hasMenuAccess('Vendors') },
      ]
    }
  ];

  const adminMenus = [
    { 
      name: 'Dashboard', 
      href: '/admin?tab=dashboard', 
      icon: LayoutDashboard, 
      show: hasMenuAccess('Admin Dashboard') || hasMenuAccess('System Setting') || hasMenuAccess('User Setting') 
    },
    {
      name: 'System Setting',
      show: hasMenuAccess('System Setting') || hasMenuAccess('Company Profile') || hasMenuAccess('Branches') || hasMenuAccess('Workflow Engine'),
      icon: Shield,
      subMenus: [
        { name: 'Companies', href: '/admin?tab=companies', icon: Shield, show: hasMenuAccess('Company Profile') || hasMenuAccess('System Setting') },
        { name: 'Branches', href: '/admin?tab=branches', icon: Shield, show: hasMenuAccess('Branches') },
        { name: 'Workflow Setting', href: '/admin?tab=workflows', icon: Shield, show: hasMenuAccess('Workflow Engine') || hasMenuAccess('System Setting') },
        { name: 'Notification Settings', href: '/admin?tab=notifications', icon: Bell, show: hasMenuAccess('System Setting') },
      ]
    },
    {
      name: 'User Setting',
      show: hasMenuAccess('User Setting') || hasMenuAccess('Departments') || hasMenuAccess('Units') || hasMenuAccess('Designations') || hasMenuAccess('Warehouses'),
      icon: Shield,
      subMenus: [
        { name: 'Department', href: '/admin?tab=departments', icon: Shield, show: hasMenuAccess('Departments') || hasMenuAccess('User Setting') },
        { name: 'Unit', href: '/admin?tab=units', icon: Shield, show: hasMenuAccess('Units') || hasMenuAccess('User Setting') },
        { name: 'Designation', href: '/admin?tab=designations', icon: Shield, show: hasMenuAccess('Designations') || hasMenuAccess('User Setting') },
        { name: 'Roles', href: '/admin?tab=permissions', icon: Shield, show: hasMenuAccess('User Setting') },
        { name: 'User', href: '/admin?tab=users', icon: UserIcon, show: hasMenuAccess('User Setting') },
        { name: 'Organization Chart', href: '/admin/organogram', icon: Network, show: hasMenuAccess('User Setting') },
        { name: 'Warehouses', href: '/admin/warehouses', icon: Warehouse, show: hasMenuAccess('Warehouses') },
        { name: 'Warehouse Managers', href: '/admin?tab=warehouse-managers', icon: Shield, show: hasMenuAccess('Warehouses') || hasMenuAccess('User Setting') },
      ]
    },
  ];

  const userPanelMenus = [
    { name: 'Dashboard', href: '/user-dashboard', icon: LayoutDashboard, show: hasMenuAccess('User Dashboard') },
    { name: 'Global Tasks', href: '/inbox', icon: Bell, show: hasMenuAccess('Global Tasks') },
    { name: 'To-Do List', href: '/my-tasks', icon: ListTodo, show: isSuperAdmin || getPermission('To-Do List')?.canView !== false }, // Allow by default
    { name: 'Item Requisitions', href: '/item-requisition', icon: FileText, show: hasMenuAccess('Item Requisitions') },
    { name: 'My Profile', href: '/profile', icon: UserIcon, show: isSuperAdmin || getPermission('My Profile')?.canView !== false }, // Allow by default unless explicitly denied
  ];

  const assetMenus = [
    { name: 'Dashboard', href: '/assets-dashboard', icon: LayoutDashboard, show: hasMenuAccess('Asset Dashboard') },
    {
      name: 'Fixed Asset',
      icon: Box,
      show: hasMenuAccess('Assets Register') || hasMenuAccess('Asset Capitalization') || hasMenuAccess('Asset Assignment') || hasMenuAccess('Asset Import', true) || hasMenuAccess('Asset Categories') || hasMenuAccess('Asset Location') || hasMenuAccess('Asset Transfers') || hasMenuAccess('Asset Maintenance') || hasMenuAccess('Asset Disposal') || hasMenuAccess('Physical Audit'),
      subMenus: [
        { name: 'Assets Register', href: '/assets', icon: Box, show: hasMenuAccess('Assets Register') },
        { name: 'Asset Capitalization', href: '/asset-capitalization', icon: ClipboardCheck, show: hasMenuAccess('Asset Capitalization') },
        { name: 'Asset Assignment', href: '/asset-assignment', icon: Users, show: hasMenuAccess('Asset Assignment') },
        { name: 'Asset Import', href: '/asset-import', icon: Upload, show: hasMenuAccess('Asset Import', true) },
        { name: 'Asset Categories', href: '/asset-categories', icon: Layers, show: hasMenuAccess('Asset Categories') },
        { name: 'Asset Location', href: '/asset-location', icon: MapPin, show: hasMenuAccess('Asset Location') },
        { name: 'Asset Transfers', href: '/asset-transfers', icon: ArrowRightLeft, show: hasMenuAccess('Asset Transfers') },
        { name: 'Asset Maintenance', href: '/asset-maintenance', icon: Wrench, show: hasMenuAccess('Asset Maintenance') },
        { name: 'Asset Disposal', href: '/asset-disposal', icon: Trash2, show: hasMenuAccess('Asset Disposal') },
        { name: 'Physical Audit', href: '/asset-verification', icon: QrCode, show: hasMenuAccess('Physical Audit') },
      ]
    },
    {
      name: 'Digital Asset',
      show: hasMenuAccess('Digital Asset Register') || hasMenuAccess('Digital Acceptance') || hasMenuAccess('Digital Asset Import', true) || hasMenuAccess('Digital Subscriptions') || hasMenuAccess('License Vault') || hasMenuAccess('Digital Amortization'),
      icon: Network,
      subMenus: [
        { name: 'Register', href: '/digital-assets', icon: Box, show: hasMenuAccess('Digital Asset Register') },
        { name: 'Digital Acceptance', href: '/digital-assets/acceptance', icon: ClipboardCheck, show: hasMenuAccess('Digital Acceptance') },
        { name: 'Digital Import', href: '/digital-assets/import', icon: Upload, show: hasMenuAccess('Digital Asset Import', true) },
        { name: 'Subscriptions', href: '/digital-assets/subscriptions', icon: Layers, show: hasMenuAccess('Digital Subscriptions') },
        { name: 'License Vault', href: '/digital-assets/vault', icon: Shield, show: hasMenuAccess('License Vault') },
        { name: 'Amortization', href: '/digital-assets/amortization', icon: TrendingDown, show: hasMenuAccess('Digital Amortization') },
      ]
    },
    {
      name: 'Asset Report',
      icon: FileSpreadsheet,
      show: hasMenuAccess('Asset Reports') || hasMenuAccess('Digital Asset Reports'),
      subMenus: [
        { name: 'Fixed Asset', href: '/asset-reports', icon: FileSpreadsheet, show: hasMenuAccess('Asset Reports') },
        { name: 'Digital Asset', href: '/digital-assets/reports', icon: FileSpreadsheet, show: hasMenuAccess('Digital Asset Reports') }
      ]
    },
    {
      name: 'Depreciation Report',
      href: '/asset-depr-reports',
      icon: TrendingDown,
      show: hasMenuAccess('Depreciation Reports')
    },
    {
      name: 'Depreciation Schedule',
      href: '/asset-depr-schedule',
      icon: Calendar,
      show: hasMenuAccess('Depreciation Schedule')
    }
  ];

  // Determine which menu to show
  let rawMenus: any[] = [];
  if (activeModule === 'procurement') rawMenus = procurementMenus;
  else if (activeModule === 'inventory') rawMenus = inventoryMenus;
  else if (activeModule === 'admin') rawMenus = adminMenus;
  else if (activeModule === 'user-panel') rawMenus = userPanelMenus;
  else if (activeModule === 'asset-management') rawMenus = assetMenus;

  const currentMenus = filterAccessibleMenus(rawMenus);

  // Module Access Guard
  const userRoleStr = (dbUser?.role || (dbUser as any)?.userRole || '').toLowerCase();
  const isUserAdminRole = isGlobalSuperAdmin || userRoleStr.includes('super admin') || userRoleStr.includes('superadmin');
  const isAllowedModule = isUserAdminRole || activeModule === 'user-panel' || activeModule === '' || visibleModuleTabs.some(m => m.slug === activeModule);

  if (!isAllowedModule && activeModule !== '') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 w-full">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-600 mb-6">
            You do not have permission to access the <strong>{activeModuleName}</strong> module. Please contact your system administrator.
          </p>
          <Link
            to="/user-dashboard"
            className="inline-block px-6 py-2.5 bg-brand-orange text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors shadow-md shadow-orange-500/20"
          >
            Go to My Panel
          </Link>
        </div>
      </div>
    );
  }


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

        {/* Top Horizontal Module Switcher Bar */}
        {visibleModuleTabs.length > 0 && (
          <div className="bg-slate-100/70 border-b border-slate-200/80 px-4 sm:px-8 py-1.5 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0 z-10">
            {visibleModuleTabs.map((mod) => {
              const Icon = mod.icon;
              const isActive = activeModule === mod.slug;
              return (
                <Link
                  key={mod.slug}
                  to={mod.path}
                  className={cn(
                    "h-8 inline-flex items-center gap-2 px-3 rounded-lg text-xs transition-all duration-150 shrink-0 border whitespace-nowrap box-border",
                    isActive
                      ? cn("bg-white shadow-xs border", mod.activeBorder)
                      : "bg-white/80 text-slate-600 border-slate-200/90 hover:bg-white hover:text-slate-900 hover:border-slate-300 font-medium"
                  )}
                >
                  <div className={cn("w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors", mod.bgColor, mod.color)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span>{mod.title}</span>
                </Link>
              );
            })}
          </div>
        )}

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
