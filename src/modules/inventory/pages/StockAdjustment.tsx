import React from 'react';
import { Settings, FileText } from 'lucide-react';
import PageLayout from '@/src/shared/components/PageLayout';

export default function StockAdjustment() {
  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Stock Adjustment</h2>
          <p className="text-slate-500 mb-8 max-w-lg mx-auto">
            Adjust stock quantities and record reasons for adjustments (e.g., damage, discrepancy).
          </p>
          <div className="p-8 border border-slate-200 rounded-lg bg-slate-50">
             <p className="text-slate-600">Stock Adjustment UI is under construction. Please use Stock Reconciliation for now.</p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
