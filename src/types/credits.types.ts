export type CreditEntryType =
  | 'MEMBERSHIP'
  | 'PLAN_SUBSCRIPTION'
  | 'SUBSCRIPTION'
  | 'CREDIT_PACK'
  | 'PACK_PURCHASE'
  | 'TOPUP_PURCHASE'
  | 'TOPUP'
  | 'REMIX_DOWNLOAD'
  | 'REMIX_REQUEST'
  | 'REMIX_REQUEST_ESCROW'
  | 'REMIX_REQUEST_REFUND'
  | 'ROYALTY_DOWNLOAD'
  | 'REMIX_BOUNTY'
  | 'PAYOUT_DEDUCTION'
  | 'PAYOUT_REFUND'
  | 'SYSTEM_ADJUSTMENT'
  | 'ADMIN_ADJUSTMENT'
  | 'BONUS'
  | (string & {});

export interface CreditHistoryEntry {
  id: string;
  amount: number;
  type: CreditEntryType;
  description: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface CreditBalanceResponse {
  balance: number;
  lastUpdated: string | null;
  history: CreditHistoryEntry[];
}

export const CREDIT_ENTRY_LABELS: Record<string, string> = {
  MEMBERSHIP: 'Membresía',
  PLAN_SUBSCRIPTION: 'Membresía',
  SUBSCRIPTION: 'Membresía',
  CREDIT_PACK: 'Recarga de Créditos',
  PACK_PURCHASE: 'Recarga de Créditos',
  TOPUP_PURCHASE: 'Recarga de Créditos',
  TOPUP: 'Recarga de Créditos',
  REMIX_DOWNLOAD: 'Descarga de Música',
  REMIX_REQUEST: 'Petición Exclusiva',
  REMIX_REQUEST_ESCROW: 'Custodia de Remix',
  REMIX_REQUEST_REFUND: 'Reembolso de Encargo',
  ROYALTY_DOWNLOAD: 'Regalías por Descarga',
  REMIX_BOUNTY: 'Recompensa Bounty',
  PAYOUT_DEDUCTION: 'Retiro de Fondos',
  PAYOUT_REFUND: 'Devolución de Retiro',
  SYSTEM_ADJUSTMENT: 'Ajuste de Saldo',
  ADMIN_ADJUSTMENT: 'Ajuste de Saldo',
  BONUS: 'Bonificación',
};

export const CREDIT_ENTRY_BADGES: Record<string, string> = {
  MEMBERSHIP: 'bg-blue-50 text-blue-700 border-blue-200',
  PLAN_SUBSCRIPTION: 'bg-blue-50 text-blue-700 border-blue-200',
  SUBSCRIPTION: 'bg-blue-50 text-blue-700 border-blue-200',
  CREDIT_PACK: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PACK_PURCHASE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  TOPUP_PURCHASE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  TOPUP: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REMIX_DOWNLOAD: 'bg-slate-100 text-slate-700 border-slate-200',
  REMIX_REQUEST: 'bg-amber-50 text-amber-700 border-amber-200',
  REMIX_REQUEST_ESCROW: 'bg-amber-50 text-amber-700 border-amber-200',
  REMIX_REQUEST_REFUND: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ROYALTY_DOWNLOAD: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REMIX_BOUNTY: 'bg-amber-50 text-amber-700 border-amber-200',
  PAYOUT_DEDUCTION: 'bg-slate-100 text-slate-700 border-slate-200',
  PAYOUT_REFUND: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SYSTEM_ADJUSTMENT: 'bg-violet-50 text-violet-700 border-violet-200',
  ADMIN_ADJUSTMENT: 'bg-violet-50 text-violet-700 border-violet-200',
  BONUS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};
