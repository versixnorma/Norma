-- VERSIX NORMA - Configuração pg_cron
-- Sprint 1 - Tarefa 1.5: Configurar pg_cron para automação

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Conceder permissões necessárias
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- 3. Criar tabela de configuração se não existir
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Inserir configurações necessárias (substitua pelos valores reais)
INSERT INTO config (key, value) VALUES
  ('supabase_url', 'https://your-project.supabase.co'),
  ('service_role_key', 'your-service-role-key')
ON CONFLICT (key) DO NOTHING;

-- 5. Configurar job para collect-metrics (a cada 1 hora)
SELECT cron.schedule(
  'hourly-collect-metrics',
  '0 * * * *', -- A cada hora
  $$
  SELECT net.http_post(
    url := (SELECT value FROM config WHERE key = 'supabase_url') || '/functions/v1/collect-metrics',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM config WHERE key = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 6. Configurar job para uptime-check (a cada 5 minutos)
SELECT cron.schedule(
  'every-5min-uptime-check',
  '*/5 * * * *', -- A cada 5 minutos
  $$
  SELECT net.http_post(
    url := (SELECT value FROM config WHERE key = 'supabase_url') || '/functions/v1/uptime-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM config WHERE key = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 7. Verificar jobs configurados
SELECT * FROM cron.job ORDER BY jobname;
