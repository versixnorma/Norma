import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

interface DocRow {
  source_type: string;
}

interface FeedbackRow {
  user_feedback: number | null;
  response_time_ms: number | null;
  created_at: string;
}

interface ConversationRow {
  id: string;
  created_at: string;
}

export async function GET() {
  const supabase = createClient(await cookies());

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

  const [documentsRes, chunksRes, conversationsRes, trainingRes] = await Promise.all([
    supabase.from('documents').select('source_type, id', { count: 'exact' }),
    supabase.from('document_chunks').select('id', { count: 'exact' }),
    supabase
      .from('norma_chat_logs')
      .select('id, created_at', { count: 'exact' })
      .gte('created_at', thirtyDaysAgoISO),
    supabase
      .from('norma_training_logs' as any) // eslint-disable-line @typescript-eslint/no-explicit-any -- table not yet in generated types
      .select('user_feedback, response_time_ms, created_at')
      .not('user_feedback', 'is', null),
  ]);

  // Aggregate documents by source_type
  const documentsByType: Record<string, number> = {};
  ((documentsRes.data || []) as unknown as DocRow[]).forEach((doc) => {
    const st = doc.source_type || 'upload';
    documentsByType[st] = (documentsByType[st] || 0) + 1;
  });

  // Calculate feedback metrics
  const feedbackEntries = (trainingRes.data || []) as unknown as FeedbackRow[];
  const avgSatisfaction =
    feedbackEntries.length > 0
      ? feedbackEntries.reduce((sum, e) => sum + (e.user_feedback || 0), 0) / feedbackEntries.length
      : 0;

  // Calculate daily trend from conversations
  const conversationsByDay: Record<string, number> = {};
  ((conversationsRes.data || []) as unknown as ConversationRow[]).forEach((c) => {
    const day = c.created_at?.split('T')[0];
    if (day) conversationsByDay[day] = (conversationsByDay[day] || 0) + 1;
  });

  const dailyTrend = Object.entries(conversationsByDay)
    .map(([date, queries]) => ({ date, queries, avg_response_ms: 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    data: {
      totalDocuments: documentsRes.data?.length || 0,
      totalChunks: chunksRes.count || 0,
      documentsByType: Object.entries(documentsByType).map(([source_type, count]) => ({
        source_type,
        count,
      })),
      totalConversations: conversationsRes.count || 0,
      avgResponseTimeMs: 0,
      satisfactionScore: Math.round(avgSatisfaction * 10) / 10,
      activeUsers: 0,
      dailyTrend,
    },
  });
}
