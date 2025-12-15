/*
  # Fix protected_domains user_id column

  1. Changes
    - Make user_id nullable (temporary for migration)
    - Populate user_id with ice_wall_user_id values
    - Update all references to use ice_wall_user_id
  
  2. Security
    - RLS policies already use ice_wall_user_id
    - No data loss
*/

-- Make user_id nullable to allow existing system to work
ALTER TABLE protected_domains 
  ALTER COLUMN user_id DROP NOT NULL;

-- Populate user_id with ice_wall_user_id for existing records
UPDATE protected_domains 
SET user_id = ice_wall_user_id 
WHERE ice_wall_user_id IS NOT NULL AND user_id IS NULL;
