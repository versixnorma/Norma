'use client';

import { getSupabaseClient } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import { useCallback, useMemo, useState } from 'react';
import type { Database } from '@/types/database';

type MarketplacePartnerRow = Database['public']['Tables']['marketplace_partners']['Row'];
type MarketplaceDiscountRow = Database['public']['Tables']['marketplace_discounts']['Row'];
type MarketplaceTransactionRow = Database['public']['Tables']['marketplace_transactions']['Row'];

export interface MarketplacePartner extends MarketplacePartnerRow {}
export interface MarketplaceDiscount extends MarketplaceDiscountRow {
  partner_name?: string | null;
  partner_category?: string | null;
}
export interface MarketplaceTransaction extends MarketplaceTransactionRow {
  partner_name?: string | null;
  discount_title?: string | null;
  usuario_nome?: string | null;
  condominio_nome?: string | null;
}

export interface MarketplaceMetrics {
  totalPartners: number;
  activeDiscounts: number;
  monthlyTransactions: number;
  totalRevenue: number;
  topCategories: Array<{ category: string; count: number }>;
  recentTransactions: MarketplaceTransaction[];
  monthlyTrend: Array<{ month: string; transactions: number; revenue: number }>;
}

export function useMarketplace() {
  const supabase = getSupabaseClient();
  const [partners, setPartners] = useState<MarketplacePartner[]>([]);
  const [discounts, setDiscounts] = useState<MarketplaceDiscount[]>([]);
  const [transactions, setTransactions] = useState<MarketplaceTransaction[]>([]);
  const [metrics, setMetrics] = useState<MarketplaceMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('marketplace_partners')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPartners((data || []) as MarketplacePartner[]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const createPartner = useCallback(
    async (payload: Database['public']['Tables']['marketplace_partners']['Insert']) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: insertError } = await supabase
          .from('marketplace_partners')
          .insert(payload)
          .select('*')
          .single();

        if (insertError) throw insertError;
        if (data) setPartners((prev) => [data as MarketplacePartner, ...prev]);
        return data as MarketplacePartner;
      } catch (err) {
        setError(getErrorMessage(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const updatePartner = useCallback(
    async (id: string, payload: Database['public']['Tables']['marketplace_partners']['Update']) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: updateError } = await supabase
          .from('marketplace_partners')
          .update(payload)
          .eq('id', id)
          .select('*')
          .single();

        if (updateError) throw updateError;
        if (data) {
          setPartners((prev) => prev.map((p) => (p.id === id ? (data as MarketplacePartner) : p)));
        }
        return data as MarketplacePartner;
      } catch (err) {
        setError(getErrorMessage(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const deletePartner = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const { error: deleteError } = await supabase
          .from('marketplace_partners')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;
        setPartners((prev) => prev.filter((p) => p.id !== id));
        return true;
      } catch (err) {
        setError(getErrorMessage(err));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('marketplace_discounts')
        .select(
          `
          *,
          partner:partner_id (
            id,
            name,
            category
          )
        `
        )
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formatted = (data || []).map((row: any) => ({
        ...(row as MarketplaceDiscountRow),
        partner_name: row.partner?.name || null,
        partner_category: row.partner?.category || null,
      }));

      setDiscounts(formatted);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const createDiscount = useCallback(
    async (payload: Database['public']['Tables']['marketplace_discounts']['Insert']) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: insertError } = await supabase
          .from('marketplace_discounts')
          .insert(payload)
          .select(
            `
            *,
            partner:partner_id (
              id,
              name,
              category
            )
          `
          )
          .single();

        if (insertError) throw insertError;
        if (data) {
          const formatted = {
            ...(data as MarketplaceDiscountRow),
            partner_name: (data as any).partner?.name || null,
            partner_category: (data as any).partner?.category || null,
          };
          setDiscounts((prev) => [formatted, ...prev]);
          return formatted as MarketplaceDiscount;
        }
        return null;
      } catch (err) {
        setError(getErrorMessage(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const updateDiscount = useCallback(
    async (id: string, payload: Database['public']['Tables']['marketplace_discounts']['Update']) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: updateError } = await supabase
          .from('marketplace_discounts')
          .update(payload)
          .eq('id', id)
          .select(
            `
            *,
            partner:partner_id (
              id,
              name,
              category
            )
          `
          )
          .single();

        if (updateError) throw updateError;
        if (data) {
          const formatted = {
            ...(data as MarketplaceDiscountRow),
            partner_name: (data as any).partner?.name || null,
            partner_category: (data as any).partner?.category || null,
          };
          setDiscounts((prev) => prev.map((d) => (d.id === id ? formatted : d)));
          return formatted as MarketplaceDiscount;
        }
        return null;
      } catch (err) {
        setError(getErrorMessage(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const deleteDiscount = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const { error: deleteError } = await supabase
          .from('marketplace_discounts')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;
        setDiscounts((prev) => prev.filter((d) => d.id !== id));
        return true;
      } catch (err) {
        setError(getErrorMessage(err));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('marketplace_transactions')
        .select(
          `
          *,
          partner:partner_id (name),
          discount:discount_id (title),
          condominio:condominio_id (nome),
          usuario:usuario_id (nome)
        `
        )
        .order('transaction_date', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      const formatted = (data || []).map((row: any) => ({
        ...(row as MarketplaceTransactionRow),
        partner_name: row.partner?.name || null,
        discount_title: row.discount?.title || null,
        condominio_nome: row.condominio?.nome || null,
        usuario_nome: row.usuario?.nome || null,
      }));

      setTransactions(formatted);
      return formatted;
    } catch (err) {
      setError(getErrorMessage(err));
      return [];
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastSixMonths = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

      const [
        { count: totalPartners },
        { count: activeDiscounts },
        { count: monthlyTransactions },
        { data: recentTransactionsData },
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
          .select(
            `
            *,
            partner:partner_id (name),
            discount:discount_id (title),
            condominio:condominio_id (nome),
            usuario:usuario_id (nome)
          `
          )
          .order('transaction_date', { ascending: false })
          .limit(5),
        supabase
          .from('marketplace_transactions')
          .select('transaction_date, final_amount')
          .gte('transaction_date', lastSixMonths),
        supabase
          .from('marketplace_discounts')
          .select(
            `
            id,
            partner:partner_id (category)
          `
          ),
      ]);

      const recentTransactions: MarketplaceTransaction[] = (recentTransactionsData || []).map(
        (row: any) => ({
          ...(row as MarketplaceTransactionRow),
          partner_name: row.partner?.name || null,
          discount_title: row.discount?.title || null,
          condominio_nome: row.condominio?.nome || null,
          usuario_nome: row.usuario?.nome || null,
        })
      );

      const totalRevenue = (transactionsData || []).reduce(
        (acc: number, item: any) => acc + (Number(item.final_amount) || 0),
        0
      );

      const monthlyTrendMap = new Map<string, { transactions: number; revenue: number }>();
      (transactionsData || []).forEach((item: any) => {
        const date = new Date(item.transaction_date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const current = monthlyTrendMap.get(key) || { transactions: 0, revenue: 0 };
        current.transactions += 1;
        current.revenue += Number(item.final_amount) || 0;
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
      (discountCategories || []).forEach((row: any) => {
        const category = row.partner?.category || 'Outros';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });
      const topCategories = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      setMetrics({
        totalPartners: totalPartners || 0,
        activeDiscounts: activeDiscounts || 0,
        monthlyTransactions: monthlyTransactions || 0,
        totalRevenue,
        topCategories,
        recentTransactions,
        monthlyTrend,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const derived = useMemo(
    () => ({
      hasPartners: partners.length > 0,
      hasDiscounts: discounts.length > 0,
      hasTransactions: transactions.length > 0,
    }),
    [partners.length, discounts.length, transactions.length]
  );

  return {
    partners,
    discounts,
    transactions,
    metrics,
    loading,
    error,
    derived,
    fetchPartners,
    createPartner,
    updatePartner,
    deletePartner,
    fetchDiscounts,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    fetchTransactions,
    fetchMetrics,
  };
}
