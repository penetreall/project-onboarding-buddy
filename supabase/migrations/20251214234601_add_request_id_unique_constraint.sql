/*
  # Add Request ID Idempotency System

  1. Schema Changes
    - Add UNIQUE constraint on `request_id` column in `domain_access_logs` table
    - This ensures one request = one log entry
    - Prevents duplicate logging from Edge and PHP
  
  2. Purpose
    - Edge function creates initial log with request_id
    - PHP only updates existing log (no new inserts)
    - Frontend groups strictly by request_id
  
  3. Security Impact
    - Eliminates false "duplicate attack" detection
    - Provides accurate forensic timeline
    - Single source of truth per request
*/

-- Add unique constraint to request_id
ALTER TABLE domain_access_logs 
ADD CONSTRAINT domain_access_logs_request_id_unique 
UNIQUE (request_id);

-- Create index for faster lookups by request_id
CREATE INDEX IF NOT EXISTS idx_domain_access_logs_request_id 
ON domain_access_logs(request_id);
