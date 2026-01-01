// SPRINT 10: Collect Metrics (Cron: a cada hora)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const agora = new Date();
  const hoje = agora.toISOString().split('T')[0];
  const inicioHora = new Date(agora);
  inicioHora.setHours(agora.getHours() - 1);

  const { data: condominios } = await supabase.from('condominios').select('id').eq('status', 'active');

  for (const condo of condominios || []) {
    const { count: usuarios } = await supabase
      .from('audit_logs').select('usuario_id', { count: 'exact', head: true })
      .eq('condominio_id', condo.id).gte('created_at', inicioHora.toISOString());

    const { data: existente } = await supabase
      .from('metricas_uso').select('*')
      .eq('condominio_id', condo.id).eq('periodo', hoje).eq('tipo_periodo', 'dia').single();

    if (existente) {
      await supabase.from('metricas_uso').update({
        usuarios_ativos: existente.usuarios_ativos + (usuarios || 0),
        updated_at: new Date().toISOString(),
      }).eq('id', existente.id);
    } else {
      await supabase.from('metricas_uso').insert({
        condominio_id: condo.id, periodo: hoje, tipo_periodo: 'dia', usuarios_ativos: usuarios || 0,
      });
    }
  }

  return Response.json({ success: true, timestamp: agora.toISOString() });
});
