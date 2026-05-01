-- Execute esse SQL no Supabase: SQL Editor → New Query → Cole e clique em "Run"
-- Adiciona colunas pra gerenciar status e notas dos candidatos

-- Tabela candidaturas (modal curto da landing)
ALTER TABLE candidaturas
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'novo',
  ADD COLUMN IF NOT EXISTS notas TEXT,
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT now();

-- Tabela cadastros_completos (wizard de 3 etapas)
ALTER TABLE cadastros_completos
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'novo',
  ADD COLUMN IF NOT EXISTS notas TEXT,
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT now();

-- Status possíveis (sugestão):
-- 'novo'         → acabou de chegar, ninguém olhou ainda
-- 'contatado'    → time já chamou no WhatsApp
-- 'em_processo'  → entrevista marcada / passou pra próxima etapa
-- 'aprovado'    → vai ser contratado
-- 'rejeitado'    → não passou
