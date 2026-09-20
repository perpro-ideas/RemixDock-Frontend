export type StemType =
  | 'DRUMS'
  | 'BASS'
  | 'SYNTH'
  | 'SYNTHS'
  | 'VOCALS'
  | 'INSTRUMENTS'
  | 'FX'
  | 'OTHER'
  | string;

export interface Genre {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Stem {
  id: string;
  trackId?: string;
  name: string;
  type: StemType;
  fileUrl?: string;
  waveformUrl?: string;
  sizeBytes?: number;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  remixer?: string;
  version?: string;
  genreId?: string;
  genre?: Genre;
  bpm: number;
  musicalKey?: string; // Propiedad estándar del backend ej: "8A", "4A", "11B"
  key?: string; // Alias de clave Camelot para compatibilidad
  durationSeconds?: number; // Duración en segundos retornada por el backend
  duration?: number; // Alias de duración para compatibilidad
  previewUrl: string;
  coverUrl?: string;
  creditCost: number;
  stemsCount?: number;
  stems?: Stem[];
  downloadsCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface PaginatedTracksResponse {
  items: Track[];
  total: number;
  page: number;
  totalPages: number;
}

export interface DownloadResponse {
  downloadUrl: string;
  costCredits: number;
  isRedownload: boolean;
  message: string;
}

export interface QueryTracksParams {
  query?: string;
  genreId?: string;
  minBpm?: number;
  maxBpm?: number;
  key?: string;
  page?: number;
  limit?: number;
}

export const CAMELOT_KEYS = [
  '1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B',
  '5A', '5B', '6A', '6B', '7A', '7B', '8A', '8B',
  '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B',
] as const;

export interface BpmRangePreset {
  label: string;
  min?: number;
  max?: number;
}

export const BPM_RANGE_PRESETS: BpmRangePreset[] = [
  { label: 'Todos' },
  { label: '115 - 122 BPM', min: 115, max: 122 },
  { label: '123 - 128 BPM', min: 123, max: 128 },
  { label: '129 - 134 BPM', min: 129, max: 134 },
  { label: '135+ BPM', min: 135, max: 180 },
];
