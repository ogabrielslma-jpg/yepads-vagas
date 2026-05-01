-- =============================================================
-- Execute esse SQL no Supabase: SQL Editor → New Query → Run
-- Tabela completa de onboarding (passo final do funil)
-- =============================================================

CREATE TABLE IF NOT EXISTS onboardings (
  id BIGSERIAL PRIMARY KEY,

  -- Step 1: Identificação + Endereço
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  cpf TEXT,
  data_nascimento DATE,
  cep TEXT,
  rua TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,

  -- Step 2: KYC (mesmo padrão que /documentos)
  rg_url TEXT,
  comprovante_residencia_url TEXT,
  dados_verdadeiros BOOLEAN DEFAULT FALSE,
  autorizacao_consulta BOOLEAN DEFAULT FALSE,

  -- Step 3: Conta bancária pra recebimento
  tem_conta_internacional BOOLEAN,
  banco TEXT,                          -- 'payoneer', 'nomad', 'dasbank', 'sem_conta'
  comprovante_conta_url TEXT,          -- PDF com dados da conta
  observacoes TEXT,

  -- Status
  status TEXT DEFAULT 'pendente',      -- pendente | em_analise | aprovado | rejeitado
  step_concluido INTEGER DEFAULT 0,     -- 0, 1, 2, 3 (último step concluído)
  notas_admin TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_email ON onboardings(email);
CREATE INDEX IF NOT EXISTS idx_onboarding_whatsapp ON onboardings(whatsapp);
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON onboardings(status);

-- =============================================================
-- Marca conclusão do onboarding nas tabelas de candidatura
-- =============================================================
ALTER TABLE candidaturas
  ADD COLUMN IF NOT EXISTS onboarding_em TIMESTAMPTZ;

ALTER TABLE cadastros_completos
  ADD COLUMN IF NOT EXISTS onboarding_em TIMESTAMPTZ;
