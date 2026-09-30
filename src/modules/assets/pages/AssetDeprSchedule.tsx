import React from 'react';
import { Calendar } from 'lucide-react';
import PageLayout from '@/src/shared/components/PageLayout';

export default function AssetDeprSchedule() {
  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Depreciation Schedule</h2>
          <p className="text-slate-500 mb-8 max-w-lg mx-auto">
            View generated depreciation schedules for all active capitalized assets.
          </p>
          <div className="p-8 border border-slate-200 rounded-lg bg-slate-50">
             <p className="text-slate-600">Schedules are generated during asset capitalization.</p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
