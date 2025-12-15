/*
  # Adicionar sistema de pasta aleatória para conteúdo protegido

  1. Alterações
    - Adiciona coluna `content_folder` na tabela `protected_domains`
    - Armazena o nome da pasta escolhida aleatoriamente onde o conteúdo real será colocado
    - Permite personalização e segurança adicional através de nomes imprevisíveis
  
  2. Detalhes
    - A coluna é do tipo TEXT e não pode ser nula
    - Default será 'biblioteca' para compatibilidade com registros existentes
    - Cada domínio terá sua própria pasta única escolhida de uma lista predefinida
*/

-- Adicionar coluna content_folder se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'protected_domains' 
    AND column_name = 'content_folder'
  ) THEN
    ALTER TABLE protected_domains 
    ADD COLUMN content_folder TEXT NOT NULL DEFAULT 'biblioteca';
  END IF;
END $$;