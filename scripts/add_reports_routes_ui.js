import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Modify App.tsx
const appPath = path.join(__dirname, '../src/App.tsx');
let appContent = fs.readFileSync(appPath, 'utf8');

if (!appContent.includes("ReportsDashboard")) {
    appContent = appContent.replace(
        "import AssetDeprReports from '@/src/modules/assets/pages/AssetDeprReports';",
        "import AssetDeprReports from '@/src/modules/assets/pages/AssetDeprReports';\nimport ReportsDashboard from '@/src/modules/reports/pages/ReportsDashboard';"
    );
    
    appContent = appContent.replace(
        "{/* Inventory Routes */}",
        `{/* Report Routes */}\n            <Route path="/master-reports" element={<PrivateRoute><PluginProtectedRoute pluginSlug="procurement"><ReportsDashboard /></PluginProtectedRoute></PrivateRoute>} />\n\n            {/* Inventory Routes */}`
    );
    fs.writeFileSync(appPath, appContent, 'utf8');
    console.log('Modified App.tsx');
}

// 2. Modify Layout.tsx
const layoutPath = path.join(__dirname, '../src/shared/components/Layout.tsx');
let layoutContent = fs.readFileSync(layoutPath, 'utf8');

if (!layoutContent.includes("/master-reports")) {
    const reportMenu = `
    const reportMenu = [
      { path: '/master-reports', label: 'Master Reports', icon: FileText, permissions: [] },
    ];
    `;
    layoutContent = layoutContent.replace(
        "const digitalAssetsMenu = [",
        `${reportMenu}\n\n  const digitalAssetsMenu = [`
    );
    
    layoutContent = layoutContent.replace(
        "{ id: 'digital-assets', label: 'Digital Assets', icon: MonitorSmartphone, permissions: ['Asset Management', 'IT Dashboard'] },",
        "{ id: 'digital-assets', label: 'Digital Assets', icon: MonitorSmartphone, permissions: ['Asset Management', 'IT Dashboard'] },\n      { id: 'reports', label: 'Analytics & Reports', icon: FileText, permissions: ['Asset Management', 'Procurement', 'Inventory'] },"
    );
    
    layoutContent = layoutContent.replace(
        "activeModule === 'digital-assets' && renderMenu(digitalAssetsMenu)",
        "activeModule === 'digital-assets' && renderMenu(digitalAssetsMenu)}\n              {activeModule === 'reports' && renderMenu(reportMenu)"
    );

    // Update activeModule logic for reports
    layoutContent = layoutContent.replace(
        "return 'digital-assets';",
        "return 'digital-assets';\n    if (path.startsWith('/master-reports')) return 'reports';"
    );

    fs.writeFileSync(layoutPath, layoutContent, 'utf8');
    console.log('Modified Layout.tsx');
}
