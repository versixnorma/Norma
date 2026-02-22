-- Migration: Extend condominios table with new fields
-- Adds detailed address, operational, and configuration columns needed
-- for the "Novo Condomínio" admin form.

ALTER TABLE condominios
  -- Razão social (legal company name, separate from nome fantasia)
  ADD COLUMN IF NOT EXISTS razao_social text,

  -- Individual street address (previously only a combined "endereco" existed)
  ADD COLUMN IF NOT EXISTS logradouro text,

  -- Day of month for condo fee due date (1–28)
  ADD COLUMN IF NOT EXISTS dia_vencimento integer NOT NULL DEFAULT 10,

  -- Common leisure areas (array of area names)
  -- e.g. {"Piscina", "Academia", "Churrasqueira"}
  ADD COLUMN IF NOT EXISTS areas_comuns text[],

  -- Enabled feature modules per condo (JSON boolean flags)
  -- e.g. {"financeiro": true, "assembleias": true, "comunicacao": true, "norma_ai": true}
  ADD COLUMN IF NOT EXISTS modules jsonb;

-- Backfill logradouro from existing endereco for legacy records
UPDATE condominios
SET logradouro = endereco
WHERE logradouro IS NULL
  AND endereco IS NOT NULL
  AND endereco <> '';

-- Enable all modules by default for existing condominios
UPDATE condominios
SET modules = '{"financeiro": true, "assembleias": true, "comunicacao": true, "norma_ai": true}'::jsonb
WHERE modules IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_condominios_modules ON condominios USING gin (modules);
CREATE INDEX IF NOT EXISTS idx_condominios_areas_comuns ON condominios USING gin (areas_comuns);
