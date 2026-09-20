'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { CreditBalanceResponse, CreditHistoryEntry } from '@/types/credits.types';

const CREDITS_SYNC_EVENT = 'remixdock:credits-sync';

export function useCredits() {
  const { accessToken, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [balance, setBalance] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [history, setHistory] = useState<CreditHistoryEntry[]>([]);
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
      if (err instanceof ApiClientError) {
        setError(err.message || 'No fue posible sincronizar el balance.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('No fue posible sincronizar el balance de créditos.');
      }
      setBalance(0);
      setHistory([]);
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
