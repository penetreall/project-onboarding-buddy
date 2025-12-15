/*
  # Sistema de Autenticação Customizado - MVP (Fix)

  Corrige policies existentes e cria sistema de auth customizado.
*/

-- Criar tabela de usuários customizada
CREATE TABLE IF NOT EXISTS ice_wall_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  is_admin boolean DEFAULT false,
  created_by uuid REFERENCES ice_wall_users(id),
  created_at timestamptz DEFAULT now(),
  last_login timestamptz,
  CONSTRAINT username_min_length CHECK (char_length(username) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_ice_wall_users_username ON ice_wall_users(username);
CREATE INDEX IF NOT EXISTS idx_ice_wall_users_created_by ON ice_wall_users(created_by);

-- Inserir usuário admin fixo (i / 22)
INSERT INTO ice_wall_users (username, password_hash, is_admin)
VALUES ('i', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', true)
ON CONFLICT (username) DO NOTHING;

-- Adicionar coluna ice_wall_user_id nas tabelas existentes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'protected_domains' AND column_name = 'ice_wall_user_id'
  ) THEN
    ALTER TABLE protected_domains ADD COLUMN ice_wall_user_id uuid REFERENCES ice_wall_users(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'ice_wall_user_id'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN ice_wall_user_id uuid REFERENCES ice_wall_users(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_protected_domains_ice_wall_user ON protected_domains(ice_wall_user_id);
CREATE INDEX IF NOT EXISTS idx_domain_access_logs_ice_wall_user ON domain_access_logs(ice_wall_user_id);

-- RLS: ice_wall_users
ALTER TABLE ice_wall_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all users" ON ice_wall_users;
DROP POLICY IF EXISTS "Admins can create users" ON ice_wall_users;
DROP POLICY IF EXISTS "Users can view own profile" ON ice_wall_users;

CREATE POLICY "Admins can view all users"
  ON ice_wall_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ice_wall_users admin
      WHERE admin.id = current_setting('app.current_user_id', true)::uuid
      AND admin.is_admin = true
    )
    OR id = current_setting('app.current_user_id', true)::uuid
  );

CREATE POLICY "Admins can create users"
  ON ice_wall_users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ice_wall_users admin
      WHERE admin.id = current_setting('app.current_user_id', true)::uuid
      AND admin.is_admin = true
    )
  );

-- RLS: protected_domains
DROP POLICY IF EXISTS "Users can view own domains" ON protected_domains;
DROP POLICY IF EXISTS "Users can create own domains" ON protected_domains;
DROP POLICY IF EXISTS "Users can update own domains" ON protected_domains;
DROP POLICY IF EXISTS "Users can delete own domains" ON protected_domains;

CREATE POLICY "Users can view own domains"
  ON protected_domains FOR SELECT
  USING (ice_wall_user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can create own domains"
  ON protected_domains FOR INSERT
  WITH CHECK (ice_wall_user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can update own domains"
  ON protected_domains FOR UPDATE
  USING (ice_wall_user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can delete own domains"
  ON protected_domains FOR DELETE
  USING (ice_wall_user_id = current_setting('app.current_user_id', true)::uuid);

-- RLS: domain_access_logs
DROP POLICY IF EXISTS "Users can view own logs" ON domain_access_logs;
DROP POLICY IF EXISTS "System can insert logs" ON domain_access_logs;

CREATE POLICY "Users can view own logs"
  ON domain_access_logs FOR SELECT
  USING (
    ice_wall_user_id = current_setting('app.current_user_id', true)::uuid
    OR domain_id IN (
      SELECT id FROM protected_domains 
      WHERE ice_wall_user_id = current_setting('app.current_user_id', true)::uuid
    )
  );

CREATE POLICY "System can insert logs"
  ON domain_access_logs FOR INSERT
  WITH CHECK (true);
