export type RemixerEarningType =
  | 'ROYALTY_DOWNLOAD'
  | 'REMIX_BOUNTY'
  | 'PAYOUT_DEDUCTION'
  | 'PAYOUT_REFUND'
  | 'PLATFORM_ADJUSTMENT';

export type PayoutStatus =
  | 'PENDING'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export type PayoutMethod = 'PAYPAL' | 'BANK_TRANSFER';

export interface RemixerEarning {
  id: string;
  remixerId: string;
  type: RemixerEarningType;
  amountCredits: number;
  amountUsd: number;
  description: string;
  trackId?: string | null;
  track?: {
    id: string;
    title: string;
    artist: string;
    remixer?: string;
  } | null;
  requestId?: string | null;
  request?: {
    id: string;
    title: string;
    artist: string;
  } | null;
  createdAt: string;
}

export interface PayoutRequest {
  id: string;
  remixerId: string;
  remixer?: {
    id: string;
    username: string;
    email: string;
  };
  amountCredits: number;
  amountUsd: number;
  method: PayoutMethod;
  destination: string;
  status: PayoutStatus;
  adminNotes?: string | null;
  adminFeedback?: string | null;
  createdAt: string;
  updatedAt: string;
  processedAt?: string | null;
}

export interface AssignedStudioRequest {
  id: string;
  title: string;
  artist: string;
  status: string;
  desiredBpm?: number;
  referenceUrl?: string;
  notes?: string;
  bountyCredits?: number;
  fundingType: 'INCLUDED_IN_PLAN' | 'CREDITS_BOUNTY';
  createdAt: string;
}

export interface StudioDashboardData {
  totalGenerated: number;
  availableBalance: number;
  inReviewPayouts: number;
  activeTracksCount: number;
  assignedRequestsCount: number;
  recentEarnings: RemixerEarning[];
  assignedRequests: AssignedStudioRequest[];
}

export interface CreatePayoutRequestPayload {
  amountCredits: number;
  method: PayoutMethod;
  destination: string;
  notes?: string;
}

export interface UpdatePayoutStatusPayload {
  status: PayoutStatus;
  adminFeedback?: string;
  internalNotes?: string;
}

export const EARNING_TYPE_LABELS: Record<RemixerEarningType, string> = {
  ROYALTY_DOWNLOAD: 'Regalía por Descarga',
  REMIX_BOUNTY: 'Recompensa de Encargo',
  PAYOUT_DEDUCTION: 'Retiro de Fondos',
  PAYOUT_REFUND: 'Reembolso por Retiro',
  PLATFORM_ADJUSTMENT: 'Ajuste de Cabina',
};

export const EARNING_TYPE_BADGES: Record<RemixerEarningType, string> = {
  ROYALTY_DOWNLOAD: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REMIX_BOUNTY: 'bg-amber-50 text-amber-700 border-amber-200',
  PAYOUT_DEDUCTION: 'bg-slate-100 text-slate-700 border-slate-200',
  PAYOUT_REFUND: 'bg-sky-50 text-sky-700 border-sky-200',
  PLATFORM_ADJUSTMENT: 'bg-purple-50 text-purple-700 border-purple-200',
};

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  PENDING: 'Pendiente',
  IN_REVIEW: 'En Revisión',
  APPROVED: 'Aprobado',
  PROCESSING: 'En Proceso',
  COMPLETED: 'Completado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
};

export const PAYOUT_STATUS_BADGES: Record<PayoutStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  IN_REVIEW: 'bg-blue-50 text-blue-700 border-blue-200',
  APPROVED: 'bg-teal-50 text-teal-700 border-teal-200',
  PROCESSING: 'bg-sky-50 text-sky-700 border-sky-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const PAYOUT_METHOD_LABELS: Record<PayoutMethod, string> = {
  PAYPAL: 'PayPal',
  BANK_TRANSFER: 'Transferencia Bancaria (IBAN)',
};
