import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { useSettings } from '@/src/shared/components/SettingsProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';
import { Shield, User, Plus, Trash2, Image as ImageIcon, ChevronRight, ChevronDown, Edit, FileText } from 'lucide-react';
import { cn } from '@/src/shared/lib/utils';
import PageLayout from '@/src/shared/components/PageLayout';
import CompanyManager from '../components/CompanyManager';
import BranchManager from '../components/BranchManager';
import PluginManager from '../components/PluginManager';
import { WarehouseManagerTab } from '../components/WarehouseManagerTab';
import NotificationSettings from './NotificationSettings';
import AdminDashboard from '../components/AdminDashboard';

export default function Admin() {
  const { getToken, dbUser, permissions: authPerms } = useAuth();
  const { refreshSettings, settings } = useSettings();

  const isSuperAdmin = dbUser?.role === 'Super Admin';
  const hasPerm = (moduleName: string, action: 'canCreate' | 'canEdit' | 'canDelete') => {
    if (isSuperAdmin) return true;
    const p = authPerms?.find((p: any) => p.module === moduleName);
    return p ? p[action] : false;
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  
  const [users, setUsers] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePlugins, setActivePlugins] = useState<string[]>([]);
  
  const [allCompanies, setAllCompanies] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setSearchQuery('');
    setCurrentPage(1);
  }, [activeTab]);

  // User Form State
  const [showUserForm, setShowUserForm] = useState(false);
  const [userFormData, setUserFormData] = useState<{
    id: number | null, email: string, password?: string, department: string, role: string,
    name: string, designation: string, phone: string, supervisorUid: string, branchId: string
  }>({ id: null, email: '', password: '', department: '', role: '', name: '', designation: '', phone: '', supervisorUid: '', branchId: '' });
  
  // Custom Searchable Dropdown states
  const [showSupervisorDropdown, setShowSupervisorDropdown] = useState(false);
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [showDesigDropdown, setShowDesigDropdown] = useState(false);
  const [desigSearch, setDesigSearch] = useState('');
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [deptSearch, setDeptSearch] = useState('');

  // Inline Create Modal State
  const [inlineCreateType, setInlineCreateType] = useState<'department' | 'designation' | null>(null);
  const [inlineCreateName, setInlineCreateName] = useState('');
  const [inlineCreateCode, setInlineCreateCode] = useState('');

  // Department & Designation Settings State
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [deptId, setDeptId] = useState<number | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptParentId, setDeptParentId] = useState<number | null>(null);
  const [deptManagerUid, setDeptManagerUid] = useState('');

  // Unit State
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [unitId, setUnitId] = useState<number | null>(null);
  const [unitName, setUnitName] = useState('');
  const [unitCode, setUnitCode] = useState('');
  const [unitDeptId, setUnitDeptId] = useState<number | null>(null);
  const [unitManagerUid, setUnitManagerUid] = useState('');

  const [showDesigForm, setShowDesigForm] = useState(false);
  const [desigName, setDesigName] = useState('');

  // Workflow State
  const [showWfForm, setShowWfForm] = useState(false);
  const [wfDept, setWfDept] = useState('');
  const [wfStep, setWfStep] = useState(1);
  const [wfRole, setWfRole] = useState('');
  const [wfDocType, setWfDocType] = useState('PR');

  // Role Form State
  const [editingRole, setEditingRole] = useState<{name: string, isNew: boolean} | null>(null);
  const [tempPermissions, setTempPermissions] = useState<Record<string, any>>({});
  
  // UI Expansion states for the new Tree Form
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const hierarchy = [
    {
      module: "Procurement",
      menus: [
        { name: "Dashboard", actions: ["canView"] },
        { name: "Purchase Requisitions", actions: ["canView", "canCreate", "canEdit", "canDelete", "canApprove"] },
        { name: "RFQ (Quotation)", actions: ["canView", "canCreate", "canEdit"] },
        { name: "Comparative Statement", actions: ["canView", "canCreate", "canEdit", "canApprove"] },
        { name: "Purchase Orders", actions: ["canView", "canCreate"] },
        { name: "Work Orders", actions: ["canView"] },
        { name: "Invoices & Payments", actions: ["canView", "canCreate"] },
        { name: "Vendors", actions: ["canView", "canCreate", "canEdit"] },
        { name: "Reports", actions: ["canView"] }
      ]
    },
    {
      module: "Inventory Management",
      menus: [
        { name: "Dashboard", actions: ["canView"] },
        { name: "Requisition Approval", actions: ["canView", "canCreate", "canApprove"] },
        { name: "Stock In", actions: ["canView", "canCreate"] },
        { name: "Stock Out", actions: ["canView", "canCreate", "canApprove"] },
        { name: "Stock Transfer", actions: ["canView", "canCreate"] },
        { name: "Transfer Receive", actions: ["canView", "canCreate"] },
        { name: "Goods Receipt (GRN)", actions: ["canView", "canCreate", "canApprove"] },
        { name: "Rejected Items", actions: ["canView"] },
        { name: "Stock Reconciliation", actions: ["canView", "canCreate", "canEdit", "canApprove"] },
        { name: "Inventory Items", actions: ["canView", "canCreate"] },
        { name: "Warehouses", actions: ["canView", "canCreate", "canEdit"] },
        { name: "Reports", actions: ["canView"] },
        { name: "Requisition Report", actions: ["canView"] }
      ]
    },
    {
      module: "System Configuration",
      menus: [
        { name: "Dashboard", actions: ["canView"] },
        { name: "System Setting", actions: ["canView", "canEdit"] },
        { name: "Company Profile", actions: ["canView", "canEdit"] },
        { name: "Branches", actions: ["canView", "canCreate", "canEdit"] },
        { name: "User Setting", actions: ["canView", "canCreate", "canEdit", "canDelete"] },
        { name: "Departments", actions: ["canView", "canCreate", "canEdit"] },
        { name: "Units", actions: ["canView", "canCreate", "canEdit"] },
        { name: "Designations", actions: ["canView", "canCreate"] },
        { name: "Warehouses", actions: ["canView", "canCreate", "canEdit"] },
        { name: "Workflow Engine", actions: ["canView", "canCreate", "canEdit", "canDelete"] }
      ]
    },
    {
      module: "User Panel",
      menus: [
        { name: "User Dashboard", actions: ["canView"] },
        { name: "Global Tasks", actions: ["canView"] },
        { name: "Item Requisitions", actions: ["canView", "canCreate", "canEdit", "canDelete", "canApprove"] },
        { name: "My Profile", actions: ["canView", "canEdit"] }
      ]
    },
    {
      module: "Asset Management",
      menus: [
        { name: "Dashboard", actions: ["canView"] },
        { name: "Assets Register", actions: ["canView", "canCreate", "canEdit", "canDelete", "canApprove"] },
        { name: "Asset Categories", actions: ["canView", "canCreate", "canEdit", "canDelete"] },
        { name: "Depreciation Schedule", actions: ["canView", "canCreate"] },
        { name: "Asset Transfers", actions: ["canView", "canCreate", "canEdit", "canDelete", "canApprove"] },
        { name: "Asset Maintenance", actions: ["canView", "canCreate", "canEdit", "canDelete"] },
        { name: "Asset Disposal", actions: ["canView", "canCreate", "canEdit", "canDelete", "canApprove"] },
        { name: "Physical Audit", actions: ["canView", "canCreate", "canEdit"] },
        { name: "Asset Reports", actions: ["canView"] }
      ]
    }
  ];


  const handlePrintManual = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Pop-ups are blocked on this browser.");
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Approval Workflows User Manual</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #1e293b;
              line-height: 1.6;
            }
            h1 {
              color: #f97316;
              border-bottom: 2px solid #f97316;
              padding-bottom: 10px;
              font-size: 24px;
            }
            h2 {
              color: #0f172a;
              font-size: 18px;
              margin-top: 30px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 5px;
            }
            ul {
              padding-left: 20px;
            }
            li {
              margin-bottom: 10px;
            }
            .section {
              margin-bottom: 20px;
            }
            .strong {
              font-weight: bold;
              color: #0f172a;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <h1>অনুমোদন ওয়ার্কফ্লো ইউজার ম্যানুয়াল (Approval Workflows User Manual)</h1>
          <p>এই ম্যানুয়ালে সিস্টেমে তৈরি করা ৫টি অনুমোদন ফ্লো এবং সেগুলো যেভাবে কাজ করবে, তার বিস্তারিত ব্যাখ্যা দেওয়া হলো:</p>
          
          <div class="section">
            <h2>১. New Item Requisition Workflow (ডকুমেন্ট টাইপ: Item Requisition)</h2>
            <p><span class="strong">কখন ট্রিগার হবে:</span> যখন কোনো সাধারণ এমপ্লয়ি ইনভেন্টরি থেকে কোনো প্রোডাক্ট নেওয়ার জন্য Requisition সাবমিট করবেন।</p>
            <p><span class="strong">অনুমোদন প্রক্রিয়া (১টি ধাপ):</span></p>
            <ul>
              <li>রিকুয়েস্ট সাবমিট হওয়ামাত্রই সেটি সরাসরি ইউজারের নিজ বিভাগের <strong>Department Head</strong>-এর গ্লোবাল ইনবক্সে চলে যাবে। তিনি অ্যাপ্রুভ করলে রিকুয়েশনটি সরাসরি ফুলফিলমেন্টের জন্য ওয়্যারহাউসে চলে যাবে।</li>
            </ul>
          </div>

          <div class="section">
            <h2>২. PR Create by Warehouse Manager (ডকুমেন্ট টাইপ: Purchase Requisition)</h2>
            <p><span class="strong">কখন ট্রিগার হবে:</span> যখন রিকুইজিশন করা প্রোডাক্ট ইনভেন্টরিতে না থাকায় একটি Purchase Requisition (PR) তৈরি করা হবে।</p>
            <p><span class="strong">অনুমোদন প্রক্রিয়া (২টি ধাপ - ক্রমানুসারে):</span></p>
            <ul>
              <li><strong>ধাপ ১:</strong> প্রথমে PR-টি অনুমোদনের জন্য যাবে <strong>Executive Vice President & Head of Operations</strong>-এর ইনবক্সে।</li>
              <li><strong>ধাপ ২:</strong> তিনি অ্যাপ্রুভ করার পর, এটি স্বয়ংক্রিয়ভাবে পরবর্তী অনুমোদনের জন্য <strong>SEVP & Chief Financial Officer</strong>-এর কাছে চলে যাবে। ফাইনাল CFO অ্যাপ্রুভ করার পরেই এটি সফলভাবে অনুমোদিত হবে এবং RFQ বা কোটেশন সংগ্রহের কাজ শুরু করা যাবে।</li>
            </ul>
          </div>

          <div class="section">
            <h2>৩. Stock out Approval (ডকুমেন্ট টাইপ: Stock Out)</h2>
            <p><span class="strong">কখন ট্রিগার হবে:</span> যখন কোনো ওয়্যারহাউস থেকে রিকুইজিশনের বিপরীতে প্রোডাক্ট বের করার (Stock Out/Delivery) উদ্যোগ নেওয়া হবে।</p>
            <p><span class="strong">অনুমোদন প্রক্রিয়া (১টি ধাপ):</span></p>
            <ul>
              <li>প্রোডাক্ট ওয়্যারহাউস থেকে এমপ্লয়ির কাছে ডেলিভারি করার আগে এই রিকুয়েস্টটি <strong>Executive Vice President & Head of Operations</strong>-এর কাছে যাবে। তিনি অনুমোদন দিলেই কেবল সিস্টেম থেকে স্টক খালি হবে এবং এমপ্লয়ি প্রোডাক্টটি গ্রহণ করতে পারবেন।</li>
            </ul>
          </div>

          <div class="section">
            <h2>④. Stock Transfer Approval (ডকুমেন্ট টাইপ: Stock Transfer)</h2>
            <p><span class="strong">কখন ট্রিগার হবে:</span> যখন এক ওয়্যারহাউস থেকে অন্য ওয়্যারহাউসে প্রোডাক্ট স্থানান্তর (Stock Transfer) করার রিকুয়েস্ট পাঠানো হবে।</p>
            <p><span class="strong">অনুমোদন প্রক্রিয়া (১টি ধাপ):</span></p>
            <ul>
              <li>এক ওয়্যারহাউস থেকে প্রোডাক্ট বের হয়ে ট্রানজিটে যাওয়ার পূর্বে অবশ্যই <strong>Executive Vice President & Head of Operations</strong>-কে এটি অ্যাপ্রুভ করতে হবে। তিনি অনুমোদন দিলে প্রোডাক্টটি 'Transit' স্ট্যাটাসে চলে যাবে।</li>
            </ul>
          </div>

          <div class="section">
            <h2>৫. CS Approval (Amount Wise) (ডকুমেন্ট টাইপ: CS Evaluation)</h2>
            <p><span class="strong">কখন ট্রিগার হবে:</span> ভেন্ডরদের থেকে পাওয়া কোটেশনগুলো মূল্যায়নের জন্য যখন Comparative Statement (CS) তৈরি করে সাবমিট করা হবে।</p>
            <p><span class="strong">অনুমোদন প্রক্রিয়া (অ্যামাউন্ট অনুযায়ী ৩টি আলাদা পথ):</span></p>
            <ul>
              <li><strong>Path 1 (টাকার পরিমাণ ৫,০০০ BDT বা তার কম হলে):</strong> রিকুয়েস্টটি সরাসরি <strong>Executive Vice President & Head of Operations</strong>-এর কাছে যাবে এবং তিনি অ্যাপ্রুভ করলেই এটি সম্পূর্ণ হবে।</li>
              <li><strong>Path 2 (টাকার পরিমাণ ৫,০০১ থেকে ১,০০,০০০ BDT এর মধ্যে হলে):</strong> ক্রমানুসারে প্রথমে <strong>Executive Vice President & Head of Operations</strong> অনুমোদন দেবেন এবং তারপর ফাইনাল অনুমোদনের জন্য <strong>Chief Executive Officer (CEO)</strong>-এর ইনবক্সে চলে যাবে।</li>
              <li><strong>Path 3 (টাকার পরিমাণ ১,০০,০০০ BDT এর বেশি হলে):</strong> এটিও ২য় পাথের মতোই ক্রমানুসারে প্রথমে <strong>Executive Vice President & Head of Operations</strong> এবং শেষে <strong>Chief Executive Officer (CEO)</strong>-এর ডাবল লেয়ার অ্যাপ্রুভাল পার হয়ে সম্পন্ন হবে।</li>
            </ul>
          </div>

          <div class="section" style="margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 20px;">
            <h2>💡 ইনভেন্টরি রিকুইজিশন ফুলফিলমেন্ট ও ডেলিভারি সম্পর্কিত নোট:</h2>
            <p>রিকুইজিশন ডেলিভারি করার জন্য আলাদাভাবে জেনারেল স্টক আউট রিকুয়েস্ট করার প্রয়োজন নেই। যখন কোনো <strong>Item Requisition</strong> অ্যাপ্রুভড হয়, তখন ওয়্যারহাউস ইনচার্জ বা অ্যাডমিন সরাসরি রিকুইজিশন লিস্ট থেকে উক্ত রিকুইজিশনটি <strong>Fulfill Requisition</strong> বাটনে ক্লিক করে ডেলিভারি করতে পারেন। এর মাধ্যমে সিস্টেম অটোমেটিক ওয়্যারহাউস থেকে স্টক মাইনাস করে দেয়। আর সাইডবারের <strong>Stock Out</strong> মডিউলটি মূলত রিকুইজিশন ছাড়া সরাসরি ডেলিভারি বা স্টক আউটের জন্য ব্যবহৃত হয়।</p>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  const loadData = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      // Determine which resources we actually need based on activeTab
      const needsUsers = ['users', 'departments', 'units'].includes(activeTab);
      const needsPermissions = ['permissions'].includes(activeTab);
      const needsDepartments = ['users', 'departments', 'units', 'workflows'].includes(activeTab);
      const needsWorkflows = ['workflows'].includes(activeTab);
      const needsDesignations = ['users', 'designations'].includes(activeTab);
      const needsBranches = ['users'].includes(activeTab);
      const needsRoles = ['users', 'workflows', 'permissions'].includes(activeTab);
      const needsUnits = ['users', 'units'].includes(activeTab);
      const needsActivePlugins = ['users', 'workflows', 'permissions'].includes(activeTab);

      setLoading(true);
      const [uRes, pRes, dRes, wRes, rRes, desigRes, plRes, unitsRes, brRes] = await Promise.all([
        needsUsers ? fetchWithAuth('/api/users', token) : Promise.resolve(null),
        needsPermissions ? fetchWithAuth('/api/permissions', token) : Promise.resolve(null),
        needsDepartments ? fetchWithAuth('/api/departments', token) : Promise.resolve(null),
        needsWorkflows ? fetchWithAuth('/api/workflows', token) : Promise.resolve(null),
        needsRoles ? fetchWithAuth('/api/roles', token) : Promise.resolve(null),
        needsDesignations ? fetchWithAuth('/api/designations', token) : Promise.resolve(null),
        needsActivePlugins ? fetchWithAuth('/api/plugins/active', token) : Promise.resolve(null),
        needsUnits ? fetchWithAuth('/api/units', token) : Promise.resolve(null),
        needsBranches ? fetchWithAuth('/api/branches', token) : Promise.resolve(null)
      ]);

      if (needsUsers && uRes) setUsers(uRes || []);
      if (needsPermissions && pRes) setPermissions(pRes || []);
      if (needsDepartments && dRes) setDepartments(dRes || []);
      if (needsWorkflows && wRes) setWorkflows(wRes || []);
      if (needsDesignations && desigRes) setDesignations(desigRes || []);
      if (needsUnits && unitsRes) setUnits(unitsRes || []);
      if (needsBranches && brRes) setBranches(brRes || []);
      if (needsActivePlugins && plRes) {
        setActivePlugins(plRes?.plugins?.map((p: any) => p.slug) || []);
      }
      if (needsRoles && rRes) {
        const fetchedRoles = rRes.map((r: any) => r.name);
        setRoles([...new Set(fetchedRoles)] as string[]);
      }
    } catch (error) {
      console.error("Failed to load admin tab data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [getToken, activeTab]);

  const handleUpdateRole = async (userId: number, role: string) => {
    try {
      const token = await getToken();
      await fetchWithAuth(`/api/users/${userId}/role`, token, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      loadData();
    } catch (error) {
      console.error("Failed to update user role", error);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = await getToken();
      const q = '';
      if (userFormData.id) {
        await fetchWithAuth(`/api/users/${userFormData.id}${q}`, token, {
          method: 'PUT',
          body: JSON.stringify(userFormData),
        });
      } else {
        await fetchWithAuth(`/api/users${q}`, token, {
          method: 'POST',
          body: JSON.stringify(userFormData),
        });
      }
      setShowUserForm(false);
      loadData();
    } catch (error) {
      console.error("Failed to save user", error);
      alert("Failed to save user. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (user: any) => {
    try {
      const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
      const token = await getToken();
      await fetchWithAuth(`/api/users/${user.id}/status`, token, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      loadData();
    } catch (error) {
      console.error("Failed to update status", error);
      alert("Failed to update user status.");
    }
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (deptId) {
        await fetchWithAuth(`/api/departments/${deptId}`, token, {
          method: 'PUT',
          body: JSON.stringify({ name: deptName, code: deptCode, parentId: deptParentId, managerUid: deptManagerUid || null })
        });
      } else {
        await fetchWithAuth('/api/departments', token, {
          method: 'POST',
          body: JSON.stringify({ name: deptName, code: deptCode, parentId: deptParentId, managerUid: deptManagerUid || null })
        });
      }
      setShowDeptForm(false);
      setDeptId(null);
      setDeptName('');
      setDeptCode('');
      setDeptParentId(null);
      setDeptManagerUid('');
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to save department");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (unitId) {
        await fetchWithAuth(`/api/units/${unitId}`, token, {
          method: 'PUT',
          body: JSON.stringify({ name: unitName, code: unitCode, departmentId: unitDeptId, managerUid: unitManagerUid || null })
        });
      } else {
        await fetchWithAuth('/api/units', token, {
          method: 'POST',
          body: JSON.stringify({ name: unitName, code: unitCode, departmentId: unitDeptId, managerUid: unitManagerUid || null })
        });
      }
      setShowUnitForm(false);
      setUnitId(null);
      setUnitName('');
      setUnitCode('');
      setUnitDeptId(null);
      setUnitManagerUid('');
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to save unit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUnitStatus = async (id: number, currentStatus: string) => {
    try {
      const token = await getToken();
      await fetchWithAuth(`/api/units/${id}/status`, token, {
        method: 'PUT',
        body: JSON.stringify({ status: currentStatus === 'Active' ? 'Inactive' : 'Active' }),
      });
      loadData();
    } catch (error) {
      console.error("Failed to update unit status", error);
    }
  };

  const handleToggleDeptStatus = async (id: number, currentStatus: string) => {
    try {
      const token = await getToken();
      await fetchWithAuth(`/api/departments/${id}/status`, token, {
        method: 'PUT',
        body: JSON.stringify({ status: currentStatus === 'Active' ? 'Inactive' : 'Active' }),
      });
      loadData();
    } catch (error) {
      console.error("Failed to update department status", error);
    }
  };

  const handleToggleDesigStatus = async (id: number, currentStatus: string) => {
    try {
      const token = await getToken();
      await fetchWithAuth(`/api/designations/${id}/status`, token, {
        method: 'PUT',
        body: JSON.stringify({ status: currentStatus === 'Active' ? 'Inactive' : 'Active' }),
      });
      loadData();
    } catch (error) {
      console.error("Failed to update designation status", error);
    }
  };

  const handleCreateDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desigName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = await getToken();
      const q = '';
      await fetchWithAuth(`/api/designations${q}`, token, {
        method: 'POST',
        body: JSON.stringify({ name: desigName }),
      });
      setShowDesigForm(false);
      setDesigName('');
      loadData();
    } catch (error) {
      console.error("Failed to create designation", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInlineCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineCreateName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = await getToken();
      const q = '';
      if (inlineCreateType === 'department') {
        const res = await fetchWithAuth(`/api/departments${q}`, token, {
          method: 'POST',
          body: JSON.stringify({ name: inlineCreateName, code: inlineCreateCode }),
        });
        setUserFormData(prev => ({ ...prev, department: inlineCreateName }));
      } else if (inlineCreateType === 'designation') {
        const res = await fetchWithAuth(`/api/designations${q}`, token, {
          method: 'POST',
          body: JSON.stringify({ name: inlineCreateName }),
        });
        setUserFormData(prev => ({ ...prev, designation: inlineCreateName }));
      }
      setInlineCreateType(null);
      setInlineCreateName('');
      setInlineCreateCode('');
      loadData();
    } catch (error) {
      console.error("Failed to inline create", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wfDept || !wfRole || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = await getToken();
      const q = '';
      await fetchWithAuth(`/api/workflows${q}`, token, {
        method: 'POST',
        body: JSON.stringify({ documentType: wfDocType, department: wfDept, stepOrder: wfStep, roleRequired: wfRole }),
      });
      setShowWfForm(false);
      setWfDept('');
      setWfStep(1);
      setWfRole('');
      setWfDocType('PR');
      loadData();
    } catch (error) {
      console.error("Failed to create workflow", error);
    }
  };

  const handleSaveRoleForm = async () => {
    if (!editingRole || !editingRole.name.trim()) return;
    
    // Flatten tempPermissions
    const permsPayload: any[] = [];
    Object.keys(tempPermissions).forEach(menuName => {
      const actions = tempPermissions[menuName];
      if (Object.values(actions).some(v => v === true)) {
        permsPayload.push({
          module: menuName,
          ...actions
        });
      }
    });

    try {
      const token = await getToken();
      const q = '';
      await fetchWithAuth(`/api/roles${q}`, token, {
        method: 'POST',
        body: JSON.stringify({ 
          name: editingRole.name.trim(), 
          description: '', 
          permissions: permsPayload 
        }),
      });
      setEditingRole(null);
      loadData();
    } catch (error) {
      console.error("Failed to save role", error);
    }
  };

  const handleDeleteWorkflow = async (id: number) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    try {
      const token = await getToken();
      await fetchWithAuth(`/api/workflows/${id}`, token, { method: 'DELETE' });
      loadData();
    } catch (error) {
      console.error("Failed to delete workflow", error);
    }
  };

  // UI Helpers for Tree
  const isModuleChecked = (mod: any) => {
    return expandedModules.includes(mod.module);
  };
  
  const toggleModule = (mod: any, checked: boolean) => {
    const menuNames = mod.menus.map((m: any) => m.name);
    if (checked) {
      setExpandedModules([...expandedModules, mod.module]);
      // Auto-check all menus under this module
      setExpandedMenus(prev => [...new Set([...prev, ...menuNames])]);
      
      // Auto-check all actions for all menus under this module
      setTempPermissions(prev => {
        const next = { ...prev };
        mod.menus.forEach((menu: any) => {
          const actionsObj: Record<string, boolean> = {};
          menu.actions.forEach((act: string) => {
            actionsObj[act] = true;
          });
          next[menu.name] = actionsObj;
        });
        return next;
      });
    } else {
      setExpandedModules(expandedModules.filter(m => m !== mod.module));
      // Auto-uncheck menus if module is unchecked
      setExpandedMenus(expandedMenus.filter(m => !menuNames.includes(m)));
      
      // Clear permissions for these menus
      setTempPermissions(prev => {
        const next = { ...prev };
        menuNames.forEach((m: string) => delete next[m]);
        return next;
      });
    }
  };

  const isMenuChecked = (menu: any) => {
    return expandedMenus.includes(menu.name);
  };

  const toggleMenu = (menu: any, checked: boolean) => {
    if (checked) {
      setExpandedMenus([...expandedMenus, menu.name]);
      // Auto-check all actions under this menu
      setTempPermissions(prev => {
        const actionsObj: Record<string, boolean> = {};
        menu.actions.forEach((act: string) => {
          actionsObj[act] = true;
        });
        return {
          ...prev,
          [menu.name]: actionsObj
        };
      });
    } else {
      setExpandedMenus(expandedMenus.filter(m => m !== menu.name));
      // Clear permissions for this menu
      setTempPermissions(prev => {
        const next = { ...prev };
        delete next[menu.name];
        return next;
      });
    }
  };

  const handleActionToggle = (menuName: string, action: string, checked: boolean) => {
    setTempPermissions(prev => ({
      ...prev,
      [menuName]: {
        ...(prev[menuName] || {}),
        [action]: checked
      }
    }));
  };

  const openEditRole = (roleName: string) => {
    const initialPerms: Record<string, any> = {};
    const rolePerms = permissions.filter(p => p.role === roleName);
    const activeMenus: string[] = [];
    const activeModules = new Set<string>();

    rolePerms.forEach(p => {
      initialPerms[p.module] = {
        canView: p.canView,
        canCreate: p.canCreate,
        canEdit: p.canEdit,
        canDelete: p.canDelete,
        canApprove: p.canApprove
      };
      
      // If any permission is true, auto-expand the menu and its parent module
      if (p.canView || p.canCreate || p.canEdit || p.canDelete || p.canApprove) {
        activeMenus.push(p.module);
        
        hierarchy.forEach(mod => {
          if (mod.menus.some(m => m.name === p.module)) {
            activeModules.add(mod.module);
          }
        });
      }
    });

    setExpandedModules(Array.from(activeModules));
    setExpandedMenus(activeMenus);
    setTempPermissions(initialPerms);
    setEditingRole({ name: roleName, isNew: false });
  };

  const filteredUsers = users.filter(u => 
    (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (u.role?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
  );
  const totalUserPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const filteredDepts = departments.filter(d => 
    (d.name?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (d.code?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
  );
  const totalDeptPages = Math.ceil(filteredDepts.length / itemsPerPage);
  const paginatedDepts = filteredDepts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const filteredUnits = units.filter(u => 
    (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (u.code?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
  );
  const totalUnitPages = Math.ceil(filteredUnits.length / itemsPerPage);
  const paginatedUnits = filteredUnits.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const filteredDesigs = designations.filter(d => 
    (d.name?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
  );
  const totalDesigPages = Math.ceil(filteredDesigs.length / itemsPerPage);
  const paginatedDesigs = filteredDesigs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const filteredWorkflows = workflows.filter(w => 
    (w.documentType?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (w.department?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (w.roleRequired?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
  );
  const totalWorkflowPages = Math.ceil(filteredWorkflows.length / itemsPerPage);
  const paginatedWorkflows = filteredWorkflows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getPaginationConfig = () => {
    if (showUserForm || showDeptForm || showUnitForm || showDesigForm || showWfForm || editingRole) {
      return undefined;
    }
    switch (activeTab) {
      case 'users': return { currentPage, totalPages: totalUserPages, totalItems: filteredUsers.length, onPageChange: setCurrentPage };
      case 'departments': return { currentPage, totalPages: totalDeptPages, totalItems: filteredDepts.length, onPageChange: setCurrentPage };
      case 'units': return { currentPage, totalPages: totalUnitPages, totalItems: filteredUnits.length, onPageChange: setCurrentPage };
      case 'designations': return { currentPage, totalPages: totalDesigPages, totalItems: filteredDesigs.length, onPageChange: setCurrentPage };
      case 'workflows': return { currentPage, totalPages: totalWorkflowPages, totalItems: filteredWorkflows.length, onPageChange: setCurrentPage };
      default: return undefined;
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-500">Loading admin settings...</div>;
  }

  return (
    <PageLayout 
      loading={loading}
      search={activeTab !== 'roles' && activeTab !== 'appearance' ? { placeholder: `Search ${activeTab}...`, onSearch: setSearchQuery } : undefined}
      pagination={getPaginationConfig()}
    >
    <div className="flex h-full bg-slate-50 overflow-hidden rounded-xl border border-slate-200">
      {/* Main Content Area */}
      <div className="flex-1 p-8 overflow-y-auto relative">
        
        {activeTab === 'dashboard' && (
          <AdminDashboard onNavigate={(tab) => setSearchParams({ tab })} />
        )}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">User</h3>
              {hasPerm('User Setting', 'canCreate') && (
                <button
                  onClick={() => {
                    setUserFormData({ id: null, email: '', password: '', department: '', role: '', name: '', designation: '', phone: '', supervisorUid: '', branchId: '' });
                    setShowUserForm(!showUserForm);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors"
                >
                  <Plus className="-ml-1 mr-2 h-4 w-4" /> Add User
                </button>
              )}
            </div>

            {showUserForm && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <form onSubmit={handleSaveUser} className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email</label>
                    <input 
                      type="email"
                      value={userFormData.email} 
                      onChange={e=>setUserFormData({...userFormData, email: e.target.value})} 
                      required 
                      placeholder="e.g. user@example.com" 
                      className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm disabled:bg-slate-50 disabled:text-slate-500" 
                    />
                  </div>
                  {!userFormData.id && (
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Password</label>
                      <input 
                        type="password"
                        value={userFormData.password} 
                        onChange={e=>setUserFormData({...userFormData, password: e.target.value})} 
                        required={!userFormData.id} 
                        className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm" 
                      />
                    </div>
                  )}
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Name</label>
                    <input 
                      type="text"
                      value={userFormData.name} 
                      onChange={e=>setUserFormData({...userFormData, name: e.target.value})} 
                      placeholder="Full Name" 
                      className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm" 
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1 relative">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Designation</label>
                    <div 
                      onClick={() => setShowDesigDropdown(!showDesigDropdown)}
                      className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm bg-white cursor-pointer flex justify-between items-center h-[38px]"
                    >
                      <span className="truncate pr-2 text-slate-700">
                        {userFormData.designation || <span className="text-slate-400">Select...</span>}
                      </span>
                      <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </div>
                    
                    {showDesigDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-xl max-h-60 overflow-y-auto">
                        <div className="p-2 sticky top-0 bg-white border-b border-slate-100 z-10">
                          <input 
                            type="text" 
                            placeholder="Search..." 
                            value={desigSearch}
                            onChange={e => setDesigSearch(e.target.value)}
                            className="w-full border border-slate-200 rounded p-1.5 text-sm focus:ring-brand-orange focus:border-brand-orange outline-none"
                            onClick={e => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                        <div 
                          className="px-3 py-2.5 text-sm hover:bg-slate-50 cursor-pointer text-slate-500 italic border-b border-slate-50"
                          onClick={() => { setUserFormData({...userFormData, designation: ''}); setShowDesigDropdown(false); }}
                        >
                          Clear
                        </div>
                        {designations
                          .filter(d => (d.status || 'Active') === 'Active')
                          .filter(d => (d.name?.toLowerCase().includes(desigSearch.toLowerCase()) || ''))
                          .map(d => (
                            <div 
                              key={d.id} 
                              className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-50 font-medium text-slate-700"
                              onClick={() => { setUserFormData({...userFormData, designation: d.name}); setShowDesigDropdown(false); setDesigSearch(''); }}
                            >
                              {d.name}
                            </div>
                          ))
                        }
                        <div 
                          className="px-3 py-3 text-sm text-brand-orange font-bold hover:bg-brand-orange/5 cursor-pointer flex items-center gap-1 sticky bottom-0 bg-white border-t border-slate-100"
                          onClick={() => { 
                            setInlineCreateType('designation'); 
                            setInlineCreateName(desigSearch); 
                            setShowDesigDropdown(false); 
                            setDesigSearch(''); 
                          }}
                        >
                          <Plus className="w-4 h-4" /> Create New
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Phone</label>
                    <input 
                      type="tel"
                      value={userFormData.phone} 
                      onChange={e=>setUserFormData({...userFormData, phone: e.target.value})} 
                      placeholder="+880..." 
                      className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm" 
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Branch *</label>
                    <select 
                      value={userFormData.branchId} 
                      onChange={e=>setUserFormData({...userFormData, branchId: e.target.value})} 
                      required 
                      className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm"
                    >
                      <option value="">Select Branch</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 md:col-span-1 relative">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Supervisor</label>
                    <div 
                      onClick={() => setShowSupervisorDropdown(!showSupervisorDropdown)}
                      className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm bg-white cursor-pointer flex justify-between items-center h-[38px]"
                    >
                      <span className="truncate pr-2 text-slate-700">
                        {userFormData.supervisorUid 
                          ? (users.find(u => u.uid === userFormData.supervisorUid)?.name || users.find(u => u.uid === userFormData.supervisorUid)?.email) 
                          : <span className="text-slate-400">Select Supervisor...</span>}
                      </span>
                      <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </div>
                    
                    {showSupervisorDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-xl max-h-60 overflow-y-auto">
                        <div className="p-2 sticky top-0 bg-white border-b border-slate-100">
                          <input 
                            type="text" 
                            placeholder="Search by name or email..." 
                            value={supervisorSearch}
                            onChange={e => setSupervisorSearch(e.target.value)}
                            className="w-full border border-slate-200 rounded p-1.5 text-sm focus:ring-brand-orange focus:border-brand-orange outline-none"
                            onClick={e => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                        <div 
                          className="px-3 py-2.5 text-sm hover:bg-slate-50 cursor-pointer text-slate-500 italic"
                          onClick={() => { setUserFormData({...userFormData, supervisorUid: ''}); setShowSupervisorDropdown(false); }}
                        >
                          No Supervisor
                        </div>
                        {users
                          .filter(u => u.id !== userFormData.id) // Cannot be own supervisor
                          .filter(u => (u.status || 'Active') === 'Active')
                          .filter(u => ((u.name || u.email)?.toLowerCase().includes(supervisorSearch.toLowerCase()) || ''))
                          .map(u => (
                            <div 
                              key={u.uid} 
                              className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-t border-slate-50"
                              onClick={() => { setUserFormData({...userFormData, supervisorUid: u.uid}); setShowSupervisorDropdown(false); setSupervisorSearch(''); }}
                            >
                              <div className="font-bold text-slate-800">{u.name || 'Unnamed User'}</div>
                              <div className="text-xs text-slate-500">{u.email}</div>
                            </div>
                          ))
                        }
                        {users.filter(u => u.id !== userFormData.id && (u.status || 'Active') === 'Active' && ((u.name || u.email)?.toLowerCase().includes(supervisorSearch.toLowerCase()) || '')).length === 0 && (
                          <div className="px-3 py-4 text-sm text-center text-slate-400">No matching users</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="col-span-2 md:col-span-1 relative">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Department</label>
                    <div 
                      onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                      className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm bg-white cursor-pointer flex justify-between items-center h-[38px]"
                    >
                      <span className="truncate pr-2 text-slate-700">
                        {userFormData.department || <span className="text-slate-400">Select...</span>}
                      </span>
                      <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </div>
                    
                    {showDeptDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-xl max-h-60 overflow-y-auto">
                        <div className="p-2 sticky top-0 bg-white border-b border-slate-100 z-10">
                          <input 
                            type="text" 
                            placeholder="Search..." 
                            value={deptSearch}
                            onChange={e => setDeptSearch(e.target.value)}
                            className="w-full border border-slate-200 rounded p-1.5 text-sm focus:ring-brand-orange focus:border-brand-orange outline-none"
                            onClick={e => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                        <div 
                          className="px-3 py-2.5 text-sm hover:bg-slate-50 cursor-pointer text-slate-500 italic border-b border-slate-50"
                          onClick={() => { setUserFormData({...userFormData, department: ''}); setShowDeptDropdown(false); }}
                        >
                          None
                        </div>
                        {departments
                          .filter(d => (d.status || 'Active') === 'Active')
                          .filter(d => (d.name?.toLowerCase().includes(deptSearch.toLowerCase()) || '') || (d.code?.toLowerCase().includes(deptSearch.toLowerCase()) || ''))
                          .map(d => (
                            <div 
                              key={d.id} 
                              className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-50"
                              onClick={() => { setUserFormData({...userFormData, department: d.name}); setShowDeptDropdown(false); setDeptSearch(''); }}
                            >
                              <div className="font-medium text-slate-700">{d.name}</div>
                              <div className="text-xs text-slate-400 font-mono">{d.code}</div>
                            </div>
                          ))
                        }
                        <div 
                          className="px-3 py-3 text-sm text-brand-orange font-bold hover:bg-brand-orange/5 cursor-pointer flex items-center gap-1 sticky bottom-0 bg-white border-t border-slate-100"
                          onClick={() => { 
                            setInlineCreateType('department'); 
                            setInlineCreateName(deptSearch); 
                            setShowDeptDropdown(false); 
                            setDeptSearch(''); 
                          }}
                        >
                          <Plus className="w-4 h-4" /> Create New
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Role</label>
                    <select 
                      value={userFormData.role} 
                      onChange={e=>setUserFormData({...userFormData, role: e.target.value})} 
                      required
                      className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm bg-white"
                    >
                      <option value="">Select Role</option>
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="col-span-full flex justify-end gap-3 mt-4">
                    <button type="button" onClick={() => setShowUserForm(false)} className="px-4 py-2 border border-slate-200 rounded text-sm font-bold text-slate-600">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-slate-800 text-white rounded text-sm font-bold disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Save User'}</button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3">Profile Info</th>
                    <th className="px-4 py-3">Department & Role</th>
                    <th className="px-4 py-3">Supervisor</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    {hasPerm('User Setting', 'canEdit') && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {paginatedUsers.map((u) => (
                    <tr key={u.id} className={cn("hover:bg-slate-50 transition-colors", u.status === 'Inactive' && "opacity-60 bg-slate-50/50")}>
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-800">{u.name || '-'}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                        <div className="text-[10px] uppercase text-brand-orange tracking-widest mt-1">{u.designation}</div>
                        {u.phone && <div className="text-xs text-slate-500 font-mono mt-0.5">{u.phone}</div>}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-700">{u.department || 'No Department'}</div>
                        <div className="flex gap-1 mt-1">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-xs font-bold">{u.role}</span>
                          {u.branchId && (
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-xs font-bold">
                              {branches.find(b => b.id === u.branchId)?.name || 'Branch'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {u.supervisorUid ? (
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded w-max">
                            <User className="w-3 h-3 text-slate-400" />
                            {users.find(s => s.uid === u.supervisorUid)?.name || users.find(s => s.uid === u.supervisorUid)?.email || 'Unknown'}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">None</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={cn("px-2 py-1 rounded text-xs font-bold", u.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200')}>
                          {u.status || 'Active'}
                        </span>
                      </td>
                      {hasPerm('User Setting', 'canEdit') && (
                        <td className="px-4 py-4 text-right space-x-1">
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={cn("px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm", u.status === 'Active' ? 'bg-white border border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200' : 'bg-emerald-500 text-white hover:bg-emerald-600')}
                            title={u.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                          >
                            {u.status === 'Active' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => {
                              setUserFormData({ 
                                id: u.id, 
                                email: u.email, 
                                department: u.department || '', 
                                role: u.role || '',
                                name: u.name || '',
                                designation: u.designation || '',
                                phone: u.phone || '',
                                supervisorUid: u.supervisorUid || '',
                                branchId: u.branchId?.toString() || ''
                              });
                              setShowUserForm(true);
                            }}
                            className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-brand-orange hover:border-brand-orange/30 rounded transition-colors shadow-sm"
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Other tabs omitted for brevity, keeping existing implementation untouched */}
        {activeTab === 'departments' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Department</h3>
              {hasPerm('Departments', 'canCreate') && (
                <button
                  onClick={() => {
                    setDeptId(null);
                    setDeptName('');
                    setDeptCode('');
                    setDeptParentId(null);
                    setDeptManagerUid('');
                    setShowDeptForm(!showDeptForm);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors"
                >
                  <Plus className="-ml-1 mr-2 h-4 w-4" /> Add Department
                </button>
              )}
            </div>
            
            {showDeptForm && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <form onSubmit={handleSaveDepartment} className="flex gap-4 items-end flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Code</label>
                    <input value={deptCode} onChange={e=>setDeptCode(e.target.value)} required placeholder="e.g. IT" className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Name</label>
                    <input value={deptName} onChange={e=>setDeptName(e.target.value)} required placeholder="e.g. Information Technology" className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Parent Department</label>
                    <select value={deptParentId || ''} onChange={e=>setDeptParentId(e.target.value ? parseInt(e.target.value) : null)} className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm bg-white">
                      <option value="">None (Top Level)</option>
                      {departments.filter(d => (d.status || 'Active') === 'Active' && d.id !== deptId).map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Department Head (Manager)</label>
                    <select value={deptManagerUid} onChange={e=>setDeptManagerUid(e.target.value)} className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm bg-white">
                      <option value="">Select Manager</option>
                      {users.map(u => (
                        <option key={u.uid} value={u.uid}>{u.name || u.email}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowDeptForm(false)} className="px-4 py-2 border border-slate-200 rounded text-sm font-bold text-slate-600">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-slate-800 text-white rounded text-sm font-bold disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Save'}</button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Department Name</th>
                    <th className="px-4 py-3">Head</th>
                    <th className="px-4 py-3">Parent Department</th>
                    <th className="px-4 py-3 text-right">Status</th>
                    {hasPerm('Departments', 'canEdit') && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {paginatedDepts.map((d) => (
                    <tr key={d.id} className={cn("hover:bg-slate-50 transition-colors", d.status === 'Inactive' && "opacity-60 bg-slate-50/50")}>
                      <td className="px-4 py-4 font-mono font-bold text-slate-500">{d.code}</td>
                      <td className="px-4 py-4 font-medium">{d.name}</td>
                      <td className="px-4 py-4 text-slate-500">{users.find(u => u.uid === d.managerUid)?.name || users.find(u => u.uid === d.managerUid)?.email || '-'}</td>
                      <td className="px-4 py-4 text-slate-500">
                        {d.parentId ? departments.find(p => p.id === d.parentId)?.name || 'Unknown' : <span className="italic text-slate-400">None</span>}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleToggleDeptStatus(d.id, d.status || 'Active')}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                            (d.status || 'Active') === 'Active' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {d.status || 'Active'}
                        </button>
                      </td>
                      {hasPerm('Departments', 'canEdit') && (
                        <td className="px-4 py-4 text-right space-x-1">
                          <button
                            onClick={() => {
                              setDeptId(d.id);
                              setDeptName(d.name);
                              setDeptCode(d.code);
                              setDeptParentId(d.parentId || null);
                              setDeptManagerUid(d.managerUid || '');
                              setShowDeptForm(true);
                            }}
                            className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-brand-orange hover:border-brand-orange/30 rounded transition-colors shadow-sm"
                            title="Edit Department"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {paginatedDepts.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No departments configured</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'units' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Unit</h3>
              {hasPerm('Units', 'canCreate') && (
                <button
                  onClick={() => {
                    setUnitId(null);
                    setUnitName('');
                    setUnitCode('');
                    setUnitDeptId(null);
                    setUnitManagerUid('');
                    setShowUnitForm(!showUnitForm);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors"
                >
                  <Plus className="-ml-1 mr-2 h-4 w-4" /> Add Unit
                </button>
              )}
            </div>
            
            {showUnitForm && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <form onSubmit={handleSaveUnit} className="flex gap-4 items-end flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Code</label>
                    <input value={unitCode} onChange={e=>setUnitCode(e.target.value)} required placeholder="e.g. U-01" className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Name</label>
                    <input value={unitName} onChange={e=>setUnitName(e.target.value)} required placeholder="e.g. Unit 1" className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Parent Department</label>
                    <select value={unitDeptId || ''} onChange={e=>setUnitDeptId(e.target.value ? parseInt(e.target.value) : null)} required className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm bg-white">
                      <option value="">Select Department</option>
                      {departments.filter(d => (d.status || 'Active') === 'Active').map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Unit Head (Manager)</label>
                    <select value={unitManagerUid} onChange={e=>setUnitManagerUid(e.target.value)} className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm bg-white">
                      <option value="">Select Manager</option>
                      {users.map(u => (
                        <option key={u.uid} value={u.uid}>{u.name || u.email}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowUnitForm(false)} className="px-4 py-2 border border-slate-200 rounded text-sm font-bold text-slate-600">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-slate-800 text-white rounded text-sm font-bold disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Save'}</button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Unit Name</th>
                    <th className="px-4 py-3">Head</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3 text-right">Status</th>
                    {hasPerm('Units', 'canEdit') && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {paginatedUnits.map((u) => (
                    <tr key={u.id} className={cn("hover:bg-slate-50 transition-colors", u.status === 'Inactive' && "opacity-60 bg-slate-50/50")}>
                      <td className="px-4 py-4 font-mono font-bold text-slate-500">{u.code}</td>
                      <td className="px-4 py-4 font-medium">{u.name}</td>
                      <td className="px-4 py-4 text-slate-500">{users.find(usr => usr.uid === u.managerUid)?.name || users.find(usr => usr.uid === u.managerUid)?.email || '-'}</td>
                      <td className="px-4 py-4 text-slate-500">
                        {u.departmentId ? departments.find(d => d.id === u.departmentId)?.name || 'Unknown' : <span className="italic text-slate-400">None</span>}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleToggleUnitStatus(u.id, u.status || 'Active')}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                            (u.status || 'Active') === 'Active' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {u.status || 'Active'}
                        </button>
                      </td>
                      {hasPerm('Units', 'canEdit') && (
                        <td className="px-4 py-4 text-right space-x-1">
                          <button
                            onClick={() => {
                              setUnitId(u.id);
                              setUnitName(u.name);
                              setUnitCode(u.code);
                              setUnitDeptId(u.departmentId || null);
                              setUnitManagerUid(u.managerUid || '');
                              setShowUnitForm(true);
                            }}
                            className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-brand-orange hover:border-brand-orange/30 rounded transition-colors shadow-sm"
                            title="Edit Unit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {paginatedUnits.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No units configured</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'designations' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Designation</h3>
              {hasPerm('Designations', 'canCreate') && (
                <button
                  onClick={() => setShowDesigForm(!showDesigForm)}
                  className="inline-flex items-center px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors"
                >
                  <Plus className="-ml-1 mr-2 h-4 w-4" /> Add Designation
                </button>
              )}
            </div>
            
            {showDesigForm && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <form onSubmit={handleCreateDesignation} className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Designation Name</label>
                    <input value={desigName} onChange={e=>setDesigName(e.target.value)} required placeholder="e.g. Software Engineer" className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm" />
                  </div>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-slate-800 text-white rounded text-sm font-bold disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Save'}</button>
                </form>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3">Designation Name</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {paginatedDesigs.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-4 font-medium">{d.name}</td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleToggleDesigStatus(d.id, d.status || 'Active')}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                            (d.status || 'Active') === 'Active' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {d.status || 'Active'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginatedDesigs.length === 0 && (
                    <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-500">No designations configured</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'workflows' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Workflow Setting</h3>
              <div className="flex gap-2">
                <button
                  onClick={handlePrintManual}
                  className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded text-sm font-bold hover:bg-slate-200 transition-colors shadow-sm"
                >
                  <FileText className="-ml-1 mr-2 h-4 w-4 text-slate-500" /> User Manual (বাংলা)
                </button>
                {hasPerm('Workflow Engine', 'canCreate') && (
                  <a
                    href="/admin/workflow-designer"
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded text-sm font-bold hover:bg-indigo-700 shadow-sm transition-colors"
                  >
                    <Plus className="-ml-1 mr-2 h-4 w-4" /> Visual BPMN Designer
                  </a>
                )}
              </div>
            </div>
            
            {showWfForm && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <form onSubmit={handleCreateWorkflow} className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Doc Type</label>
                    <select value={wfDocType} onChange={e=>setWfDocType(e.target.value)} required className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm bg-white">
                      {activePlugins.includes('procurement') && (
                        <>
                          <option value="PR">Requisition (PR)</option>
                          <option value="CS">Comparative Statement (CS)</option>
                          <option value="PO">Purchase Order (PO)</option>
                          <option value="Invoice">Invoice</option>
                        </>
                      )}
                      {activePlugins.includes('inventory') && (
                        <option value="GRN">Goods Receipt (GRN)</option>
                      )}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Department</label>
                    <select value={wfDept} onChange={e=>setWfDept(e.target.value)} required className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm bg-white">
                      <option value="">Select...</option>
                      <option value="Global">Global (Applies to all)</option>
                      {departments.filter(d => (d.status || 'Active') === 'Active').map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Step Order</label>
                    <input type="number" value={wfStep} onChange={e=>setWfStep(parseInt(e.target.value))} required min="1" className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Required Role</label>
                    <select value={wfRole} onChange={e=>setWfRole(e.target.value)} required className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm bg-white">
                      <option value="">Select...</option>
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-slate-800 text-white rounded text-sm font-bold disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Save'}</button>
                </form>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3">Workflow Name</th>
                    <th className="px-4 py-3">Module</th>
                    <th className="px-4 py-3">Doc Type</th>
                    <th className="px-4 py-3 w-1/4">Trigger Event</th>
                    <th className="px-4 py-3">Flow Path</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    {hasPerm('Workflow Engine', 'canEdit') && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {paginatedWorkflows.map((w: any) => (
                    <tr key={w.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{w.name}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {['Item Requisition', 'Stock Out', 'Stock Transfer', 'GRN'].includes(w.documentType) ? 'Inventory' : 
                         ['Purchase Requisition', 'CS Evaluation', 'PO'].includes(w.documentType) ? 'Procurement' : 
                         ['User Registration', 'Profile Data Change Request'].includes(w.documentType) ? 'User Panel' : 
                         ['Asset Acquisition', 'Asset Transfer', 'Asset Disposal'].includes(w.documentType) ? 'Asset Management' : 'Global'}
                      </td>
                      <td className="px-4 py-3 text-brand-charcoal">{w.documentType}</td>
                      <td className="px-4 py-3 text-[11px] text-slate-500 leading-relaxed">
                        {w.documentType === 'Item Requisition' && "Triggered when an employee requests items from the inventory."}
                        {w.documentType === 'Purchase Requisition' && "Triggered when items need to be procured."}
                        {w.documentType === 'CS Evaluation' && "Triggered to evaluate quotes during vendor selection (supports amount-based logic)."}
                        {w.documentType === 'Stock Out' && "Triggered when items are issued/delivered from a warehouse."}
                        {w.documentType === 'Stock Transfer' && "Triggered when transferring items between warehouses."}
                        {w.documentType === 'User Registration' && "Triggered when a new user registers via SSO."}
                        {w.documentType === 'Profile Data Change Request' && "Triggered when a user requests to update their profile data."}
                        {!['Item Requisition', 'Purchase Requisition', 'CS Evaluation', 'Stock Out', 'Stock Transfer', 'User Registration', 'Profile Data Change Request'].includes(w.documentType) && "Standard approval workflow."}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-medium">
                        {(() => {
                          if (!w.xmlData) return 'No steps configured';
                          try {
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(w.xmlData, "application/xml");
                            let startEventId = null;
                            const elementsById: Record<string, Element> = {};
                            const outgoingMap: Record<string, Element[]> = {};
                            
                            const allNodes = doc.getElementsByTagName('*');
                            for (let i = 0; i < allNodes.length; i++) {
                              const el = allNodes[i];
                              const name = el.nodeName;
                              if (el.id) elementsById[el.id] = el;
                              if (name === 'bpmn:startEvent' || name === 'startEvent') startEventId = el.id;
                              if (name === 'bpmn:sequenceFlow' || name === 'sequenceFlow') {
                                const source = el.getAttribute('sourceRef');
                                if (source) {
                                  if (!outgoingMap[source]) outgoingMap[source] = [];
                                  outgoingMap[source].push(el);
                                }
                              }
                            }
                            
                            if (!startEventId) return 'No steps configured';
                            
                            const paths: string[][] = [];
                            const traverse = (nodeId: string, currentPath: string[]) => {
                              const node = elementsById[nodeId];
                              if (!node) return;
                              let nextPath = [...currentPath];
                              const name = node.nodeName;
                              if (name === 'bpmn:userTask' || name === 'userTask') {
                                let docText = '';
                                for (let j = 0; j < node.childNodes.length; j++) {
                                  const child = node.childNodes[j];
                                  if (child.nodeName === 'bpmn:documentation' || child.nodeName === 'documentation') {
                                    docText = child.textContent || '';
                                    break;
                                  }
                                }
                                if (docText) {
                                  try {
                                    const config = JSON.parse(docText);
                                    if (config.assigneeValue) nextPath.push(config.assigneeValue);
                                  } catch(e){}
                                }
                              }
                              
                              const outgoingFlows = outgoingMap[nodeId] || [];
                              if (outgoingFlows.length === 0) {
                                if (nextPath.length > 0) paths.push(nextPath);
                                return;
                              }
                              
                              outgoingFlows.forEach(flow => {
                                const target = flow.getAttribute('targetRef');
                                if (target) traverse(target, nextPath);
                              });
                            };
                            
                            traverse(startEventId, []);
                            if (paths.length === 0) return 'No steps configured';
                            
                            const formattedPaths = paths.map(p => p.join(' → '));
                            if (formattedPaths.length === 1) return formattedPaths[0];
                            
                            return (
                              <div className="flex flex-col gap-1">
                                {formattedPaths.map((p, i) => (
                                  <div key={i}>
                                    <span className="font-bold text-slate-400 mr-1 text-[10px] uppercase">Path {i+1}:</span> 
                                    {p}
                                  </div>
                                ))}
                              </div>
                            );
                          } catch (err) {
                            return 'Complex Flow';
                          }
                        })()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${w.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {w.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {hasPerm('Workflow Engine', 'canEdit') && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-3">
                            <a href={`/admin/workflow-designer?id=${w.id}`} className="text-slate-400 hover:text-brand-orange transition-colors" title="Edit Workflow">
                              <Edit className="w-4 h-4" />
                            </a>
                            <button onClick={() => handleDeleteWorkflow(w.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete Workflow">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {paginatedWorkflows.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No approval steps configured</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="space-y-6">
            {!editingRole ? (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-800">Roles</h3>
                  <button
                    onClick={() => {
                      setExpandedModules([]);
                      setExpandedMenus([]);
                      setTempPermissions({});
                      setEditingRole({ name: '', isNew: true });
                    }}
                    className="inline-flex items-center px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm transition-colors"
                  >
                    <Plus className="-ml-1 mr-2 h-4 w-4" /> Create Role
                  </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      <tr>
                        <th className="px-4 py-3">Role Name</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                      {roles.map((role) => (
                        <tr key={role} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-4 font-bold text-slate-700">{role}</td>
                          <td className="px-4 py-4 text-right">
                            <button
                              onClick={() => openEditRole(role)}
                              className="p-1.5 text-slate-400 hover:text-brand-orange hover:bg-brand-orange/10 rounded transition-colors"
                              title="Edit Permissions"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 max-w-3xl">
                <div className="mb-8 border-b border-slate-100 pb-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">
                    {editingRole.isNew ? 'Create New Role' : 'Edit Role Permissions'}
                  </h3>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Role Name</label>
                    <input 
                      value={editingRole.name} 
                      onChange={e => setEditingRole({ ...editingRole, name: e.target.value })} 
                      disabled={!editingRole.isNew}
                      placeholder="e.g. Warehouse Staff" 
                      className="block w-full max-w-sm rounded-md border-slate-200 p-2 border sm:text-sm disabled:bg-slate-50 disabled:text-slate-500" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-700 mb-4">Permissions Selection</h4>
                  
                  {hierarchy.filter(mod => {
                    if (mod.module === "Procurement") return activePlugins.includes("procurement");
                    if (mod.module === "Inventory Management") return activePlugins.includes("inventory");
                    if (mod.module === "User Panel") return activePlugins.includes("user-panel");
                    if (mod.module === "Asset Management") return activePlugins.includes("asset-management");
                    return true;
                  }).map(mod => (

                    <div key={mod.module} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <div className="bg-slate-50 px-4 py-3 flex items-center border-b border-slate-100">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={isModuleChecked(mod)} 
                            onChange={(e) => toggleModule(mod, e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange" 
                          />
                          <span className="font-bold text-slate-800">{mod.module}</span>
                        </label>
                      </div>

                      {isModuleChecked(mod) && (
                        <div className="divide-y divide-slate-50 bg-white">
                          {mod.menus.map(menu => (
                            <div key={menu.name} className="flex flex-col border-l-4 border-l-brand-orange/20">
                              <div className="px-8 py-3 flex items-center bg-white hover:bg-slate-50/50">
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                  <input 
                                    type="checkbox" 
                                    checked={isMenuChecked(menu)} 
                                    onChange={(e) => toggleMenu(menu, e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" 
                                  />
                                  <span className="font-medium text-slate-700">{menu.name}</span>
                                </label>
                              </div>

                              {isMenuChecked(menu) && (
                                <div className="px-16 py-3 bg-slate-50/50 flex flex-wrap gap-6 border-t border-slate-50">
                                  {menu.actions.map(action => {
                                    const perms = tempPermissions[menu.name] || {};
                                    return (
                                      <label key={action} className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-900">
                                        <input 
                                          type="checkbox" 
                                          checked={!!perms[action]} 
                                          onChange={(e) => handleActionToggle(menu.name, action, e.target.checked)}
                                          className="rounded border-slate-300 text-blue-500 focus:ring-blue-500" 
                                        />
                                        {action.replace('can', '')}
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <button 
                    onClick={() => setEditingRole(null)} 
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded text-sm font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveRoleForm}
                    disabled={!editingRole.name.trim()}
                    className="px-6 py-2 bg-brand-orange text-white rounded text-sm font-bold hover:bg-[#e06214] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Role
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'companies' && (
          <CompanyManager searchQuery={searchQuery} />
        )}

        {activeTab === 'branches' && (
          <BranchManager searchQuery={searchQuery} />
        )}

        {activeTab === 'warehouse-managers' && (
          <WarehouseManagerTab searchQuery={searchQuery} />
        )}

        {activeTab === 'plugins' && (
          <PluginManager companyId={dbUser?.company_id || ''} searchQuery={searchQuery} />
        )}

        {activeTab === 'notifications' && (
          <NotificationSettings />
        )}
        
      </div>

      {/* Inline Create Modal */}
      {inlineCreateType && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              Create New {inlineCreateType === 'department' ? 'Department' : 'Designation'}
            </h3>
            <form onSubmit={handleInlineCreate} className="space-y-4">
              {inlineCreateType === 'department' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Code</label>
                  <input 
                    value={inlineCreateCode} 
                    onChange={e=>setInlineCreateCode(e.target.value)} 
                    required 
                    placeholder="e.g. IT" 
                    className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm" 
                  />
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Name</label>
                <input 
                  value={inlineCreateName} 
                  onChange={e=>setInlineCreateName(e.target.value)} 
                  required 
                  placeholder={inlineCreateType === 'department' ? 'e.g. Information Technology' : 'e.g. Manager'} 
                  className="block w-full rounded-md border-slate-200 p-2 border sm:text-sm" 
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => { setInlineCreateType(null); setInlineCreateName(''); setInlineCreateCode(''); }} 
                  className="px-4 py-2 border border-slate-200 rounded text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-brand-orange text-white rounded text-sm font-bold shadow-sm hover:bg-[#e06214] disabled:opacity-50">
                  <Edit className="w-4 h-4 mr-2 inline-block" /> {isSubmitting ? 'Saving...' : 'Save Role Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </PageLayout>
  );
}
