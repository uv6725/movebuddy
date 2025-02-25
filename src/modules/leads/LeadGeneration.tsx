import React, { useState, useEffect } from 'react';
import { Search, Building2, MapPin, Plus, Filter, RefreshCw, Check, X, Upload, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Lead } from '../../lib/supabase';
import { LeadImport } from './LeadImport';
import toast from 'react-hot-toast';
import type { ViewMode } from '../../types';

interface LeadGenerationProps {
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

async function searchGoogleMaps(zipCode: string, businessType: string, token: string) {
  try {
    const response = await axios.post(`${GMAPS_API_ENDPOINT}?token=${token}`, {
      searchStrings: [`${businessType} in ${zipCode}`],
      maxCrawledPlaces: 10,
      language: "en",
      maxImages: 0,
      exportPlaceUrls: false,
      includeHistogram: false,
      includeOpeningHours: false,
      includePeopleAlsoSearch: false
    });

    if (!Array.isArray(response.data)) {
      console.error('Unexpected API response:', response.data);
      throw new Error('Invalid API response format');
    }

    return response.data.map((item: any) => ({
      id: `gmaps-${Date.now()}-${Math.random()}`,
      business_name: item.title || 'Unknown Business',
      contact_name: '',
      email: item.email || '',
      phone: item.phone || '',
      website: item.website || '',
      address: item.address || `${zipCode} area`,
      zip_code: zipCode,
      business_type: businessType,
      rating: item.rating,
      reviews: item.reviewsCount,
      source: 'gmaps'
    }));
  } catch (error: any) {
    console.error('Google Maps API error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch data from Google Maps');
  }
}

export function LeadGeneration({ viewMode }: LeadGenerationProps) {
  const [searchParams, setSearchParams] = useState({
    zipCode: '',
    businessType: '',
    radius: '10'
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [savedLeads, setSavedLeads] = useState<Lead[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'leads' | 'import'>('search');
  const [filters, setFilters] = useState({
    status: '',
    businessType: '',
    contacted: '',
    dateRange: 'all'
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
    if (isAuthenticated) {
      fetchSavedLeads();
    }
  }, [isAuthenticated]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
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

  const handleSearch = async () => {
    if (!searchParams.zipCode || !searchParams.businessType) {
      toast.error('Please enter both ZIP code and business type');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      const results = await searchGoogleMaps(
        searchParams.zipCode,
        searchParams.businessType,
        import.meta.env.VITE_GMAPS_TOKEN
      );

      setSearchResults(results);

      if (results.length === 0) {
        toast.error('No results found');
      } else {
        toast.success(`Found ${results.length} leads`);
      }
    } catch (error: any) {
      console.error('Search failed:', error);
      toast.error(error.message || 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const saveLead = async (lead: any) => {
    if (!isAuthenticated) {
      toast.error('Please login to save leads');
      return;
    }

    const newLead: Omit<Lead, 'id'> = {
      ...lead,
      contacted: false,
      responded: false,
      status: 'New',
      notes: '',
      last_contact_date: null,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('leads')
      .insert([newLead]);

    if (error) {
      toast.error('Failed to save lead');
      return;
    }

    toast.success('Lead saved successfully');
    fetchSavedLeads();
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

  const SearchTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ZIP Code
          </label>
          <input
            type="text"
            value={searchParams.zipCode}
            onChange={(e) => setSearchParams(prev => ({ ...prev, zipCode: e.target.value }))}
            className="w-full p-2 border rounded-md"
            placeholder="Enter ZIP code"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Type
          </label>
          <select
            value={searchParams.businessType}
            onChange={(e) => setSearchParams(prev => ({ ...prev, businessType: e.target.value }))}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Select type</option>
            {BUSINESS_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleSearch}
        disabled={!searchParams.zipCode || !searchParams.businessType || isSearching}
        className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 
          disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSearching ? (
          <>
            <RefreshCw className="animate-spin" size={20} />
            Searching...
          </>
        ) : (
          <>
            <Search size={20} />
            Search
          </>
        )}
      </button>

      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Search Results</h3>
          <div className="grid grid-cols-1 gap-4">
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="bg-white p-4 rounded-lg shadow border hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-medium">{result.business_name}</h4>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <MapPin size={16} />
                      {result.address}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Building2 size={16} />
                      {result.business_type}
                    </p>
                    {result.rating && (
                      <p className="text-sm text-yellow-600">
                        ★ {result.rating} ({result.reviews} reviews)
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => saveLead(result)}
                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full"
                    title="Save Lead"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="font-medium">Phone</p>
                    <p>{result.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="font-medium">Website</p>
                    <p className="truncate">{result.website || 'N/A'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const LeadsTab = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center">
        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="p-2 border rounded-md"
        >
          <option value="">All Statuses</option>
          {Object.keys(STATUS_COLORS).map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <select
          value={filters.businessType}
          onChange={(e) => setFilters(prev => ({ ...prev, businessType: e.target.value }))}
          className="p-2 border rounded-md"
        >
          <option value="">All Business Types</option>
          {BUSINESS_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <select
          value={filters.contacted}
          onChange={(e) => setFilters(prev => ({ ...prev, contacted: e.target.value }))}
          className="p-2 border rounded-md"
        >
          <option value="">All Contact Status</option>
          <option value="true">Contacted</option>
          <option value="false">Not Contacted</option>
        </select>
        <select
          value={filters.dateRange}
          onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
          className="p-2 border rounded-md"
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
                {lead.rating && (
                  <p className="text-sm text-yellow-600 mt-1">
                    ★ {lead.rating} ({lead.reviews} reviews)
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {!lead.contacted && (
                  <button
                    onClick={() => updateLeadStatus(lead.id, 'Contacted')}
                    className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-full"
                    title="Mark as Contacted"
                  >
                    <Check size={20} />
                  </button>
                )}
                <select
                  value={lead.status}
                  onChange={(e) => updateLeadStatus(lead.id, e.target.value as Lead['status'])}
                  className="p-2 border rounded-md text-sm"
                >
                  {Object.keys(STATUS_COLORS).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <p className="font-medium">Address</p>
                <p className="truncate">{lead.address || 'N/A'}</p>
              </div>
              <div>
                <p className="font-medium">Phone</p>
                <p>{lead.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="font-medium">Website</p>
                <p className="truncate">{lead.website || 'N/A'}</p>
              </div>
              <div>
                <p className="font-medium">Type</p>
                <p>{lead.business_type}</p>
              </div>
            </div>
            {lead.notes && (
              <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                <p className="font-medium">Notes</p>
                <p>{lead.notes}</p>
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
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
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
              onClick={() => setActiveTab('search')}
              className={`pb-4 px-2 font-medium ${
                activeTab === 'search'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Search
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`pb-4 px-2 font-medium ${
                activeTab === 'leads'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Saved Leads
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

          {activeTab === 'search' && <SearchTab />}
          {activeTab === 'leads' && <LeadsTab />}
          {activeTab === 'import' && <LeadImport />}
        </div>
      </div>
    </div>
  );
}