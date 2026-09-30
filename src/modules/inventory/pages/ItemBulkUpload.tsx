import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/src/shared/components/PageLayout';
import { BulkUploadModal } from '../components/BulkUploadModal';

export default function ItemBulkUpload() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(true);

  return (
    <PageLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inventory')}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
            title="Back to Inventory Items"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-slate-800">Inventory Item Bulk Upload</h2>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <p className="text-slate-600 mb-4">
            Use the bulk upload modal to import inventory items from an Excel file.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-5 py-2.5 bg-brand-orange text-white rounded-lg font-bold hover:bg-[#e06214] shadow-sm transition-colors"
          >
            Open Bulk Upload
          </button>
        </div>
      </div>

      <BulkUploadModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          navigate('/inventory');
        }}
        onSuccess={() => navigate('/inventory')}
      />
    </PageLayout>
  );
}
