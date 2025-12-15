/*
  # Allow viewing logs with null domain_id
  
  1. Changes
    - Add RLS policy to allow users to view logs with domain_id = NULL
    - These are logs where the domain was not found or other errors occurred
    - Users can see these if the param_received matches one of their domains
  
  2. Security
    - Still maintains proper access control
    - Users only see null logs related to their param_keys
*/

CREATE POLICY "Users can view null domain logs with their param_key"
  ON domain_access_logs
  FOR SELECT
  TO authenticated
  USING (
    domain_id IS NULL 
    AND param_received IN (
      SELECT param_key 
      FROM protected_domains 
      WHERE user_id = auth.uid()
    )
  );