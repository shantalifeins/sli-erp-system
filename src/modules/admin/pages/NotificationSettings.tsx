import React, { useState, useEffect } from 'react';
import { Save, Bell, Info, AlertCircle, Mail, Server, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/src/shared/components/AuthProvider';
import { fetchWithAuth } from '@/src/shared/lib/api';

interface NotificationSetting {
  actionEvent: string;
  module: string;
  recipient?: string;
  titleTemplate: string;
  bodyTemplate: string;
  isActive: boolean;
  isMailActive: boolean;
  mailSubjectTemplate: string;
  mailBodyTemplate: string;
}

export default function NotificationSettings() {
  const [activeTab, setActiveTab] = useState<'web' | 'mail'>('web');
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [smtp, setSmtp] = useState<any>({ host: '', port: 587, secure: false, username: '', password: '', fromEmail: '', fromName: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [isSmtpExpanded, setIsSmtpExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const { getToken } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await getToken();
      const [notifData, smtpData] = await Promise.all([
        fetchWithAuth('/api/notification-settings', token),
        fetchWithAuth('/api/smtp-settings', token).catch(() => null)
      ]);
      setSettings(notifData);
      const initialExpanded: Record<string, boolean> = {};
      notifData.forEach((s: any) => initialExpanded[s.module] = false);
      setExpandedModules(initialExpanded);
      if (smtpData) setSmtp(smtpData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (actionEvent: string, field: keyof NotificationSetting, value: string | boolean) => {
    setSettings(prev => prev.map(s => s.actionEvent === actionEvent ? { ...s, [field]: value } : s));
  };

  const saveSetting = async (setting: NotificationSetting) => {
    setSaving(setting.actionEvent);
    try {
      const token = await getToken();
      await fetchWithAuth(`/api/notification-settings/${setting.actionEvent}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          titleTemplate: setting.titleTemplate,
          bodyTemplate: setting.bodyTemplate,
          isActive: setting.isActive,
          isMailActive: setting.isMailActive,
          mailSubjectTemplate: setting.mailSubjectTemplate,
          mailBodyTemplate: setting.mailBodyTemplate
        })
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(null);
    }
  };

  const saveSmtp = async () => {
    setSmtpSaving(true);
    try {
      const token = await getToken();
      await fetchWithAuth('/api/smtp-settings', token, {
        method: 'PUT',
        body: JSON.stringify(smtp)
      });
      alert('SMTP settings saved successfully!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSmtpSaving(false);
    }
  };

  const testSmtp = async () => {
    setSmtpTesting(true);
    try {
      const token = await getToken();
      await fetchWithAuth('/api/smtp-settings/test', token, {
        method: 'POST',
        body: JSON.stringify(smtp)
      });
      alert('Test email sent successfully! Please check your inbox.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSmtpTesting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Notification Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure automated web and email alerts</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-max">
        <button
          onClick={() => setActiveTab('web')}
          className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${activeTab === 'web' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Bell className="w-4 h-4" /> Web Notifications
        </button>
        <button
          onClick={() => setActiveTab('mail')}
          className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${activeTab === 'mail' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Mail className="w-4 h-4" /> Email Notifications
        </button>
      </div>

      {activeTab === 'mail' && (
        
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-4">
          <div 
            className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => setIsSmtpExpanded(!isSmtpExpanded)}
          >
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-800">SMTP Server Configuration</h2>
            </div>
            {isSmtpExpanded ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
          </div>
          
          {isSmtpExpanded && (
            <>
              <div className="p-6 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Host</label>
                  <input type="text" className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={smtp.host} onChange={e => setSmtp({...smtp, host: e.target.value})} placeholder="smtp.gmail.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Port</label>
                  <input type="number" className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={smtp.port} onChange={e => setSmtp({...smtp, port: Number(e.target.value)})} placeholder="587" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Username</label>
                  <input type="text" className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={smtp.username} onChange={e => setSmtp({...smtp, username: e.target.value})} placeholder="email@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={smtp.password} onChange={e => setSmtp({...smtp, password: e.target.value})} placeholder="••••••••" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">From Name</label>
                  <input type="text" className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={smtp.fromName} onChange={e => setSmtp({...smtp, fromName: e.target.value})} placeholder="ERP System" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">From Email</label>
                  <input type="email" className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={smtp.fromEmail} onChange={e => setSmtp({...smtp, fromEmail: e.target.value})} placeholder="no-reply@example.com" />
                </div>
                <div className="col-span-2 flex items-center mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className="relative">
                      <input type="checkbox" className="sr-only" checked={smtp.secure} onChange={(e) => setSmtp({...smtp, secure: e.target.checked})} />
                      <div className={`block w-10 h-6 rounded-full transition-colors ${smtp.secure ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${smtp.secure ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Use Secure Connection (SSL/TLS)</span>
                  </label>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                <button onClick={testSmtp} disabled={smtpTesting} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                  {smtpTesting ? 'Testing...' : 'Test Connection'}
                </button>
                <button onClick={saveSmtp} disabled={smtpSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {smtpSaving ? 'Saving...' : 'Save SMTP Settings'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

            {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search notifications..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
        />
      </div>

<div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">Event</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/2">{activeTab === 'web' ? 'Notification Template' : 'Email Template'}</th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Status</th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {(() => {
              const filteredSettings = settings.filter(s => 
                s.actionEvent.toLowerCase().includes(searchQuery.toLowerCase()) || 
                (activeTab === 'web' ? s.titleTemplate : (s.mailSubjectTemplate || '')).toLowerCase().includes(searchQuery.toLowerCase())
              );
              
              const grouped = filteredSettings.reduce((acc, setting) => {
                if (!acc[setting.module]) acc[setting.module] = [];
                acc[setting.module].push(setting);
                return acc;
              }, {} as Record<string, NotificationSetting[]>);

              const toggleModule = (mod: string) => {
                setExpandedModules(prev => ({...prev, [mod]: !prev[mod]}));
              };

              return Object.entries(grouped).map(([moduleName, rawSettings]) => {
                const moduleSettings = rawSettings as NotificationSetting[];
                return (
                <React.Fragment key={moduleName}>
                  <tr 
                    className="bg-gray-50/80 cursor-pointer hover:bg-gray-100/80 transition-colors"
                    onClick={() => toggleModule(moduleName)}
                  >
                    <td colSpan={4} className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        {expandedModules[moduleName] ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                        <span className="font-semibold text-gray-800 text-sm">{moduleName}</span>
                        <span className="bg-white px-2 py-0.5 rounded-full text-xs font-medium text-gray-500 border border-gray-200">
                          {moduleSettings.length} items
                        </span>
                      </div>
                    </td>
                  </tr>
                  
                  {expandedModules[moduleName] && moduleSettings.map((setting) => (
                    <tr key={setting.actionEvent} className="hover:bg-blue-50/30 transition-colors border-t border-gray-100">
                      <td className="px-6 py-5 align-top">
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-gray-900">{setting.actionEvent}</span>
                            {setting.recipient && (
                              <span className="px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-purple-100 text-purple-800">
                                {setting.recipient}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      {activeTab === 'web' ? (
                        <td className="px-6 py-5">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                              <input
                                type="text"
                                value={setting.titleTemplate}
                                onChange={(e) => handleUpdate(setting.actionEvent, 'titleTemplate', e.target.value)}
                                className="block w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Message Body (Supports {'{{'}variables{'}}'})</label>
                              <textarea
                                rows={2}
                                value={setting.bodyTemplate}
                                onChange={(e) => handleUpdate(setting.actionEvent, 'bodyTemplate', e.target.value)}
                                className="block w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                              />
                            </div>
                          </div>
                        </td>
                      ) : (
                        <td className="px-6 py-5">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
                              <input
                                type="text"
                                value={setting.mailSubjectTemplate}
                                onChange={(e) => handleUpdate(setting.actionEvent, 'mailSubjectTemplate', e.target.value)}
                                className="block w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Email Body (Supports {'{{'}variables{'}}'})</label>
                              <textarea
                                rows={2}
                                value={setting.mailBodyTemplate}
                                onChange={(e) => handleUpdate(setting.actionEvent, 'mailBodyTemplate', e.target.value)}
                                className="block w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                              />
                            </div>
                          </div>
                        </td>
                      )}

                      <td className="px-6 py-5 align-top text-center">
                        <label className="flex items-center justify-center cursor-pointer mt-1">
                          <div className="relative">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={activeTab === 'web' ? setting.isActive : setting.isMailActive}
                              onChange={(e) => handleUpdate(setting.actionEvent, activeTab === 'web' ? 'isActive' : 'isMailActive', e.target.checked)}
                            />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${(activeTab === 'web' ? setting.isActive : setting.isMailActive) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${(activeTab === 'web' ? setting.isActive : setting.isMailActive) ? 'transform translate-x-4' : ''}`}></div>
                          </div>
                        </label>
                      </td>
                      
                      <td className="px-6 py-5 align-top text-right">
                        <button
                          onClick={() => saveSetting(setting)}
                          disabled={saving === setting.actionEvent}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors mt-1"
                        >
                          <Save className="w-4 h-4" />
                          {saving === setting.actionEvent ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
                );
              });
            })()}</tbody>
        </table>
      </div>
    </div>
  );
}
