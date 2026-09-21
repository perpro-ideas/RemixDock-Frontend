'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { TrackCard } from '@/components/tracks/track-card';
import { TrackFilters } from '@/components/tracks/track-filters';
import { TrackDetailModal } from '@/components/tracks/track-detail-modal';
import { Track, Genre, PaginatedTracksResponse } from '@/types/tracks.types';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { GlobalHeader } from '@/components/layout/global-header';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Disc3, Sparkles, Music } from 'lucide-react';

function CatalogContent() {

  const [genres, setGenres] = useState<Genre[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados de Filtros
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenreId, setSelectedGenreId] = useState<string | null>(null);
  const [selectedBpmPreset, setSelectedBpmPreset] = useState<string>('Todos');
  const [bpmRange, setBpmRange] = useState<{ min?: number; max?: number }>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Estado del Modal de Detalle
  const [selectedTrackForDetail, setSelectedTrackForDetail] = useState<Track | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Carga de géneros y pistas
  useEffect(() => {
    let isMounted = true;

    async function loadCatalogData() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const [genresData, tracksData] = await Promise.allSettled([
          apiFetch<Genre[]>('/genres'),
          apiFetch<PaginatedTracksResponse | Track[]>('/tracks'),
        ]);

        if (isMounted) {
          if (genresData.status === 'fulfilled') {
            setGenres(Array.isArray(genresData.value) ? genresData.value : []);
          } else {
            setGenres([]);
          }

          if (tracksData.status === 'fulfilled') {
            const res = tracksData.value;
            const trackList = Array.isArray(res)
              ? res
              : res && Array.isArray(res.items)
              ? res.items
              : [];
            setTracks(trackList);
          } else {
            const err = tracksData.reason;
            if (err instanceof ApiClientError) {
              setErrorMessage(err.message || 'No se pudieron cargar las pistas musicales.');
            } else if (err instanceof Error) {
              setErrorMessage(err.message);
            } else {
              setErrorMessage('No se pudo conectar con el catálogo musical.');
            }
            setTracks([]);
          }
        }
      } catch (err) {
        if (isMounted) {
          if (err instanceof Error) {
            setErrorMessage(err.message);
          } else {
            setErrorMessage('Error al cargar el catálogo de pistas.');
          }
          setGenres([]);
          setTracks([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCatalogData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectBpmPreset = (presetLabel: string, min?: number, max?: number) => {
    setSelectedBpmPreset(presetLabel);
    setBpmRange({ min, max });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedGenreId(null);
    setSelectedBpmPreset('Todos');
    setBpmRange({});
    setSelectedKey(null);
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      selectedGenreId !== null ||
      selectedBpmPreset !== 'Todos' ||
      selectedKey !== null
  );

  // Filtrado reactivo en cliente
  const filteredTracks = useMemo(() => {
    return tracks.filter((track) => {
      // 1. Filtro por búsqueda textual
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = track.title.toLowerCase().includes(query);
        const matchArtist = track.artist.toLowerCase().includes(query);
        const matchRemixer = track.remixer ? track.remixer.toLowerCase().includes(query) : false;
        if (!matchTitle && !matchArtist && !matchRemixer) {
          return false;
        }
      }

      // 2. Filtro por género
      if (selectedGenreId && track.genreId !== selectedGenreId) {
        return false;
      }

      // 3. Filtro por BPM
      if (bpmRange.min !== undefined && track.bpm < bpmRange.min) {
        return false;
      }
      if (bpmRange.max !== undefined && track.bpm > bpmRange.max) {
        return false;
      }

      // 4. Filtro por Clave Armónica
      if (selectedKey) {
        const trackKey = track.musicalKey || track.key;
        if (trackKey !== selectedKey) return false;
      }

      return true;
    });
  }, [tracks, searchQuery, selectedGenreId, bpmRange, selectedKey]);

  const handleViewDetails = (track: Track) => {
    setSelectedTrackForDetail(track);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900 pb-32 sm:pb-36">
      {/* Header Canónico Global */}
      <GlobalHeader />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {/* Breadcrumbs de Navegación */}
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Catálogo de Remixes' },
          ]}
        />
        {/* Encabezado del Catálogo */}
        <section className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            <span>Biblioteca Exclusiva para Cabina</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight" id="catalog-page-title">
            Catálogo Exclusivo para DJs
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            Explora remixes de club, preescucha en alta fidelidad y descarga stems multipista separados listos para tus mezclas.
          </p>
        </section>

        {errorMessage && (
          <div className="max-w-2xl mx-auto">
            <Alert variant="error">
              <AlertTitle>Catálogo de remixes</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Barra de Filtros DJ */}
        <TrackFilters
          genres={genres}
          selectedGenreId={selectedGenreId}
          onSelectGenre={setSelectedGenreId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedBpmPreset={selectedBpmPreset}
          onSelectBpmPreset={handleSelectBpmPreset}
          selectedKey={selectedKey}
          onSelectKey={setSelectedKey}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Barra de Conteo y Resultados */}
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500 font-medium px-1">
          <span id="catalog-results-count">
            Mostrando <strong className="text-slate-900">{filteredTracks.length}</strong> {filteredTracks.length === 1 ? 'pista disponible' : 'pistas disponibles'}
          </span>
          {hasActiveFilters && (
            <span className="text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
              Filtros activos
            </span>
          )}
        </div>

        {/* Listado de Pistas */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Disc3 className="w-6 h-6 animate-spin" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-slate-500">Cargando catálogo de pistas...</p>
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 max-w-lg mx-auto space-y-3" id="catalog-empty-state">
            <Music className="w-10 h-10 text-slate-400 mx-auto" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-900">
              {tracks.length === 0 ? 'No hay pistas disponibles en este momento' : 'No se encontraron pistas coincidentes'}
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              {tracks.length === 0
                ? 'El catálogo musical se actualizará próximamente con nuevos remixes y stems multipista.'
                : 'No hay remixes que coincidan con los criterios de búsqueda o filtros seleccionados.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                id="clear-filters-btn"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors min-h-[44px]"
              >
                Restablecer filtros
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3" id="catalog-tracklist">
            {filteredTracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modal de Detalle y Stems */}
      <TrackDetailModal
        track={selectedTrackForDetail}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Disc3 className="w-8 h-8 text-emerald-600 animate-spin" aria-hidden="true" />
        </div>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}
