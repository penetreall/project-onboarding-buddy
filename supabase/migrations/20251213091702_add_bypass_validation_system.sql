/*
  # Add Bypass Validation System

  1. Changes to `protected_domains`
    - Add `param_key` (text, unique parameter for external validation)
    - Add `safe_url` (text, URL for safe/audit traffic)
    - Add `money_url` (text, URL for real traffic)
    - Add `is_active` (boolean, to enable/disable domains)
  
  2. New Table `domain_access_logs`
    - `id` (uuid, primary key)
    - `domain_id` (uuid, FK to protected_domains)
    - `ip` (text, visitor IP)
    - `user_agent` (text)
    - `headers` (jsonb, all HTTP headers)
    - `country` (text, detected country)
    - `is_safe` (boolean, true if redirected to safe page)
    - `param_received` (text, parameter sent in request)
    - `created_at` (timestamptz)

  3. Security
    - Service role can read domains for validation
    - Service role can insert logs
    - Users can only view logs from their domains
*/

-- Add new columns to protected_domains
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'protected_domains' AND column_name = 'param_key'
  ) THEN
    ALTER TABLE protected_domains ADD COLUMN param_key text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'protected_domains' AND column_name = 'safe_url'
  ) THEN
    ALTER TABLE protected_domains ADD COLUMN safe_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'protected_domains' AND column_name = 'money_url'
  ) THEN
    ALTER TABLE protected_domains ADD COLUMN money_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'protected_domains' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE protected_domains ADD COLUMN is_active boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Create index for param_key lookups
CREATE INDEX IF NOT EXISTS idx_protected_domains_param_key ON protected_domains(param_key) WHERE param_key IS NOT NULL;

-- Create domain_access_logs table
CREATE TABLE IF NOT EXISTS domain_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES protected_domains(id) ON DELETE CASCADE NOT NULL,
  ip text NOT NULL,
  user_agent text,
  headers jsonb DEFAULT '{}'::jsonb,
  country text,
  is_safe boolean NOT NULL,
  param_received text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for domain_access_logs
CREATE INDEX IF NOT EXISTS idx_domain_access_logs_domain_id ON domain_access_logs(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_access_logs_created_at ON domain_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_domain_access_logs_ip ON domain_access_logs(ip);

-- Enable RLS on domain_access_logs
ALTER TABLE domain_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can read all domains (for validation)
DROP POLICY IF EXISTS "Service role can read all domains" ON protected_domains;
CREATE POLICY "Service role can read all domains"
  ON protected_domains FOR SELECT
  TO service_role
  USING (true);

-- RLS Policy: Users can view logs from their domains
DROP POLICY IF EXISTS "Users can view own domain logs" ON domain_access_logs;
CREATE POLICY "Users can view own domain logs"
  ON domain_access_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM protected_domains
      WHERE protected_domains.id = domain_access_logs.domain_id
      AND protected_domains.user_id = auth.uid()
    )
  );

-- RLS Policy: Service role can insert logs
DROP POLICY IF EXISTS "Service role can insert logs" ON domain_access_logs;
CREATE POLICY "Service role can insert logs"
  ON domain_access_logs FOR INSERT
  TO service_role
  WITH CHECK (true);