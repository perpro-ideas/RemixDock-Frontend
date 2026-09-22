'use client';

import React from 'react';
import Link from 'next/link';
import { Coins, Sparkles } from 'lucide-react';
import { useCredits } from '@/hooks/use-credits';

interface CreditsBadgeProps {
  className?: string;
  showIcon?: boolean;
}

export function CreditsBadge({ className = '', showIcon = true }: CreditsBadgeProps) {
  const { balance, isLoading } = useCredits();

  return (
    <Link
      href="/pricing?tab=credits"
      id="credits-badge-link"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 min-h-[44px] ${className}`}
      aria-label={`Saldo disponible: ${balance} créditos. Clic para ver planes y recargar.`}
      title="Saldo disponible de créditos - Ver packs de recarga"
    >
      {showIcon && (
        <Coins className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
      )}
      <span className="tabular-nums font-bold" id="credits-badge-balance">
        {isLoading ? '...' : balance}
      </span>
      <span className="text-emerald-700 font-medium hidden sm:inline" id="credits-badge-text">
        {balance === 1 ? 'crédito' : 'créditos'}
      </span>
      <Sparkles className="w-3 h-3 text-emerald-500/80 ml-0.5" aria-hidden="true" />
    </Link>
  );
}
