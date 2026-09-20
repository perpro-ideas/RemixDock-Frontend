import { Track, Stem } from './tracks.types';

export interface LibraryItem {
  id: string;
  userId: string;
  trackId: string | null;
  stemId: string | null;
  costCredits: number;
  downloadedAt: string;
  track?: Track | null;
  stem?: (Stem & { track?: Track }) | null;
}

export type LibraryFilterTab = 'all' | 'masters' | 'stems';
