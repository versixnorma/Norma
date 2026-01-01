// SPRINT 0: Send Email via SendGrid
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

serve(async (req) => {
  const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
  if (!sendgridApiKey) {
    return Response.json({ error: 'SendGrid API key not configured' }, { status: 500 });
  }

  const email: EmailMessage = await req.json();

  const payload = {
    personalizations: [{
      to: [{ email: email.to }],
      subject: email.subject,
    }],
    from: { email: email.from || 'noreply@versixnorma.com' },
    content: [{ type: 'text/html', value: email.html }],
  };

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sendgridApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    // Update notificacoes_entregas status if needed
    // Assuming we have a way to update, but for now just return success
    return Response.json({ success: true });
  } else {
    return Response.json({ error: 'Failed to send email', status: response.status }, { status: response.status });
  }
});
