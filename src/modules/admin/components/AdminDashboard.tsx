import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { 
  Users, 
  ShieldCheck, 
  Building2, 
  Network, 
  UserSquare2, 
  MapPin, 
  Warehouse,
  Building
} from 'lucide-react';
import { useAuth } from '@/src/shared/components/AuthProvider';

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { dbUser, activeTenantId, activePlugins, getToken } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isGSA = dbUser?.role === 'Super Admin' && !dbUser?.companyId;

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
        const url = new URL('/api/admin/dashboard', window.location.origin);
        const data = await fetchWithAuth(url.toString(), token);
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [activeTenantId, getToken]); // Re-fetch if active tenant changes

  const hasInventory = activePlugins.some(p => p.slug === 'inventory');

  if (loading) {
    return (
      <div className="p-8 h-64 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#F37021] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const cards = [];

  if (isGSA && !activeTenantId) {
    cards.push({
      title: 'Total Companies',
      value: stats?.companies || 0,
      icon: Building,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      tab: 'companies'
    });
  } else {
    cards.push(
      {
        title: 'Users',
        value: stats?.users?.total || 0,
        active: stats?.users?.active || 0,
        inactive: stats?.users?.inactive || 0,
        hasStatus: true,
        icon: Users,
        color: 'text-[#F37021]',
        bgColor: 'bg-[#F37021]/10',
        tab: 'users'
      },
      {
        title: 'Roles configured',
        value: stats?.roles || 0,
        icon: ShieldCheck,
        color: 'text-[#9F9C30]',
        bgColor: 'bg-[#9F9C30]/10',
        tab: 'permissions'
      },
      {
        title: 'Departments',
        value: stats?.departments?.total || 0,
        active: stats?.departments?.active || 0,
        inactive: stats?.departments?.inactive || 0,
        hasStatus: true,
        icon: Building2,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100',
        tab: 'departments'
      },
      {
        title: 'Units',
        value: stats?.units?.total || 0,
        active: stats?.units?.active || 0,
        inactive: stats?.units?.inactive || 0,
        hasStatus: true,
        icon: Network,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100',
        tab: 'units'
      },
      {
        title: 'Designations',
        value: stats?.designations?.total || 0,
        active: stats?.designations?.active || 0,
        inactive: stats?.designations?.inactive || 0,
        hasStatus: true,
        icon: UserSquare2,
        color: 'text-rose-600',
        bgColor: 'bg-rose-100',
        tab: 'designations'
      },
      {
        title: 'Branches',
        value: stats?.branches?.total || 0,
        active: stats?.branches?.active || 0,
        inactive: stats?.branches?.inactive || 0,
        hasStatus: true,
        icon: MapPin,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-100',
        tab: 'branches'
      }
    );

    if (hasInventory) {
      cards.push({
        title: 'Warehouses',
        value: stats?.warehouses?.total || 0,
        active: stats?.warehouses?.active || 0,
        inactive: stats?.warehouses?.inactive || 0,
        hasStatus: true,
        icon: Warehouse,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
        tab: 'warehouse-managers'
      });
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">System Configuration Dashboard</h2>
        <p className="text-gray-500 mt-1">Overview of your system configurations and master data.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx}
              onClick={() => onNavigate(card.tab.toLowerCase())}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${card.bgColor} ${card.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-black text-gray-900 mb-1 group-hover:text-[#F37021] transition-colors">{card.value}</h3>
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
              </div>
              {card.hasStatus && (
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center text-xs font-semibold text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
                    Active: {card.active || 0}
                  </div>
                  <div className="flex items-center text-xs font-semibold text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5"></span>
                    Inactive: {card.inactive || 0}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
