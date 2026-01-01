// SPRINT 0: Send Push Notification via Firebase Cloud Messaging
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface PushMessage {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  const fcmServerKey = Deno.env.get('FIREBASE_SERVER_KEY');
  if (!fcmServerKey) {
    return Response.json({ error: 'Firebase server key not configured' }, { status: 500 });
  }

  const push: PushMessage = await req.json();

  const payload = {
    to: push.token,
    notification: {
      title: push.title,
      body: push.body,
    },
    data: push.data || {},
  };

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${fcmServerKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (response.ok && result.success === 1) {
    return Response.json({ success: true, messageId: result.results[0].message_id });
  } else {
    return Response.json({
      error: result.results?.[0]?.error || 'Failed to send push notification',
      status: response.status
    }, { status: response.status });
  }
});
