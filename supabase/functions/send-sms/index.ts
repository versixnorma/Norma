// SPRINT 0: Send SMS via Twilio
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface SMSMessage {
  to: string;
  body: string;
  from?: string;
}

serve(async (req) => {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!accountSid || !authToken) {
    return Response.json({ error: 'Twilio credentials not configured' }, { status: 500 });
  }

  const sms: SMSMessage = await req.json();

  const payload = new URLSearchParams({
    To: sms.to,
    From: sms.from || '+1234567890', // Replace with actual Twilio number
    Body: sms.body,
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload,
  });

  const result = await response.json();

  if (response.ok) {
    return Response.json({ success: true, sid: result.sid });
  } else {
    return Response.json({ error: result.error_message, status: response.status }, { status: response.status });
  }
});
