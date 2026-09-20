export type CreditEntryType =
  | 'PLAN_SUBSCRIPTION'
  | 'TOPUP_PURCHASE'
  | 'REMIX_DOWNLOAD'
  | 'REMIX_REQUEST'
  | 'ADMIN_ADJUSTMENT';

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
