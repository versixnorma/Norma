import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient(await cookies());
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastSixMonths = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

  const [
    { count: totalPartners },
    { count: activeDiscounts },
    { count: monthlyTransactions },
    { data: transactionsData },
    { data: discountCategories },
  ] = await Promise.all([
    supabase.from('marketplace_partners').select('*', { count: 'exact', head: true }),
    supabase
      .from('marketplace_discounts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('marketplace_transactions')
      .select('*', { count: 'exact', head: true })
      .gte('transaction_date', startOfMonth),
    supabase
      .from('marketplace_transactions')
      .select('transaction_date, final_amount')
      .gte('transaction_date', lastSixMonths),
    supabase.from('marketplace_discounts').select(
      `
        id,
        partner:partner_id (category)
      `
    ),
  ]);

  type TransactionRow = { transaction_date: string | null; final_amount: string | number | null };

  const rows = (transactionsData || []) as TransactionRow[];

  const totalRevenue = rows.reduce((acc, item) => acc + Number(item.final_amount ?? 0), 0);

  const monthlyTrendMap = new Map<string, { transactions: number; revenue: number }>();
  rows.forEach((item) => {
    const date = new Date(item.transaction_date || '');
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const current = monthlyTrendMap.get(key) || { transactions: 0, revenue: 0 };
    current.transactions += 1;
    current.revenue += Number(item.final_amount ?? 0);
    monthlyTrendMap.set(key, current);
  });

  const monthlyTrend = Array.from(monthlyTrendMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, value]) => ({
      month: key,
      transactions: value.transactions,
      revenue: value.revenue,
    }));

  const categoryCount: Record<string, number> = {};
  ((discountCategories || []) as { partner?: { category?: string } }[]).forEach((row) => {
    const category = row.partner?.category || 'Outros';
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCount)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return NextResponse.json({
    data: {
      totalPartners: totalPartners || 0,
      activeDiscounts: activeDiscounts || 0,
      monthlyTransactions: monthlyTransactions || 0,
      totalRevenue,
      topCategories,
      monthlyTrend,
    },
  });
}
