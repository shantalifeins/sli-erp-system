import fs from 'fs';

const filePath = 'src/modules/assets/pages/Assets.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const replacement = `
            {/* 1. General Information */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-500" />
                General Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Asset Title / Description
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Dell Latitude 7440 Laptop"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Asset Category
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => {
                      const cat = categories.find(c => c.id === e.target.value);
                      setFormData({
                        ...formData,
                        categoryId: e.target.value,
                        depreciationMethod: cat?.defaultDepreciationMethod || formData.depreciationMethod,
                        decliningRate: cat?.defaultDecliningRate || formData.decliningRate,
                        usefulLifeMonths: cat?.defaultUsefulLifeMonths || formData.usefulLifeMonths
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="UnderMaintenance">Under Maintenance</option>
                    <option value="Draft">Draft</option>
                    <option value="Disposed">Disposed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Asset Attributes */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-500" />
                Asset Attributes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Brand
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.brandId}
                      onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    >
                      <option value="">Select Brand...</option>
                      {attributes.filter(a => a.attributeType === 'Brand').map(a => (
                        <option key={a.id} value={a.id}>{a.value}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => { setNewAttributeType('Brand'); setShowAttributeModal(true); }}
                      className="px-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 flex items-center justify-center shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Model
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.modelId}
                      onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    >
                      <option value="">Select Model...</option>
                      {attributes.filter(a => a.attributeType === 'Model').map(a => (
                        <option key={a.id} value={a.id}>{a.value}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => { setNewAttributeType('Model'); setShowAttributeModal(true); }}
                      className="px-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 flex items-center justify-center shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Specification
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.specificationId}
                      onChange={(e) => setFormData({ ...formData, specificationId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    >
                      <option value="">Select Spec...</option>
                      {attributes.filter(a => a.attributeType === 'Specification').map(a => (
                        <option key={a.id} value={a.id}>{a.value}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => { setNewAttributeType('Specification'); setShowAttributeModal(true); }}
                      className="px-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 flex items-center justify-center shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Size Value
                    </label>
                    <input
                      type="text"
                      value={formData.sizeValue}
                      onChange={(e) => setFormData({ ...formData, sizeValue: e.target.value })}
                      placeholder="e.g. 1.5"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      UOM
                    </label>
                    <select
                      value={formData.uomId}
                      onChange={(e) => setFormData({ ...formData, uomId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    >
                      <option value="">Unit...</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Location & Ownership */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-500" />
                Location & Ownership
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Branch
                  </label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {branches.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Asset Location
                  </label>
                  <select
                    value={formData.locationId}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  >
                    <option value="">Select Location...</option>
                    {locations.filter(l => !formData.branchId || l.branchId === Number(formData.branchId)).map((l: any) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Custodian
                  </label>
                  <select
                    value={formData.custodianUid}
                    onChange={(e) => setFormData({ ...formData, custodianUid: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {usersList.map((u: any) => (
                      <option key={u.uid || u.id} value={u.uid || String(u.id)}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 4. Acquisition & Value */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Acquisition & Value
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Acquisition Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.acquisitionDate}
                    onChange={(e) => setFormData({ ...formData, acquisitionDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Acquisition Cost ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={formData.acquisitionCost}
                    onChange={(e) => setFormData({ ...formData, acquisitionCost: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Salvage Value ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.salvageValue}
                    onChange={(e) => setFormData({ ...formData, salvageValue: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Depreciation Method
                  </label>
                  <select
                    required
                    value={formData.depreciationMethod}
                    onChange={(e) => setFormData({ ...formData, depreciationMethod: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  >
                    <option value="Straight Line">Straight Line</option>
                    <option value="Declining Balance">Declining Balance</option>
                    <option value="None">None (Non-Depreciating)</option>
                  </select>
                </div>
                {formData.depreciationMethod === 'Declining Balance' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Declining Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.decliningRate}
                      onChange={(e) => setFormData({ ...formData, decliningRate: e.target.value })}
                      placeholder="0 = Auto"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Useful Life (Months)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.usefulLifeMonths}
                    onChange={(e) => setFormData({ ...formData, usefulLifeMonths: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* 5. Additional Details */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-indigo-500" />
                Additional Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Serial / Chassis Number
                  </label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    placeholder="e.g. SN-88992211"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Warranty Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.warrantyExpiryDate}
                    onChange={(e) => setFormData({ ...formData, warrantyExpiryDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Next Maintenance Due
                  </label>
                  <input
                    type="date"
                    value={formData.nextMaintenanceDue}
                    onChange={(e) => setFormData({ ...formData, nextMaintenanceDue: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>`;

const modalContent = `
      {/* Attribute Add Modal */}
      {showAttributeModal && newAttributeType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Add New {newAttributeType}</h3>
              <button onClick={() => setShowAttributeModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAttribute} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {newAttributeType} Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newAttributeValue}
                  onChange={(e) => setNewAttributeValue(e.target.value)}
                  placeholder={\`e.g. \${newAttributeType === 'Brand' ? 'Dell' : newAttributeType === 'Model' ? 'Latitude 7440' : 'Core i7, 16GB RAM'}\`}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAttributeModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingAttribute || !newAttributeValue.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isAddingAttribute ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Add {newAttributeType}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
`;

// Extract old grid block
const startIndex = content.indexOf('<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">');
const endIndex = content.indexOf('<div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + replacement + '\n            ' + content.substring(endIndex);
  
  // Also add modal content at the very end of the file, just before the last </div>
  const lastDivIndex = content.lastIndexOf('</div>');
  content = content.substring(0, lastDivIndex) + modalContent + '\n    </div>\n  );\n}\n';

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Successfully updated form layout');
} else {
  console.error('Could not find boundaries for form replacement');
}
