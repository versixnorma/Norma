// =====================================================
// SENTRY TUNNEL ENDPOINT
// Evita bloqueio por AdBlockers
// =====================================================

import { NextApiRequest, NextApiResponse } from 'next';

const SENTRY_HOST = 'o4510449042325504.ingest.us.sentry.io';
const SENTRY_PROJECT_ID = '4510613184905216';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apenas aceitar POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Configurar headers para o Sentry
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': req.headers['user-agent'] || 'versix-norma/1.0.0',
  };

  // Fazer request para o Sentry
  fetch(`https://${SENTRY_HOST}/api/${SENTRY_PROJECT_ID}/envelope/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(req.body),
  })
    .then(response => {
      res.status(response.status).json({ success: true });
    })
    .catch(error => {
      console.error('[Sentry Tunnel] Error:', error);
      res.status(500).json({ error: 'Failed to send to Sentry' });
    });
}

// Configuração para desabilitar body parser (Sentry usa formato envelope)
export const config = {
  api: {
    bodyParser: false,
  },
};
