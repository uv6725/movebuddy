import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export type Lead = {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  zip_code: string | null;
  business_type: string | null;
  contacted: boolean;
  responded: boolean;
  status: 'New' | 'Contacted' | 'Responded' | 'Not Interested' | 'Converted';
  notes: string | null;
  last_contact_date: string | null;
  created_at: string;
  source: string;
  user_id: string;
};

export async function importLeadsFromCSV(file: File) {
  const text = await file.text();
  const rows = text.split('\n');
  const headers = rows[0].split(',').map(h => h.trim());
  
  const leads = rows.slice(1).map(row => {
    const values = row.split(',').map(v => v.trim());
    const lead: Partial<Lead> = {};
    
    headers.forEach((header, index) => {
      const value = values[index];
      switch(header.toLowerCase()) {
        case 'business_name':
          lead.business_name = value;
          break;
        case 'contact_name':
          lead.contact_name = value;
          break;
        case 'email':
          lead.email = value;
          break;
        case 'phone':
          lead.phone = value;
          break;
        case 'website':
          lead.website = value;
          break;
        case 'address':
          lead.address = value;
          break;
        case 'zip_code':
          lead.zip_code = value;
          break;
        case 'business_type':
          lead.business_type = value;
          break;
      }
    });

    lead.status = 'New';
    lead.contacted = false;
    lead.responded = false;
    lead.source = 'import';
    lead.created_at = new Date().toISOString();

    return lead;
  });

  const { data, error } = await supabase
    .from('leads')
    .insert(leads);

  if (error) throw error;
  return data;
}

export async function exportLeadsToCSV() {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const headers = [
    'Business Name',
    'Contact Name',
    'Email',
    'Phone',
    'Website',
    'Address',
    'ZIP Code',
    'Business Type',
    'Status',
    'Contacted',
    'Responded',
    'Notes',
    'Last Contact Date',
    'Created At'
  ];

  const csvContent = [
    headers.join(','),
    ...leads.map(lead => [
      lead.business_name,
      lead.contact_name || '',
      lead.email || '',
      lead.phone || '',
      lead.website || '',
      lead.address || '',
      lead.zip_code || '',
      lead.business_type || '',
      lead.status,
      lead.contacted,
      lead.responded,
      (lead.notes || '').replace(/,/g, ';'),
      lead.last_contact_date || '',
      lead.created_at
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}