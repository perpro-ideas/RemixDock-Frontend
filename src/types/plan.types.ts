export type PlanType = 'MONTHLY' | 'YEARLY' | 'CREDITS_PACK';

export interface Plan {
  id: string;
  name: string;
  description?: string;
  type: PlanType;
  price: number;
  durationDays?: number;
  creditsIncluded?: number;
  benefits: string[];
  canRequestRemix: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanPayload {
  name: string;
  description?: string;
  type: PlanType;
  price: number;
  durationDays?: number;
  creditsIncluded?: number;
  benefits: string[];
  canRequestRemix?: boolean;
  isActive?: boolean;
}

export interface UpdatePlanPayload {
  name?: string;
  description?: string;
  type?: PlanType;
  price?: number;
  durationDays?: number;
  creditsIncluded?: number;
  benefits?: string[];
  canRequestRemix?: boolean;
  isActive?: boolean;
}
