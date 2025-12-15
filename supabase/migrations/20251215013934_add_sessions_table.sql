/*
  # Tabela de Sessões

  Para gerenciar login sem dependências externas:
  - `id` (uuid) - session_id único
  - `user_id` (uuid) - referência para ice_wall_users
  - `created_at` (timestamp)
  - `expires_at` (timestamp)
  - `last_activity` (timestamp)
*/

CREATE TABLE IF NOT EXISTS ice_wall_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES ice_wall_users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  last_activity timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ice_wall_sessions_user_id ON ice_wall_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ice_wall_sessions_expires_at ON ice_wall_sessions(expires_at);

-- Cleanup de sessões expiradas (função helper)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM ice_wall_sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- RLS: Permitir sistema gerenciar sessões
ALTER TABLE ice_wall_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage sessions"
  ON ice_wall_sessions FOR ALL
  USING (true)
  WITH CHECK (true);
