// SPRINT 10: Notify Slack
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface SlackMessage {
  tipo: 'alerta' | 'info' | 'sucesso';
  titulo: string;
  mensagem: string;
  campos?: Array<{ titulo: string; valor: string }>;
}

serve(async (req) => {
  const webhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
  if (!webhookUrl) {
    return Response.json({ skipped: true, reason: 'Webhook não configurado' });
  }

  const message: SlackMessage = await req.json();
  
  const cores = { alerta: '#ef4444', info: '#3b82f6', sucesso: '#22c55e' };
  const emojis = { alerta: '🚨', info: 'ℹ️', sucesso: '✅' };

  const payload = {
    attachments: [{
      color: cores[message.tipo],
      blocks: [
        { type: 'header', text: { type: 'plain_text', text: `${emojis[message.tipo]} ${message.titulo}` } },
        { type: 'section', text: { type: 'mrkdwn', text: message.mensagem } },
        ...(message.campos ? [{
          type: 'section',
          fields: message.campos.map(c => ({ type: 'mrkdwn', text: `*${c.titulo}*\n${c.valor}` })),
        }] : []),
        { type: 'context', elements: [{ type: 'mrkdwn', text: `Versix Norma • ${new Date().toLocaleString('pt-BR')}` }] },
      ],
    }],
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return Response.json({ success: response.ok, status: response.status });
});
