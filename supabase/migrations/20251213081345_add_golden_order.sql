/*
  # Add Golden Order for Header Fingerprinting

  1. Changes
    - Add `golden_order` column to `protected_domains` table
    - Stores the expected HTTP header order for browser fingerprinting
    - Format: pipe-separated list of header names (e.g., "Host|Connection|sec-ch-ua|...")

  2. Security
    - No RLS changes needed - inherits existing policies
*/

-- Add golden_order column
ALTER TABLE protected_domains
ADD COLUMN IF NOT EXISTS golden_order text;

-- Add index for golden_order lookups
CREATE INDEX IF NOT EXISTS idx_protected_domains_golden_order ON protected_domains(golden_order);
