import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/src/shared/components/AuthProvider';
import PluginProtectedRoute from '@/src/shared/components/PluginProtectedRoute';
import PermissionProtectedRoute from '@/src/shared/components/PermissionProtectedRoute';
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
import AssetTransfers from '@/src/modules/assets/pages/AssetTransfers';
import AssetReports from '@/src/modules/assets/pages/AssetReports';
import AssetVerification from '@/src/modules/assets/pages/AssetVerification';
import AssetDeprReports from '@/src/modules/assets/pages/AssetDeprReports';
import ReportsDashboard from '@/src/modules/reports/pages/ReportsDashboard';
import AssetLocation from '@/src/modules/assets/pages/AssetLocation';
import PwaInstallPrompt from '@/src/shared/components/PwaInstallPrompt';

import DigitalAssets from '@/src/modules/digitalAssets/pages/DigitalAssets';
import Subscriptions from '@/src/modules/digitalAssets/pages/Subscriptions';
import LicenseVault from '@/src/modules/digitalAssets/pages/LicenseVault';
import Amortization from '@/src/modules/digitalAssets/pages/Amortization';
import DigitalAssetReports from '@/src/modules/digitalAssets/pages/DigitalAssetReports';
import DigitalAcceptance from '@/src/modules/digitalAssets/pages/DigitalAcceptance';
import DigitalAssetImport from '@/src/modules/digitalAssets/pages/DigitalAssetImport';

import AssetCapitalization from '@/src/modules/assets/pages/AssetCapitalization';
import AssetAssignment from '@/src/modules/assets/pages/AssetAssignment';
import AssetImport from '@/src/modules/assets/pages/AssetImport';
import AssetDeprSchedule from '@/src/modules/assets/pages/AssetDeprSchedule';

import OpeningStockUpload from '@/src/modules/inventory/pages/OpeningStockUpload';
import ItemBulkUpload from '@/src/modules/inventory/pages/ItemBulkUpload';
import StockAdjustment from '@/src/modules/inventory/pages/StockAdjustment';

