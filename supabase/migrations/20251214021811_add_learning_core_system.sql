/*
  # Ice Wall - Learning Core System
  
  Sistema de aprendizado comportamental interno que:
  - Consolida padrões diariamente de forma autônoma
  - Retém apenas o que persiste sob variação
  - Esquece ruído automaticamente através de decay
  - Opera em shadow mode total
  - Não expõe sinais externos
  
  ## Novas Estruturas
  
  1. `learned_patterns` - Padrões que emergiram através de persistência
  2. `pattern_consolidation` - Evidências e contextos múltiplos
  3. `learning_windows` - Janelas móveis de análise
  4. Sistema de confidence scoring baseado em recorrência + diversidade + tempo
  5. Decay automático para esquecer padrões que não persistem
  
  ## Princípios Fundamentais
  
  - Maioria dos eventos é descartada (esquecimento > retenção)
  - Padrões só emergem através de persistência temporal
  - Densidade e recorrência > duração artificial
  - Separação total entre observação e decisão
  - Nenhuma reação externa ainda
*/

-- Padrões aprendidos (emergentes através de persistência)
CREATE TABLE IF NOT EXISTS learned_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Assinatura comportamental única
  signature_hash text NOT NULL UNIQUE,
  pattern_class text NOT NULL,
  
  -- Características consolidadas
  behavior_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Métricas de confiança
  confidence_score decimal(5,4) NOT NULL DEFAULT 0.0000,
  occurrence_count integer NOT NULL DEFAULT 1,
  context_variations integer NOT NULL DEFAULT 1,
  
  -- Persistência temporal
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  persistence_hours decimal(10,2) GENERATED ALWAYS AS 
    (EXTRACT(EPOCH FROM (last_seen_at - first_seen_at)) / 3600) STORED,
  
  -- Sistema de decay
  decay_coefficient decimal(5,4) NOT NULL DEFAULT 1.0000,
  last_decay_applied timestamptz NOT NULL DEFAULT now(),
  
  -- Lifecycle
  learning_stage text NOT NULL DEFAULT 'emerging' 
    CHECK (learning_stage IN ('emerging', 'established', 'fading', 'forgotten')),
  
  -- Tracking
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Consolidação de evidências
CREATE TABLE IF NOT EXISTS pattern_consolidation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learned_pattern_id uuid NOT NULL REFERENCES learned_patterns(id) ON DELETE CASCADE,
  
  -- Evidência específica
  observation_ref text NOT NULL,
  context_hash text NOT NULL,
  
  -- Dados da evidência
  evidence_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Temporal
  captured_at timestamptz NOT NULL DEFAULT now(),
  learning_window_id uuid,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Janelas de aprendizado (rolling windows)
CREATE TABLE IF NOT EXISTS learning_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Período da janela
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  duration_hours integer NOT NULL DEFAULT 24,
  
  -- Estatísticas
  observations_processed integer NOT NULL DEFAULT 0,
  patterns_discovered integer NOT NULL DEFAULT 0,
  noise_discarded integer NOT NULL DEFAULT 0,
  patterns_consolidated integer NOT NULL DEFAULT 0,
  
  -- Estado
  window_status text NOT NULL DEFAULT 'collecting'
    CHECK (window_status IN ('collecting', 'processing', 'finalized')),
  
  -- Tracking
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(starts_at, ends_at)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_learned_patterns_signature 
  ON learned_patterns(signature_hash);

CREATE INDEX IF NOT EXISTS idx_learned_patterns_class_stage 
  ON learned_patterns(pattern_class, learning_stage);

CREATE INDEX IF NOT EXISTS idx_learned_patterns_confidence 
  ON learned_patterns(confidence_score DESC) 
  WHERE learning_stage IN ('emerging', 'established');

