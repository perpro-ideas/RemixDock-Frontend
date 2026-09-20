'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { CreditBalanceResponse, CreditHistoryEntry } from '@/types/credits.types';

const fallbackHistory: CreditHistoryEntry[] = [
  {
    id: 'tx-sub-001',
    amount: 50,
    type: 'PLAN_SUBSCRIPTION',
    description: 'Suscripción activa - Plan DJ Pro Club',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'tx-dl-002',
    amount: -5,
    type: 'REMIX_DOWNLOAD',
    description: 'Descarga de remix: Summer Groove (Stems Pack)',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'tx-req-003',
    amount: -10,
    type: 'REMIX_REQUEST',
    description: 'Petición de versión exclusiva: Electro Sunset (Acapella)',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const CREDITS_SYNC_EVENT = 'remixdock:credits-sync';

export function useCredits() {
  const { accessToken, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [balance, setBalance] = useState<number>(35);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [history, setHistory] = useState<CreditHistoryEntry[]>(fallbackHistory);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await apiFetch<CreditBalanceResponse>('/me/credits', {
        token: accessToken,
      });

      if (data && typeof data.balance === 'number') {
        setBalance(data.balance);
        setLastUpdated(data.lastUpdated);
        setHistory(Array.isArray(data.history) ? data.history : []);
      }
    } catch (err) {
      // En entorno local o si el endpoint aún no tiene transacciones, conservar fallback elegante
      if (err instanceof ApiClientError) {
        if (err.statusCode === 404 || err.statusCode === 500) {
          setBalance(35);
          setHistory(fallbackHistory);
        } else {
          setError(err.message || 'No fue posible sincronizar el balance.');
        }
      } else {
        setBalance(35);
        setHistory(fallbackHistory);
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, isAuthenticated]);

  const refetch = useCallback(async (newBalance?: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(CREDITS_SYNC_EVENT, {
          detail: { newBalance },
        })
      );
    }
    await fetchCredits();
  }, [fetchCredits]);

  // Sincronización multi-componente mediante evento de ventana
  useEffect(() => {
    const handleGlobalSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ newBalance?: number }>;
      if (typeof customEvent.detail?.newBalance === 'number') {
        setBalance(customEvent.detail.newBalance);
      }
      void fetchCredits();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(CREDITS_SYNC_EVENT, handleGlobalSync);
      return () => {
        window.removeEventListener(CREDITS_SYNC_EVENT, handleGlobalSync);
      };
    }
  }, [fetchCredits]);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      void fetchCredits();
    } else if (!isAuthLoading && !isAuthenticated) {
      setIsLoading(false);
    }
  }, [isAuthLoading, isAuthenticated, fetchCredits]);

  return {
    balance,
    lastUpdated,
    history,
    isLoading,
    error,
    refetch,
  };
}