import TraceabilityReport from '@/src/modules/reports/pages/TraceabilityReport';

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
            <Route path="/procurement-dashboard" element={<PrivateRoute><PluginProtectedRoute pluginSlug="procurement"><PermissionProtectedRoute menu="Procurement Dashboard"><Dashboard /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/item-requisition" element={<PrivateRoute><PluginProtectedRoute pluginSlug="procurement"><PermissionProtectedRoute menu="Item Requisitions"><PurchaseRequisitions /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/purchase-requisition" element={<PrivateRoute><PluginProtectedRoute pluginSlug="procurement"><PermissionProtectedRoute menu="Purchase Requisitions"><PurchaseRequisitions /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/requisition-list" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><PermissionProtectedRoute menu="Requisition Approval"><PrApprovals /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/rfq" element={<PrivateRoute><PluginProtectedRoute pluginSlug="procurement"><PermissionProtectedRoute menu="RFQ (Quotation)"><Rfq /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/cs" element={<PrivateRoute><PluginProtectedRoute pluginSlug="procurement"><PermissionProtectedRoute menu="Comparative Statement"><Cs /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/po" element={<PrivateRoute><PluginProtectedRoute pluginSlug="procurement"><PermissionProtectedRoute menu="Purchase Orders"><PurchaseOrders /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/work-orders" element={<PrivateRoute><PluginProtectedRoute pluginSlug="procurement"><PermissionProtectedRoute menu="Work Orders"><WorkOrders /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/vendors" element={<PrivateRoute><PluginProtectedRoute pluginSlug="procurement"><PermissionProtectedRoute menu="Vendors"><Vendors /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/procurement-report" element={<PrivateRoute><PluginProtectedRoute pluginSlug="procurement"><PermissionProtectedRoute menu="Procurement Reports"><ProcurementReport /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/invoices-payments" element={<PrivateRoute><PluginProtectedRoute pluginSlug="procurement"><PermissionProtectedRoute menu="Invoices & Payments"><InvoicesPayments /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />

            {/* User Panel Routes */}
            <Route path="/user-dashboard" element={<PrivateRoute><PluginProtectedRoute pluginSlug="user-panel"><UserDashboard /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/my-tasks" element={<PrivateRoute><PluginProtectedRoute pluginSlug="user-panel"><UserPanelTasks /></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

            {/* Asset Management Routes */}
            <Route path="/assets-dashboard" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="Asset Dashboard"><AssetDashboard /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/assets" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="Assets Register"><Assets /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/asset-schedule/:id" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="Assets Register"><AssetSchedule /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/asset-categories" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="Asset Categories"><AssetCategories /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/asset-transfers" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="Asset Transfers"><AssetTransfers /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/assets/transfers" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="Asset Transfers"><AssetTransfers /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/asset-maintenance" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="Asset Maintenance"><AssetMaintenance /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/asset-disposal" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="Asset Disposal"><AssetDisposal /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/asset-reports" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="Asset Reports"><AssetReports /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/asset-depr-reports" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="Depreciation Reports"><AssetDeprReports /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/asset-verification" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="Physical Audit"><AssetVerification /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/asset-location" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="Asset Location"><AssetLocation /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/asset-capitalization" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="Asset Capitalization"><AssetCapitalization /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/asset-assignment" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="Asset Assignment"><AssetAssignment /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/asset-import" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="Asset Import"><AssetImport /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/asset-depr-schedule" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="Depreciation Schedule"><AssetDeprSchedule /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />

            {/* Digital Assets Routes */}
            <Route path="/digital-assets" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="Digital Asset Register"><DigitalAssets /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/digital-assets/subscriptions" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="Digital Subscriptions"><Subscriptions /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/digital-assets/vault" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="License Vault"><LicenseVault /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/digital-assets/amortization" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="Digital Amortization"><Amortization /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/digital-assets/reports" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="Digital Asset Reports"><DigitalAssetReports /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/digital-assets/acceptance" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="Digital Acceptance"><DigitalAcceptance /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/digital-assets/import" element={<PrivateRoute><PluginProtectedRoute pluginSlug="asset-management"><PermissionProtectedRoute menu="Digital Asset Import"><DigitalAssetImport /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />

            {/* Report Routes */}
            <Route path="/master-reports" element={<PrivateRoute><PluginProtectedRoute pluginSlug="procurement"><PermissionProtectedRoute menu="Procurement Reports"><ReportsDashboard /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/traceability-report" element={<PrivateRoute><PluginProtectedRoute pluginSlug="procurement"><PermissionProtectedRoute menu="Traceability Report"><TraceabilityReport /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />

            {/* Inventory Routes */}
            <Route path="/inventory-dashboard" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><PermissionProtectedRoute menu="Inventory Dashboard"><InventoryDashboard /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/inventory-categories" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><PermissionProtectedRoute menu="Inventory Items"><ItemCategories /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/inventory" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><PermissionProtectedRoute menu="Inventory Items"><Inventory /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/stock-in" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><PermissionProtectedRoute menu="Stock In"><StockIn /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/stock-out" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><PermissionProtectedRoute menu="Stock Out"><StockOut /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/stock-transfer" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><PermissionProtectedRoute menu="Stock Transfer"><StockTransfer /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/transfer-receive" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><PermissionProtectedRoute menu="Transfer Receive"><StockTransferReceive /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/grn" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><PermissionProtectedRoute menu="Goods Receipt (GRN)"><Grn /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/inventory-report" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><PermissionProtectedRoute menu="Inventory Reports"><InventoryReport /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/requisition-report" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><PermissionProtectedRoute menu="Requisition Report"><RequisitionReport /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/stock-reconciliation" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><PermissionProtectedRoute menu="Stock Reconciliation"><StockReconciliation /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/rejected-items" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><PermissionProtectedRoute menu="Rejected Items"><RejectedItems /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/opening-stock-upload" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><PermissionProtectedRoute menu="Opening Stock Upload"><OpeningStockUpload /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/inventory-bulk-upload" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><PermissionProtectedRoute menu="Item Bulk Upload"><ItemBulkUpload /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/stock-adjustment" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><PermissionProtectedRoute menu="Stock Adjustment"><StockAdjustment /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
  
            <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
            <Route path="/admin/organogram" element={<PrivateRoute><OrganogramPage /></PrivateRoute>} />
            <Route path="/admin/warehouses" element={<PrivateRoute><PluginProtectedRoute pluginSlug="inventory"><PermissionProtectedRoute menu="Warehouses"><WarehouseManager /></PermissionProtectedRoute></PluginProtectedRoute></PrivateRoute>} />
            <Route path="/admin/workflow-designer" element={<PrivateRoute><WorkflowDesigner /></PrivateRoute>} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </LayoutProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
