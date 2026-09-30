import React from 'react';
import { Briefcase } from 'lucide-react';
import PageLayout from '@/src/shared/components/PageLayout';

export default function AssetCapitalization() {
  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Asset Capitalization</h2>
          <p className="text-slate-500 mb-8 max-w-lg mx-auto">
            Review and approve fixed assets for capitalization and depreciation schedule generation.
          </p>
          <div className="p-8 border border-slate-200 rounded-lg bg-slate-50">
             <p className="text-slate-600">Pending capitalization requests will appear here.</p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
