'use client';

import React from 'react';
import { Genre, CAMELOT_KEYS, BPM_RANGE_PRESETS } from '@/types/tracks.types';
import { Search, X, RotateCcw, SlidersHorizontal } from 'lucide-react';

interface TrackFiltersProps {
  genres: Genre[];
  selectedGenreId: string | null;
  onSelectGenre: (genreId: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedBpmPreset: string;
  onSelectBpmPreset: (presetLabel: string, min?: number, max?: number) => void;
  selectedKey: string | null;
  onSelectKey: (key: string | null) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function TrackFilters({
  genres,
  selectedGenreId,
  onSelectGenre,
  searchQuery,
  onSearchChange,
  selectedBpmPreset,
  onSelectBpmPreset,
  selectedKey,
  onSelectKey,
  onClearFilters,
  hasActiveFilters,
}: TrackFiltersProps) {
  return (
    <div className="space-y-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm" id="catalog-filters-bar">
      {/* Search Bar & Reset */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por pista, artista o remixer..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all min-h-[44px]"
            id="track-search-input"
            aria-label="Buscar pistas por título, artista o remixer"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-md"
              aria-label="Borrar texto de búsqueda"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] shrink-0"
            id="clear-filters-btn"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>Restablecer filtros</span>
          </button>
        )}
      </div>

      {/* Genres Horizontal Scroll */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 tracking-tight">Géneros</span>
          <span className="text-[11px] text-slate-400">Desliza para explorar</span>
        </div>

        <div className="w-full overflow-x-auto no-scrollbar pb-1">
          <div className="inline-flex items-center gap-2 whitespace-nowrap" role="tablist" aria-label="Filtro de géneros musicales">
            <button
              type="button"
              onClick={() => onSelectGenre(null)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] shrink-0 ${
                selectedGenreId === null
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
              }`}
              id="genre-tab-all"
            >
              Todos los géneros
            </button>

            {genres.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => onSelectGenre(g.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] shrink-0 ${
                  selectedGenreId === g.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                }`}
                id={`genre-tab-${g.slug || g.id}`}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* BPM & Key Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
        {/* BPM Filter Presets */}
        <div className="space-y-1.5">
          <label htmlFor="bpm-preset-select" className="text-xs font-bold text-slate-700 tracking-tight flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
            <span>Rango de BPM</span>
          </label>

          <div className="w-full overflow-x-auto no-scrollbar pb-1">
            <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
              {BPM_RANGE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onSelectBpmPreset(preset.label, preset.min, preset.max)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] shrink-0 ${
                    selectedBpmPreset === preset.label
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                  }`}
                  id={`bpm-preset-${preset.label.replace(/[^a-zA-Z0-9]/g, '')}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Camelot Key Filter */}
        <div className="space-y-1.5">
          <label htmlFor="key-select" className="text-xs font-bold text-slate-700 tracking-tight block">
            Clave Armónica (Camelot)
          </label>

          <div className="flex items-center gap-2">
            <select
              id="key-select"
              value={selectedKey || ''}
              onChange={(e) => onSelectKey(e.target.value ? e.target.value : null)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all min-h-[44px]"
              aria-label="Filtrar por clave armónica Camelot"
            >
              <option value="">Todas las tonalidades</option>
              <optgroup label="Tonalidades Menores (A)">
                {CAMELOT_KEYS.filter((k) => k.endsWith('A')).map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Tonalidades Mayores (B)">
                {CAMELOT_KEYS.filter((k) => k.endsWith('B')).map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </optgroup>
            </select>

            {selectedKey && (
              <button
                type="button"
                onClick={() => onSelectKey(null)}
                className="px-2.5 py-2 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl min-h-[44px]"
                aria-label="Quitar filtro de tonalidad"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