CREATE INDEX IF NOT EXISTS idx_learned_patterns_last_seen 
  ON learned_patterns(last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_pattern_consolidation_pattern 
  ON pattern_consolidation(learned_pattern_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_pattern_consolidation_observation 
  ON pattern_consolidation(observation_ref);

CREATE INDEX IF NOT EXISTS idx_pattern_consolidation_context 
  ON pattern_consolidation(context_hash);

CREATE INDEX IF NOT EXISTS idx_learning_windows_status 
  ON learning_windows(window_status, starts_at DESC);

-- Função: Calcular confidence baseado em persistência real
CREATE OR REPLACE FUNCTION compute_pattern_confidence(
  p_occurrence_count integer,
  p_context_variations integer,
  p_persistence_hours decimal,
  p_decay_coefficient decimal
) RETURNS decimal AS $$
DECLARE
  occurrence_weight decimal;
  diversity_weight decimal;
  persistence_weight decimal;
  computed_confidence decimal;
BEGIN
  -- Logarítmico para evitar over-weighting de volume puro
  occurrence_weight := LEAST(1.0, LOG(p_occurrence_count + 1) / LOG(100));
  
  -- Diversidade de contexto (padrão aparece sob condições variadas)
  diversity_weight := LEAST(1.0, LOG(p_context_variations + 1) / LOG(50));
  
  -- Persistência temporal (resiste ao tempo)
  persistence_weight := LEAST(1.0, LOG(p_persistence_hours + 1) / LOG(168));
  
  -- Ponderação: recorrência (40%) + diversidade (35%) + persistência (25%)
  computed_confidence := (
    (occurrence_weight * 0.40) +
    (diversity_weight * 0.35) +
    (persistence_weight * 0.25)
  ) * p_decay_coefficient;
  
  RETURN LEAST(1.0, GREATEST(0.0, computed_confidence));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função: Aplicar decay automático (esquecer o que não persiste)
CREATE OR REPLACE FUNCTION execute_pattern_decay()
RETURNS TABLE(patterns_decayed integer, patterns_forgotten integer) AS $$
DECLARE
  daily_decay_rate decimal := 0.95;
  decay_interval_hours integer := 24;
  v_patterns_decayed integer;
  v_patterns_forgotten integer;
BEGIN
  -- Aplicar decay baseado em tempo desde última observação
  WITH decay_updates AS (
    UPDATE learned_patterns
    SET 
      decay_coefficient = decay_coefficient * POWER(daily_decay_rate, 
        EXTRACT(EPOCH FROM (now() - last_decay_applied)) / (decay_interval_hours * 3600)
      ),
      last_decay_applied = now(),
      learning_stage = CASE
        WHEN decay_coefficient * POWER(daily_decay_rate, 
          EXTRACT(EPOCH FROM (now() - last_decay_applied)) / (decay_interval_hours * 3600)
        ) < 0.30 THEN 'fading'
        WHEN decay_coefficient * POWER(daily_decay_rate, 
          EXTRACT(EPOCH FROM (now() - last_decay_applied)) / (decay_interval_hours * 3600)
        ) < 0.10 THEN 'forgotten'
        ELSE learning_stage
      END,
      updated_at = now()
    WHERE 
      learning_stage IN ('emerging', 'established', 'fading')
      AND last_decay_applied < now() - interval '1 hour'
    RETURNING *
  )
  SELECT COUNT(*) INTO v_patterns_decayed FROM decay_updates;
  
  -- Recalcular confidence após decay
  UPDATE learned_patterns
  SET 
    confidence_score = compute_pattern_confidence(
      occurrence_count,
      context_variations,
      persistence_hours,
      decay_coefficient
    ),
    updated_at = now()
  WHERE learning_stage IN ('emerging', 'established', 'fading');
  
  -- Contar padrões esquecidos
  SELECT COUNT(*) INTO v_patterns_forgotten
  FROM learned_patterns
  WHERE learning_stage = 'forgotten';
  
  patterns_decayed := v_patterns_decayed;
  patterns_forgotten := v_patterns_forgotten;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update timestamp
CREATE OR REPLACE FUNCTION trigger_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS learned_patterns_update_timestamp ON learned_patterns;
CREATE TRIGGER learned_patterns_update_timestamp
  BEFORE UPDATE ON learned_patterns
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_timestamp();

-- RLS: Shadow mode (sistema interno apenas)
ALTER TABLE learned_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_consolidation ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_windows ENABLE ROW LEVEL SECURITY;

-- Políticas: Acesso autenticado apenas
DROP POLICY IF EXISTS "authenticated_access_learned_patterns" ON learned_patterns;
CREATE POLICY "authenticated_access_learned_patterns"
  ON learned_patterns FOR ALL
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_access_pattern_consolidation" ON pattern_consolidation;
CREATE POLICY "authenticated_access_pattern_consolidation"
  ON pattern_consolidation FOR ALL
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_access_learning_windows" ON learning_windows;
CREATE POLICY "authenticated_access_learning_windows"
  ON learning_windows FOR ALL
  TO authenticated
  USING (true);

-- View: Padrões estabelecidos (threshold de confiança atingido)
CREATE OR REPLACE VIEW established_learning_patterns AS
SELECT 
  lp.signature_hash,
  lp.pattern_class,
  lp.behavior_profile,
  lp.confidence_score,
  lp.occurrence_count,
  lp.context_variations,
  lp.persistence_hours,
  lp.first_seen_at,
  lp.last_seen_at,
  lp.learning_stage,
  COUNT(pc.id) as evidence_count
FROM learned_patterns lp
LEFT JOIN pattern_consolidation pc ON pc.learned_pattern_id = lp.id
WHERE 
  lp.learning_stage IN ('emerging', 'established')
  AND lp.confidence_score >= 0.60
  AND lp.occurrence_count >= 5
  AND lp.context_variations >= 3
GROUP BY lp.id
ORDER BY lp.confidence_score DESC, lp.last_seen_at DESC;

COMMENT ON TABLE learned_patterns IS 'Padrões comportamentais que emergiram através de persistência temporal e diversidade de contexto';
COMMENT ON TABLE pattern_consolidation IS 'Evidências múltiplas que suportam padrões aprendidos';
COMMENT ON TABLE learning_windows IS 'Janelas móveis de consolidação de aprendizado';
COMMENT ON VIEW established_learning_patterns IS 'Padrões que atingiram threshold de confiança (>= 0.60, >= 5 ocorrências, >= 3 contextos)';
