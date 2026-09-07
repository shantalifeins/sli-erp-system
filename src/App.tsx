import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/src/shared/components/AuthProvider';
import PluginProtectedRoute from '@/src/shared/components/PluginProtectedRoute';
import { SettingsProvider } from '@/src/shared/components/SettingsProvider';
import { LayoutProvider } from '@/src/shared/contexts/LayoutContext';
import Layout from '@/src/shared/components/Layout';
import Dashboard from '@/src/modules/dashboard/pages/Dashboard';
import Inbox from '@/src/modules/home/pages/Inbox';
import PurchaseRequisitions from '@/src/modules/procurement/pages/PurchaseRequisitions';
import Inventory from '@/src/modules/inventory/pages/Inventory';
import Vendors from '@/src/modules/procurement/pages/Vendors';
import PurchaseOrders from '@/src/modules/procurement/pages/PurchaseOrders';
import Login from '@/src/modules/auth/pages/Login';
import Admin from '@/src/modules/admin/pages/Admin';
import { OrganogramPage } from '@/src/modules/admin/pages/OrganogramPage';
import WorkflowDesigner from '@/src/modules/admin/pages/WorkflowDesigner';
import PrApprovals from '@/src/modules/procurement/pages/PrApprovals';
import Rfq from '@/src/modules/procurement/pages/Rfq';
import Cs from '@/src/modules/procurement/pages/Cs';
import Grn from '@/src/modules/inventory/pages/Grn';
import WorkOrders from '@/src/modules/procurement/pages/WorkOrders';

import ProcurementReport from '@/src/modules/procurement/pages/ProcurementReport';
import InvoicesPayments from '@/src/modules/procurement/pages/InvoicesPayments';
import InventoryDashboard from '@/src/modules/inventory/pages/InventoryDashboard';
import ItemCategories from '@/src/modules/inventory/pages/ItemCategories';
import StockIn from '@/src/modules/inventory/pages/StockIn';
import StockOut from '@/src/modules/inventory/pages/StockOut';
import StockTransfer from '@/src/modules/inventory/pages/StockTransfer';
import StockTransferReceive from '@/src/modules/inventory/pages/StockTransferReceive';
import WarehouseManager from '@/src/modules/inventory/pages/WarehouseManager';
import InventoryReport from '@/src/modules/inventory/pages/InventoryReport';
import RequisitionReport from '@/src/modules/inventory/pages/RequisitionReport';
import StockReconciliation from '@/src/modules/inventory/pages/StockReconciliation';
import RejectedItems from '@/src/modules/inventory/pages/RejectedItems';

import Home from '@/src/modules/home/pages/Home';
import UserPanelTasks from '@/src/modules/userPanel/pages/Tasks';
import Profile from '@/src/modules/userPanel/pages/Profile';
import UserDashboard from '@/src/modules/userPanel/pages/UserDashboard';

import AssetDashboard from '@/src/modules/assets/pages/AssetDashboard';
import Assets from '@/src/modules/assets/pages/Assets';
import AssetSchedule from '@/src/modules/assets/pages/AssetSchedule';
import AssetCategories from '@/src/modules/assets/pages/AssetCategories';
import AssetMaintenance from '@/src/modules/assets/pages/AssetMaintenance';
import AssetDisposal from '@/src/modules/assets/pages/AssetDisposal';
import AssetReports from '@/src/modules/assets/pages/AssetReports';
import AssetVerification from '@/src/modules/assets/pages/AssetVerification';
import PwaInstallPrompt from '@/src/shared/components/PwaInstallPrompt';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, dbUser, loading } = useAuth();
  if (loading) return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;
  if (!user || !dbUser) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
}

function HomeRoute({ children }: { children: React.ReactNode }) {
  const { user, dbUser, loading } = useAuth();
  if (loading) return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;
  if (!user || !dbUser) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <LayoutProvider>
          <PwaInstallPrompt />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<HomeRoute><Home /></HomeRoute>} />
            <Route path="/inbox" element={<PrivateRoute><Inbox /></PrivateRoute>} />
            <Route path="/procurement-dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/item-requisition" element={<PrivateRoute><PluginProtectedRoute pluginSlug="procurement"><PurchaseRequisitions /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/purchase-requisition" element={<PrivateRoute><PluginProtectedRoute pluginSlug="procurement"><PurchaseRequisitions /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/requisition-list" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><PrApprovals /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/rfq" element={<PrivateRoute><PluginProtectedRoute pluginSlug="procurement"><Rfq /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/cs" element={<PrivateRoute><PluginProtectedRoute pluginSlug="procurement"><Cs /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/po" element={<PrivateRoute><PluginProtectedRoute pluginSlug="procurement"><PurchaseOrders /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/work-orders" element={<PrivateRoute><PluginProtectedRoute pluginSlug="procurement"><WorkOrders /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/vendors" element={<PrivateRoute><PluginProtectedRoute pluginSlug="procurement"><Vendors /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/procurement-report" element={<PrivateRoute><PluginProtectedRoute pluginSlug="procurement"><ProcurementReport /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/invoices-payments" element={<PrivateRoute><PluginProtectedRoute pluginSlug="procurement"><InvoicesPayments /></PluginProtectedRoute></PrivateRoute>} />

            {/* User Panel Routes */}
            <Route path="/user-dashboard" element={<PrivateRoute><PluginProtectedRoute pluginSlug="user-panel"><UserDashboard /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/my-tasks" element={<PrivateRoute><PluginProtectedRoute pluginSlug="user-panel"><UserPanelTasks /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

            {/* Asset Management Routes */}
            <Route path="/assets-dashboard" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><AssetDashboard /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/assets" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><Assets /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/asset-schedule/:id" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><AssetSchedule /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/asset-categories" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><AssetCategories /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/asset-maintenance" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><AssetMaintenance /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/asset-disposal" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><AssetDisposal /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/asset-reports" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><AssetReports /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/asset-verification" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><AssetVerification /></PluginProtectedRoute></PrivateRoute>} />

            {/* Inventory Routes */}
            <Route path="/inventory-dashboard" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><InventoryDashboard /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/inventory-categories" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><ItemCategories /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/inventory" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><Inventory /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/stock-in" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><StockIn /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/stock-out" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><StockOut /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/stock-transfer" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><StockTransfer /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/transfer-receive" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><StockTransferReceive /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/grn" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><Grn /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/inventory-report" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><InventoryReport /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/requisition-report" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><RequisitionReport /></PluginProtectedRoute></PrivateRoute>} />
            {/* Phase 1 New Routes */}
            <Route path="/stock-reconciliation" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><StockReconciliation /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/rejected-items" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><RejectedItems /></PluginProtectedRoute></PrivateRoute>} />
  
            <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
            <Route path="/admin/organogram" element={<PrivateRoute><OrganogramPage /></PrivateRoute>} />
            <Route path="/admin/warehouses" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><WarehouseManager /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/admin/workflow-designer" element={<PrivateRoute><WorkflowDesigner /></PrivateRoute>} />
            {/* User Panel Routes */}
            <Route path="/user-dashboard" element={<PrivateRoute><PluginProtectedRoute pluginSlug="user-panel"><UserDashboard /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/my-tasks" element={<Navigate to="/inbox" replace />} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </LayoutProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
