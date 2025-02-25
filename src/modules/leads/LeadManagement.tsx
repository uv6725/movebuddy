import React, { useState, useEffect, useCallback } from 'react';
import { Building2, MapPin, Plus, Filter, RefreshCw, Check, X, Upload, Download, Edit2, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Lead } from '../../lib/supabase';
import { LeadImport } from './LeadImport';
import toast from 'react-hot-toast';
import type { ViewMode } from '../../types';

interface LeadManagementProps {
  viewMode: ViewMode;
}

const BUSINESS_TYPES = [
  'Office',
  'Hospital',
  'Clinic',
  'School',
  'Public Service',
  'Realtor',
  'Restaurant',
  'Retail',
  'Warehouse',
  'Other'
];

const STATUS_COLORS = {
  'New': 'bg-blue-100 text-blue-800',
  'Contacted': 'bg-yellow-100 text-yellow-800',
  'Responded': 'bg-purple-100 text-purple-800',
  'Not Interested': 'bg-red-100 text-red-800',
  'Converted': 'bg-green-100 text-green-800'
};

const initialLeadState: Partial<Lead> = {
  business_name: '',
  contact_name: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  zip_code: '',
  business_type: '',
  status: 'New',
  notes: ''
};

export function LeadManagement({ viewMode }: LeadManagementProps) {
  const [savedLeads, setSavedLeads] = useState<Lead[]>([]);
  const [activeTab, setActiveTab] = useState<'leads' | 'import' | 'create'>('leads');
  const [filters, setFilters] = useState({
    status: '',
    businessType: '',
    contacted: '',
    dateRange: 'all'
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [editingLead, setEditingLead] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialLeadState);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSavedLeads();
    }
  }, [isAuthenticated]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const fetchSavedLeads = async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch leads');
      return;
    }

    setSavedLeads(data || []);
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.business_name) {
      toast.error('Business name is required');
      return;
    }

    const { error } = await supabase
      .from('leads')
      .insert([{
        ...formData,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      toast.error('Failed to create lead');
      return;
    }

    toast.success('Lead created successfully');
    setFormData(initialLeadState);
    setActiveTab('leads');
    fetchSavedLeads();
  };

  const handleUpdateLead = async (leadId: string) => {
    const { error } = await supabase
      .from('leads')
      .update(formData)
      .eq('id', leadId);

    if (error) {
      toast.error('Failed to update lead');
      return;
    }

    toast.success('Lead updated successfully');
    setEditingLead(null);
    setFormData(initialLeadState);
    fetchSavedLeads();
  };

  const startEditing = (lead: Lead) => {
    setEditingLead(lead.id);
    setFormData(lead);
  };

  const updateLeadStatus = async (leadId: string, status: Lead['status']) => {
    const { error } = await supabase
      .from('leads')
      .update({ 
        status,
        last_contact_date: status === 'Contacted' ? new Date().toISOString() : undefined
      })
      .eq('id', leadId);

    if (error) {
      toast.error('Failed to update lead status');
      return;
    }

    toast.success('Lead status updated');
    fetchSavedLeads();
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      toast.error('Failed to login. Please try again.');
    }
  };

  const CreateLeadForm = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-lg font-medium">Create New Lead</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Name *
          </label>
          <input
            type="text"
            name="business_name"
            value={formData.business_name}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter business name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact Name
          </label>
          <input
            type="text"
            name="contact_name"
            value={formData.contact_name || ''}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter contact name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email || ''}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter email"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone || ''}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter phone number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Website
          </label>
          <input
            type="url"
            name="website"
            value={formData.website || ''}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter website URL"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Type
          </label>
          <select
            name="business_type"
            value={formData.business_type || ''}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select type</option>
            {BUSINESS_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <input
            type="text"
            name="address"
            value={formData.address || ''}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter address"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ZIP Code
          </label>
          <input
            type="text"
            name="zip_code"
            value={formData.zip_code || ''}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter ZIP code"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes || ''}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            placeholder="Enter notes"
          />
        </div>
      </div>
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => {
            setFormData(initialLeadState);
            setActiveTab('leads');
          }}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Create Lead
        </button>
      </div>
    </form>
  );

  const LeadsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex flex-wrap gap-4 items-center">
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            {Object.keys(STATUS_COLORS).map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select
            value={filters.businessType}
            onChange={(e) => setFilters(prev => ({ ...prev, businessType: e.target.value }))}
            className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Business Types</option>
            {BUSINESS_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
            className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <button
            onClick={() => setFilters({ status: '', businessType: '', contacted: '', dateRange: 'all' })}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full"
            title="Clear Filters"
          >
            <X size={20} />
          </button>
        </div>
        <button
          onClick={() => {
            setFormData(initialLeadState);
            setActiveTab('create');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus size={20} />
          Add Lead
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {savedLeads.map((lead) => (
          <div
            key={lead.id}
            className="bg-white p-4 rounded-lg shadow border hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-lg font-medium">{lead.business_name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status]}`}>
                    {lead.status}
                  </span>
                  {lead.last_contact_date && (
                    <span className="text-xs text-gray-500">
                      Last Contact: {new Date(lead.last_contact_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {editingLead === lead.id ? (
                  <button
                    onClick={() => handleUpdateLead(lead.id)}
                    className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-full"
                    title="Save Changes"
                  >
                    <Save size={20} />
                  </button>
                ) : (
                  <button
                    onClick={() => startEditing(lead)}
                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full"
                    title="Edit Lead"
                  >
                    <Edit2 size={20} />
                  </button>
                )}
                <select
                  value={lead.status}
                  onChange={(e) => updateLeadStatus(lead.id, e.target.value as Lead['status'])}
                  className="p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.keys(STATUS_COLORS).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {editingLead === lead.id ? (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="contact_name"
                  value={formData.contact_name || ''}
                  onChange={handleInputChange}
                  className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Contact Name"
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Email"
                />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleInputChange}
                  className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Phone"
                />
                <input
                  type="text"
                  name="website"
                  value={formData.website || ''}
                  onChange={handleInputChange}
                  className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Website"
                />
                <div className="col-span-2">
                  <input
                    type="text"
                    name="address"
                    value={formData.address || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Address"
                  />
                </div>
                <textarea
                  name="notes"
                  value={formData.notes || ''}
                  onChange={handleInputChange}
                  className="col-span-2 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Notes"
                />
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <p className="font-medium">Contact</p>
                  <p>{lead.contact_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-medium">Phone</p>
                  <p>{lead.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-medium">Email</p>
                  <p className="truncate">{lead.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-medium">Type</p>
                  <p>{lead.business_type}</p>
                </div>
                <div className="col-span-2 md:col-span-4">
                  <p className="font-medium">Address</p>
                  <p className="truncate">{lead.address || 'N/A'}</p>
                </div>
                {lead.notes && (
                  <div className="col-span-2 md:col-span-4 bg-gray-50 p-2 rounded">
                    <p className="font-medium">Notes</p>
                    <p>{lead.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Lead Management</h1>
          {!isAuthenticated ? (
            <button
              onClick={handleLogin}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Login with Google
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-gray-600 hover:text-gray-800"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex gap-4 border-b mb-6">
            <button
              onClick={() => setActiveTab('leads')}
              className={`pb-4 px-2 font-medium ${
                activeTab === 'leads'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Leads
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`pb-4 px-2 font-medium ${
                activeTab === 'create'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Create Lead
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`pb-4 px-2 font-medium ${
                activeTab === 'import'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Import/Export
            </button>
          </div>

          {activeTab === 'leads' && <LeadsTab />}
          {activeTab === 'create' && <CreateLeadForm />}
          {activeTab === 'import' && <LeadImport />}
        </div>
      </div>
    </div>
  );
}