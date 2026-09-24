import { Genre, Track } from './tracks.types';

export type FundingType = 'INCLUDED_IN_PLAN' | 'CREDITS_BOUNTY';

export type RemixRequestStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'ACCEPTED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export interface RemixRequest {
  id: string;
  userId: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
  title: string;
  artist: string;
  genreId: string;
  genre?: Genre;
  desiredBpm?: number | null;
  targetBpm?: number | null;
  referenceUrl?: string | null;
  notes?: string | null;
  fundingType: FundingType;
  bountyCredits?: number | null;
  status: RemixRequestStatus;
  assignedRemixerId?: string | null;
  assignedRemixer?: {
    id: string;
    username: string;
    email?: string;
  } | null;
  assignedAt?: string | null;
  rejectionReason?: string | null;
  completedTrackId?: string | null;
  completedTrack?: Track | null;
  trackId?: string | null;
  track?: (Track | { id: string; title: string; artist: string }) | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRemixRequestPayload {
  title: string;
  artist: string;
  genreId: string;
  desiredBpm?: number;
  targetBpm?: number;
  referenceUrl?: string;
  notes?: string;
  fundingType: FundingType;
  bountyCredits?: number;
}

export interface AssignRemixRequestPayload {
  remixerId?: string;
  notes?: string;
}

export interface RejectRemixRequestPayload {
  reason: string;
}

export interface CompleteRemixRequestPayload {
  trackId: string;
  notes?: string;
  isExclusive?: boolean;
  publishToCatalog?: boolean;
}

export interface PaginatedRemixRequestsResponse {
  items?: RemixRequest[];
  data?: RemixRequest[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export type RemixRequestsListResponse = RemixRequest[] | PaginatedRemixRequestsResponse;

export interface RemixRequestQuota {
  planName: string | null;
  hasSubscription: boolean;
  canRequestRemix: boolean;
  monthlyLimit: number;
  usedThisPeriod: number;
  remaining: number;
  periodEnd?: string;
  // Alias compatibles opcionales:
  available?: number;
  limit?: number;
  used?: number;
  totalMonthlyQuota?: number;
  usedQuota?: number;
  remainingQuota?: number;
  hasActiveSubscription?: boolean;
}

export const STATUS_LABELS: Record<RemixRequestStatus, { label: string; className: string; dotColor: string }> = {
  PENDING: {
    label: 'En Revisión',
    className: 'bg-blue-50 text-blue-700 border border-blue-200/80',
    dotColor: 'bg-blue-500',
  },
  IN_PROGRESS: {
    label: 'En Estudio',
    className: 'bg-amber-50 text-amber-700 border border-amber-200/80',
    dotColor: 'bg-amber-500',
  },
  ACCEPTED: {
    label: 'En Estudio',
    className: 'bg-amber-50 text-amber-700 border border-amber-200/80',
    dotColor: 'bg-amber-500',
  },
  COMPLETED: {
    label: 'Entregada',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    dotColor: 'bg-emerald-500',
  },
  REJECTED: {
    label: 'Rechazada',
    className: 'bg-red-50 text-red-700 border border-red-200/80',
    dotColor: 'bg-red-500',
  },
  CANCELLED: {
    label: 'Cancelada',
    className: 'bg-slate-100 text-slate-600 border border-slate-200/80',
    dotColor: 'bg-slate-400',
  },
};
