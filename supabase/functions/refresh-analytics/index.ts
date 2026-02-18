// Sprint 4: Refresh Analytics Views (Cron: a cada 15 min)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { notifyError } from '../_shared/notify-error.ts';

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { error } = await supabase.rpc('refresh_analytics_views');

    if (error) {
      await notifyError('refresh-analytics', error);
      console.error('Error refreshing analytics views:', error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Analytics views refreshed at', new Date().toISOString());

    return new Response(JSON.stringify({ success: true, refreshedAt: new Date().toISOString() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    await notifyError('refresh-analytics', err);
    console.error('Unexpected error refreshing analytics:', err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
