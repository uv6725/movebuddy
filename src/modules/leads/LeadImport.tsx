import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Download } from 'lucide-react';
import { importLeadsFromCSV, exportLeadsToCSV } from '../../lib/supabase';
import toast from 'react-hot-toast';

export function LeadImport() {
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
      await importFile(file);
    } else {
      toast.error('Please upload a CSV file');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await importFile(file);
    }
  };

  const importFile = async (file: File) => {
    setIsImporting(true);
    try {
      await importLeadsFromCSV(file);
      toast.success('Leads imported successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to import leads');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportLeadsToCSV();
      toast.success('Leads exported successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export leads');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Import/Export Leads</h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
        >
          <Download size={20} />
          Export CSV
        </button>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
        `}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-gray-100 rounded-full">
            <FileSpreadsheet size={32} className="text-gray-600" />
          </div>
          <div>
            <p className="text-lg font-medium">Drop your CSV file here</p>
            <p className="text-sm text-gray-500">or</p>
            <label className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 cursor-pointer">
              <Upload size={20} />
              Choose File
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isImporting}
              />
            </label>
          </div>
          <p className="text-sm text-gray-500">
            Supported format: CSV
          </p>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium mb-2">CSV Format Requirements</h3>
        <p className="text-sm text-gray-600">
          Your CSV file should include these columns (headers must match exactly):
        </p>
        <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
          <li>business_name (required)</li>
          <li>contact_name</li>
          <li>email</li>
          <li>phone</li>
          <li>website</li>
          <li>address</li>
          <li>zip_code</li>
          <li>business_type</li>
        </ul>
      </div>
    </div>
  );
}