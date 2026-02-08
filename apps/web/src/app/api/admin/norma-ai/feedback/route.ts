import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient(await cookies());
  const { conversationId, userId, condominioId, rating, feedbackText } = await request.json();

  if (!userId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating (1-5) e userId são obrigatórios' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('norma_training_logs' as any)
    .insert({
      session_id: conversationId || crypto.randomUUID(),
      operation_type: 'feedback',
      user_id: userId,
      condominio_id: condominioId || null,
      user_feedback: rating,
      feedback_text: feedbackText || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}
