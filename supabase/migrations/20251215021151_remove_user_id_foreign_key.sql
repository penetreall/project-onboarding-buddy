/*
  # Remove foreign key constraint from user_id column

  1. Changes
    - Drop foreign key constraint on user_id that references auth.users
    - Keep user_id column but remove the constraint since we use ice_wall_users table instead
  
  2. Rationale
    - System uses custom ice_wall_users table, not auth.users
    - user_id and ice_wall_user_id both store the same value from ice_wall_users
*/

-- Drop the foreign key constraint that references auth.users
ALTER TABLE protected_domains 
  DROP CONSTRAINT IF EXISTS protected_domains_user_id_fkey;
