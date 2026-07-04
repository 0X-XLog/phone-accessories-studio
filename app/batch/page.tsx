'use client';

import Layout from '@/components/Layout';
import Header from '@/components/Header';
import { Upload, FileSpreadsheet, Clock } from 'lucide-react';

export default function BatchPage() {
  return (
    <Layout>
      <Header title="Batch Processing" />
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FileSpreadsheet className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Batch Processing - Coming Soon</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-8">
            Upload a CSV file with your product data to process multiple products at once.
            Supports batch image editing, title generation, and description generation in a single operation.
          </p>

          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto mb-8">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Upload className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-xs text-gray-600">CSV Upload</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-xs text-gray-600">Queue Processing</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-xs text-gray-600">Bulk Export</span>
            </div>
          </div>

          <button
            disabled
            className="bg-blue-100 text-blue-400 px-6 py-2.5 rounded-lg text-sm font-medium cursor-not-allowed"
          >
            Coming Soon
          </button>
        </div>
      </div>
    </Layout>
  );
}
