import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/shared/components/AuthProvider';
import Logo from '@/src/shared/components/Logo';
import { ShoppingCart, Box, Shield, LogOut, LayoutList } from 'lucide-react';

export default function Home() {
  const { user, dbUser, company, signOut, activePlugins, isGlobalSuperAdmin, activeTenantId, setActiveTenantId, availableCompanies, permissions } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const modules = [
    {
      title: 'My Panel',
      description: 'View your personal & global task assignments.',
      icon: LayoutList,
      path: '/user-dashboard',
      color: 'text-[#6366f1]',
      bgColor: 'bg-[#eef2ff]',
      decoratorColor: 'bg-[#e0e7ff]',
      pluginSlug: 'user-panel'
    },
    {
      title: 'System Configuration',
      description: 'System settings, user roles, and brand appearance.',
      icon: Shield,
      path: '/admin',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      decoratorColor: 'bg-gray-200',
      pluginSlug: 'admin'
    },
    {
      title: 'Procurement',
      description: 'Manage Item requisitions, orders, and vendors.',
      icon: ShoppingCart,
      path: '/procurement-dashboard',
      color: 'text-[#F37021]',
      bgColor: 'bg-[#FFF3EC]',
      decoratorColor: 'bg-[#FFF3EC]',
      pluginSlug: 'procurement'
    },
    {
      title: 'Inventory',
      description: 'Track stock, items, and warehouse management.',
      icon: Box,
      path: '/inventory-dashboard',
      color: 'text-[#9F9C30]',
      bgColor: 'bg-[#F4F4EB]',
      decoratorColor: 'bg-[#F4F4EB]',
      pluginSlug: 'inventory'
    },
    {
      title: 'Asset Management',
      description: 'Fixed asset register, depreciation, and lifecycle.',
      icon: Box,
      path: '/assets-dashboard',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      decoratorColor: 'bg-purple-100',
      pluginSlug: 'asset-management'
    }
  ];

  // Mapping of top-level Home cards to their possible permissions (menus)
  // Mapping of top-level Home cards to their possible permissions (menus)
  const moduleMenusMap: Record<string, string[]> = {
    'My Panel': ['User Dashboard', 'Global Tasks', 'Item Requisitions', 'My Profile'],
    'System Configuration': ['Dashboard', 'Companies', 'Branches', 'Departments', 'Designations', 'Warehouses', 'Users', 'Roles & Permissions', 'BPMN Definitions', 'Module Setup'],
    'Procurement': ['Dashboard', 'Purchase Requisitions', 'Purchase Orders', 'Vendors', 'Comparative Statements'],
    'Inventory': ['Dashboard', 'Stock In', 'Stock Out', 'Stock Movements', 'Item Categories', 'Units', 'Item Setup'],
    'Asset Management': ['Dashboard', 'Assets Register', 'Asset Categories', 'Depreciation Schedule', 'Maintenance', 'Asset Maintenance', 'Disposals', 'Physical Audit', 'Reports', 'Asset Management']
  };


  // Filter modules based on active plugins AND user permissions
  const visibleModules = modules.filter(mod => {
    // 1. Check plugin availability
    let hasPlugin = false;
    if (mod.pluginSlug === 'admin' || mod.pluginSlug === 'user-panel' || mod.pluginSlug === 'asset-management') {
      hasPlugin = true; // Core & standard modules available by default
    } else if (activePlugins && activePlugins.length > 0) {
      hasPlugin = activePlugins.some(p => p.slug === mod.pluginSlug);
    } else {
      hasPlugin = true; // Fallback when plugin list is loading
    }
    
    if (!hasPlugin) return false;

    // 2. Check RBAC permissions
    const userRole = (dbUser?.role || (dbUser as any)?.userRole || '').toLowerCase();
    if (isGlobalSuperAdmin || userRole.includes('super admin') || userRole.includes('superadmin') || userRole === 'admin') {
      return true;
    }
    
    const requiredMenus = moduleMenusMap[mod.title] || [];
    if (!permissions || permissions.length === 0) return true;

    return permissions.some((p: any) => 
      (requiredMenus.includes(p.module) || p.module === 'Asset Management' || p.module === mod.title) && p.canView
    );
  });

  const userName = dbUser?.email?.split('@')[0].toUpperCase() || user?.email?.split('@')[0].toUpperCase() || 'USER';
  const userInitials = userName.charAt(0);

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col font-sans">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 sm:px-8 py-3 flex justify-between items-center z-10 sticky top-0">
        <Logo showText={false} size="sm" />
        <div className="flex items-center gap-2 sm:gap-6">
          {isGlobalSuperAdmin ? (
            <>
              <div className="flex flex-col items-end hidden sm:flex">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Global Context</div>
                <select 
                  value={activeTenantId || ''}
                  onChange={(e) => setActiveTenantId(e.target.value)}
                  className="text-sm font-black text-[#F37021] bg-transparent border-none focus:ring-0 cursor-pointer text-right p-0 outline-none"
                >
                  {availableCompanies.map(c => (
                    <option key={c.id} value={c.id} className="text-black">{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
            </>
          ) : company ? (
            <>
              <div className="text-right hidden sm:block">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Active Tenant</div>
                <div className="text-sm font-black text-[#F37021]">{company.name}</div>
              </div>
              <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
            </>
          ) : null}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-900 tracking-tight">{userName}</p>
              <p className="text-[10px] text-[#F37021] font-bold uppercase tracking-wider">{dbUser?.designation || dbUser?.role || 'USER'}</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#9F9C30] text-white flex items-center justify-center font-bold text-xs sm:text-sm">
              {userInitials}
            </div>
          </div>
          
          <div className="h-6 sm:h-8 w-px bg-gray-200"></div>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-1 sm:gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors p-1 sm:p-0"
            title="Sign Out"
          >
            <LogOut size={18} className="text-gray-500 sm:text-gray-400" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-8 flex flex-col items-center">
        <div className="text-center mb-8 max-w-2xl">
          <h1 className="text-[32px] font-black text-[#333333] mb-4 tracking-tight">Welcome to SLI ERP</h1>
          <p className="text-[15px] text-gray-500 font-medium leading-relaxed">
            Select a module to begin managing your enterprise resources. Your access is personalized based on your role.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 w-full">
          {visibleModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.title}
                onClick={() => navigate(mod.path)}
                className="relative overflow-hidden flex flex-col text-left p-6 bg-white rounded-[20px] shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-gray-100 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 group"
              >
                {/* Decorative Top Right Circle */}
                <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full transition-transform duration-500 group-hover:scale-110 ${mod.decoratorColor}`}></div>

                {/* Icon Container */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 relative z-10 ${mod.bgColor} ${mod.color}`}>
                  <Icon size={24} strokeWidth={2} />
                </div>
                
                {/* Text Content */}
                <div className="relative z-10 flex-1">
                  <h3 className="text-[17px] font-extrabold text-gray-900 mb-2">{mod.title}</h3>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed pr-4">
                    {mod.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}