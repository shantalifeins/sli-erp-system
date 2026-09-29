import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { inventoryItemSchema } from '../lib/itemSchema';

export function ItemForm({ onSubmit, onCancel, initialData = {}, categories, assetCategories }: any) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      itemCode: initialData.itemCode || '',
      name: initialData.name || '',
      category: initialData.category || '',
      uom: initialData.uom || 'Pcs',
      description: initialData.description || '',
      barcode: initialData.barcode || '',
      status: initialData.status || 'Active',
      assetNature: initialData.assetNature || 'Physical',
      usagePurpose: initialData.usagePurpose || 'Internal Use',
      accountingTreatment: initialData.accountingTreatment || 'Inventory',
      isAdminItem: initialData.isAdminItem || false,
      isItItem: initialData.isItItem || false,
      trackingRequired: initialData.trackingRequired || false,
      trackingMethod: initialData.trackingMethod || 'None',
      receiptMode: initialData.receiptMode || 'Physical Receipt',
      requiresQc: initialData.requiresQc || false,
      assetCategoryId: initialData.assetCategoryId || null,
      usefulLifeMonths: initialData.usefulLifeMonths || null,
      depreciationMethod: initialData.depreciationMethod || null,
      salvagePercent: initialData.salvagePercent || null,
      capitalizationThreshold: initialData.capitalizationThreshold || null,
      digitalAssetType: initialData.digitalAssetType || null,
      defaultLicenseType: initialData.defaultLicenseType || null,
      defaultBillingCycle: initialData.defaultBillingCycle || null,
      defaultAmortizationMonths: initialData.defaultAmortizationMonths || null,
      reorderLevel: initialData.reorderLevel || 0,
      reorderPoint: initialData.reorderPoint || 0,
      reorderQuantity: initialData.reorderQuantity || 0,
      leadTimeDays: initialData.leadTimeDays || 7,
      safetyStockDays: initialData.safetyStockDays || 3,
      abcClassification: initialData.abcClassification || null,
      location: initialData.location || null,
      basePrice: initialData.basePrice || null
    }
  });

  const watchNature = watch('assetNature');
  const watchTreatment = watch('accountingTreatment');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Item Code <span className="text-red-500">*</span></label>
          <input {...register('itemCode')} className="mt-1 w-full border rounded p-2" />
          {errors.itemCode && <p className="text-red-500 text-xs">{errors.itemCode.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">Name <span className="text-red-500">*</span></label>
          <input {...register('name')} className="mt-1 w-full border rounded p-2" />
          {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">Category <span className="text-red-500">*</span></label>
          <select {...register('category')} className="mt-1 w-full border rounded p-2">
            <option value="">Select Category...</option>
            {categories.map((c: any) => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
          </select>
          {errors.category && <p className="text-red-500 text-xs">{errors.category.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">UOM <span className="text-red-500">*</span></label>
          <input {...register('uom')} className="mt-1 w-full border rounded p-2" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 border-t pt-4">
        <div>
          <label className="block text-sm font-medium">Asset Nature</label>
          <select {...register('assetNature')} className="mt-1 w-full border rounded p-2">
            <option value="Physical">Physical</option>
            <option value="Digital">Digital</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Accounting Treatment</label>
          <select {...register('accountingTreatment')} className="mt-1 w-full border rounded p-2">
            <option value="Inventory">Inventory</option>
            <option value="Capitalize">Capitalize</option>
            <option value="Expense">Expense</option>
            <option value="Prepaid">Prepaid</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Usage Purpose</label>
          <select {...register('usagePurpose')} className="mt-1 w-full border rounded p-2">
            <option value="Internal Use">Internal Use</option>
            <option value="Resale">Resale</option>
            <option value="Consumption">Consumption</option>
          </select>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('requiresQc')} />
          <span className="text-sm font-medium">Requires QC</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('trackingRequired')} />
          <span className="text-sm font-medium">Tracking Required</span>
        </label>
      </div>

      {watchTreatment === 'Capitalize' && (
        <div className="bg-gray-50 p-4 rounded border">
          <h4 className="font-semibold mb-2">Accounting Defaults</h4>
          <div className="grid grid-cols-2 gap-4">
            {watchNature === 'Physical' ? (
              <div>
                <label className="block text-sm font-medium">Asset Category</label>
                <select {...register('assetCategoryId')} className="mt-1 w-full border rounded p-2">
                  <option value="">Select...</option>
                  {assetCategories.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                {errors.assetCategoryId && <p className="text-red-500 text-xs">{errors.assetCategoryId.message}</p>}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium">Digital Asset Type</label>
                <input {...register('digitalAssetType')} className="mt-1 w-full border rounded p-2" />
                {errors.digitalAssetType && <p className="text-red-500 text-xs">{errors.digitalAssetType.message}</p>}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium">Useful Life (Months)</label>
              <input type="number" {...register('usefulLifeMonths', { valueAsNumber: true })} className="mt-1 w-full border rounded p-2" />
            </div>
          </div>
        </div>
      )}

      {watchNature === 'Digital' && (
        <div className="bg-gray-50 p-4 rounded border">
          <h4 className="font-semibold mb-2">Digital Defaults</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">License Type</label>
              <input {...register('defaultLicenseType')} className="mt-1 w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Amortization Months</label>
              <input type="number" {...register('defaultAmortizationMonths', { valueAsNumber: true })} className="mt-1 w-full border rounded p-2" />
              {errors.defaultAmortizationMonths && <p className="text-red-500 text-xs">{errors.defaultAmortizationMonths.message}</p>}
            </div>
          </div>
        </div>
      )}

      {errors.receiptMode && <p className="text-red-500 text-sm">{errors.receiptMode.message}</p>}
      {errors.accountingTreatment && <p className="text-red-500 text-sm">{errors.accountingTreatment.message}</p>}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          {isSubmitting ? 'Saving...' : 'Save Item'}
        </button>
      </div>
    </form>
  );
}
