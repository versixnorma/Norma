import { withAdminAuth } from '@/lib/api-helpers';
import { normaFeedbackSchema } from '@/lib/schemas/norma-ai';
import { NextResponse } from 'next/server';

export const POST = withAdminAuth(async ({ admin }, request) => {
  const body = await request.json();
  const parsed = normaFeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { conversationId, userId, condominioId, rating, feedbackText } = parsed.data;

  const { data, error } = await admin
    // tabela ainda nao exposta no generated types
    .from('norma_training_logs' as never)
    .insert({
      session_id: conversationId || crypto.randomUUID(),
      operation_type: 'feedback',
      user_id: userId,
      condominio_id: condominioId || null,
      user_feedback: rating,
      feedback_text: feedbackText || null,
    } as never)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
});
