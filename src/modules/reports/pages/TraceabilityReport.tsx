import React from 'react';
import { Network, Activity } from 'lucide-react';
import PageLayout from '@/src/shared/components/PageLayout';

export default function TraceabilityReport() {
  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Network className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Traceability Report</h2>
          <p className="text-slate-500 mb-8 max-w-lg mx-auto">
            View end-to-end lifecycle of items from Requisition (PR) to Goods Receipt (GRN) and Asset Activation.
          </p>
          <div className="p-8 border border-slate-200 rounded-lg bg-slate-50">
             <p className="text-slate-600">Traceability Report UI is currently aggregating data. Please check back later.</p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
