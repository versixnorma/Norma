import { useCallback, useRef, useState } from 'react';

export function usePurchase() {
  const [loading, setLoading] = useState(false);
  const inflightKeyRef = useRef<string | null>(null);

  const purchase = useCallback(async (discountId: string) => {
    // Guard: se já está em flight, retornar (mesmo idempotency key)
    if (inflightKeyRef.current) return;

    const idempotencyKey = crypto.randomUUID();
    inflightKeyRef.current = idempotencyKey;
    setLoading(true);

    try {
      const res = await fetch(`/api/marketplace/discounts/${discountId}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey }),
      });
      return await res.json();
    } finally {
      inflightKeyRef.current = null;
      setLoading(false);
    }
  }, []);

  return { purchase, loading };
}
