-- Grants para melhorar descoberta no gen types e acesso por authenticated.
-- Implementacao defensiva: aplica grants apenas quando o objeto existir.

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT
      p.proname,
      pg_catalog.oidvectortypes(p.proargtypes) AS argtypes
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'convocar_assembleia',
        'iniciar_assembleia',
        'encerrar_assembleia',
        'retentar_webhook'
      )
  LOOP
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated',
      fn.proname,
      fn.argtypes
    );
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regclass('public.v_notificacoes_dashboard') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT ON TABLE public.v_notificacoes_dashboard TO authenticated';
  END IF;

  IF to_regclass('public.norma_training_logs') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT ON TABLE public.norma_training_logs TO authenticated';
  END IF;
END $$;
