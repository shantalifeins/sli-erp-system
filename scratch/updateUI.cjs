const fs = require('fs');
let content = fs.readFileSync('src/modules/admin/pages/NotificationSettings.tsx', 'utf8');

// Add new lucide icons
content = content.replace(
  "import { Save, Bell, Info, AlertCircle, Mail, Server } from 'lucide-react';",
  "import { Save, Bell, Info, AlertCircle, Mail, Server, Search, ChevronDown, ChevronRight } from 'lucide-react';"
);

// Add search and expanded states
content = content.replace(
  "const [error, setError] = useState<string | null>(null);",
  "const [error, setError] = useState<string | null>(null);\n  const [searchQuery, setSearchQuery] = useState('');\n  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});"
);

// Update fetchData to expand all initially
content = content.replace(
  "setSettings(notifData);",
  `setSettings(notifData);\n      const initialExpanded: Record<string, boolean> = {};\n      notifData.forEach((s: any) => initialExpanded[s.module] = true);\n      setExpandedModules(initialExpanded);`
);

// The new rendering logic before the table
const tableStartIdx = content.indexOf('<div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">');

const searchBarHTML = `
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

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">`;

content = content.replace(
  '<div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">',
  searchBarHTML
);

// We need to group the settings and map over modules, then map over settings.
// I will replace the <tbody> contents.
const tbodyStart = content.indexOf('<tbody className="bg-white divide-y divide-gray-200">');
const tbodyEnd = content.indexOf('</tbody>');

const groupLogic = `
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

              return Object.entries(grouped).map(([moduleName, moduleSettings]) => (
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
                            <div className={\`block w-10 h-6 rounded-full transition-colors \${(activeTab === 'web' ? setting.isActive : setting.isMailActive) ? 'bg-green-500' : 'bg-gray-300'}\`}></div>
                            <div className={\`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform \${(activeTab === 'web' ? setting.isActive : setting.isMailActive) ? 'transform translate-x-4' : ''}\`}></div>
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
              ));
            })()}`;

const finalContent = content.substring(0, tbodyStart) + groupLogic + content.substring(tbodyEnd);

fs.writeFileSync('src/modules/admin/pages/NotificationSettings.tsx', finalContent);
console.log("UI Updated.");
