/*
  # Create leads table for lead generation module

  1. New Tables
    - `leads`
      - `id` (uuid, primary key)
      - `business_name` (text)
      - `contact_name` (text)
      - `email` (text)
      - `phone` (text)
      - `website` (text)
      - `address` (text)
      - `zip_code` (text)
      - `business_type` (text)
      - `contacted` (boolean)
      - `responded` (boolean)
      - `status` (text)
      - `notes` (text)
      - `last_contact_date` (timestamptz)
      - `created_at` (timestamptz)
      - `user_id` (uuid, references auth.users)

  2. Security
    - Enable RLS on `leads` table
    - Add policies for authenticated users to:
      - Read their own leads
      - Create new leads
      - Update their own leads
*/

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  website text,
  address text,
  zip_code text,
  business_type text,
  contacted boolean DEFAULT false,
  responded boolean DEFAULT false,
  status text DEFAULT 'New',
  notes text,
  last_contact_date timestamptz,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users NOT NULL
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own leads
CREATE POLICY "Users can read own leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy to allow users to insert their own leads
CREATE POLICY "Users can create leads"
  ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own leads
CREATE POLICY "Users can update own leads"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);