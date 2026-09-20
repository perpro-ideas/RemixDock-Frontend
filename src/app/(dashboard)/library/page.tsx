'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useCredits } from '@/hooks/use-credits';
import { useAudioPlayer } from '@/context/audio-player-context';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { CreditsBadge } from '@/components/credits/credits-badge';
import { Button } from '@/components/ui/button';
import { LibraryItem, LibraryFilterTab } from '@/types/library.types';
import { DownloadResponse } from '@/types/tracks.types';
import {
  Disc3,
  Search,
  Download,
  Play,
  Pause,
  FolderHeart,
  Sparkles,
  Calendar,
  Layers,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Compass,
  ArrowLeft,
} from 'lucide-react';

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export default function UserLibraryPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { refetch: refetchCredits } = useCredits();
  const { currentTrack, isPlaying, togglePlay } = useAudioPlayer();

  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<LibraryFilterTab>('all');

  const [downloadingItemId, setDownloadingItemId] = useState<string | null>(null);
  const [downloadFeedback, setDownloadFeedback] = useState<{
    itemId: string;
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Recarga limpia manual (ejecutada también por el botón Sincronizar)
  const loadLibrary = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiFetch<LibraryItem[]>('/me/library', {
        token: token || undefined,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message || 'No se pudo cargar la biblioteca.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('No se pudo cargar la biblioteca.');
      }
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token]);

  // Carga inicial sincronizada con el ciclo de vida de autenticación (evita condición de carrera)
  useEffect(() => {
    // Si la sesión aún se está verificando o refrescando, esperar
    if (isAuthLoading) return;

    // Si terminó de cargar y no está autenticado, redirigir a login
    if (!isAuthenticated) {
      router.push('/login?redirect=/library');
      return;
    }

    let isMounted = true;
    async function loadLibraryData() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await apiFetch<LibraryItem[]>('/me/library', {
          token: token || undefined,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (isMounted) {
          setItems(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (isMounted) {
          if (err instanceof ApiClientError) {
            setError(err.message || 'No se pudo cargar la biblioteca.');
          } else if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('No se pudo cargar la biblioteca.');
          }
          setItems([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadLibraryData();

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, isAuthenticated, token, router]);

  // Disparador de descarga en el navegador mediante elemento <a>
  const triggerBrowserDownload = (downloadUrl: string, fileName?: string) => {
    if (typeof window === 'undefined') return;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    if (fileName) {
      link.download = fileName;
    } else {
      link.setAttribute('download', '');
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Re-descarga sin costo (0 créditos)
  const handleRedownload = async (item: LibraryItem) => {
    setDownloadingItemId(item.id);
    setDownloadFeedback(null);

    try {
      let downloadResponse: DownloadResponse;
      let targetFileName = 'remixdock-audio.wav';

      if (item.stemId) {
        // Re-descarga de stem
        downloadResponse = await apiFetch<DownloadResponse>(`/stems/${item.stemId}/download`, {
          method: 'POST',
          token: token || undefined,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const stemName = item.stem?.name || 'Stem';
        const trackTitle = item.stem?.track?.title || item.track?.title || 'Pista';
        targetFileName = `${trackTitle} - ${stemName}.wav`;
      } else if (item.trackId) {
        // Re-descarga de pista completa
        downloadResponse = await apiFetch<DownloadResponse>(`/tracks/${item.trackId}/download`, {
          method: 'POST',
          token: token || undefined,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const trackTitle = item.track?.title || 'Master & Stems';
        targetFileName = `${trackTitle}.zip`;
      } else {
        throw new Error('Identificador de archivo no disponible.');
      }

      triggerBrowserDownload(downloadResponse.downloadUrl, targetFileName);
      await refetchCredits();

      setDownloadFeedback({
        itemId: item.id,
        type: 'success',
        message: 'Re-descarga autorizada sin costo (0 créditos). La descarga ha comenzado en tu navegador.',
      });
    } catch (err) {
      setDownloadFeedback({
        itemId: item.id,
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al procesar la re-descarga.',
      });
    } finally {
      setDownloadingItemId(null);
    }
  };

  // Filtro reactivo por pestaña y por buscador textual
  const filteredItems = useMemo(() => {
    let result = items;

    // Filtro por pestaña
    if (activeTab === 'masters') {
      result = result.filter((item) => Boolean(item.trackId && !item.stemId));
    } else if (activeTab === 'stems') {
      result = result.filter((item) => Boolean(item.stemId));
    }

    // Filtro por búsqueda textual
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((item) => {
        const title = item.track?.title?.toLowerCase() || '';
        const artist = item.track?.artist?.toLowerCase() || '';
        const remixer = item.track?.remixer?.toLowerCase() || '';
        const stemName = item.stem?.name?.toLowerCase() || '';
        const genreName = item.track?.genre?.name?.toLowerCase() || '';
        return (
          title.includes(query) ||
          artist.includes(query) ||
          remixer.includes(query) ||
          stemName.includes(query) ||
          genreName.includes(query)
        );
      });
    }

    return result;
  }, [items, activeTab, searchQuery]);

  // Conteos de ítems para badges de tabs
  const counts = useMemo(() => {
    const mastersCount = items.filter((item) => Boolean(item.trackId && !item.stemId)).length;
    const stemsCount = items.filter((item) => Boolean(item.stemId)).length;
    return { all: items.length, masters: mastersCount, stems: stemsCount };
  }, [items]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Disc3 className="w-8 h-8 animate-spin text-emerald-600" aria-hidden="true" />
          <p className="text-xs font-medium text-slate-500">Cargando biblioteca...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      {/* Header Superior Flat SaaS */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm">
        <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          {/* Logo y breadcrumb de biblioteca */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-slate-900 hover:text-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg"
              id="library-dashboard-brand-link"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
                <Disc3 className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              </div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight hidden xs:inline">
                RemixDock
              </span>
            </Link>
            <span className="text-slate-300 font-normal">/</span>
            <span className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <FolderHeart className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span>Mi Biblioteca</span>
            </span>
          </div>

          {/* Acciones del Header */}
          <div className="flex items-center gap-2 sm:gap-3">
            <CreditsBadge />

            <Link
              href="/catalog"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
              id="nav-catalog-btn"
            >
              <Compass className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span className="hidden sm:inline">Explorar Catálogo</span>
              <span className="sm:hidden">Catálogo</span>
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl text-slate-700 hover:bg-slate-100 border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
              id="back-to-dashboard-btn"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span className="hidden sm:inline">Panel DJ</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* Encabezado Principal de Cabina */}
        <section className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            <span>Colección de Estudio y Cabina</span>
          </div>

          <h1
            className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight"
            id="library-page-title"
          >
            Mi Biblioteca Musical
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            {user?.username ? `Colección de ${user.username}. ` : ''}Accede a tus tracks adquiridos, stems y masters para re-descarga inmediata sin costo adicional.
          </p>
        </section>

        {/* Barra de Búsqueda y Pestañas de Filtro */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Buscador Rápido */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título, artista o stem..."
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm"
                id="library-search-input"
                aria-label="Buscar dentro de mi biblioteca"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
                  aria-label="Limpiar búsqueda"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Botón de Sincronización Manual */}
            <button
              type="button"
              onClick={() => void loadLibrary()}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] shrink-0 self-end md:self-auto"
              id="library-refresh-btn"
              title="Actualizar biblioteca"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>Sincronizar</span>
            </button>
          </div>

          {/* Pestañas de Filtro */}
          <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'all'}
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 min-h-[44px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                activeTab === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              id="tab-all"
            >
              <span>Todas las adquisiciones</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                  activeTab === 'all' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {counts.all}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'masters'}
              onClick={() => setActiveTab('masters')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 min-h-[44px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                activeTab === 'masters'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              id="tab-masters"
            >
              <span>Pistas completas (Masters)</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                  activeTab === 'masters' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {counts.masters}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'stems'}
              onClick={() => setActiveTab('stems')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 min-h-[44px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                activeTab === 'stems'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              id="tab-stems"
            >
              <span>Stems individuales</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                  activeTab === 'stems' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {counts.stems}
              </span>
            </button>
          </div>
        </section>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center gap-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" aria-hidden="true" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Listado de Adquisiciones */}
        {isLoading ? (
          <div className="p-12 rounded-2xl border border-slate-200 bg-white flex flex-col items-center justify-center gap-3 text-slate-500">
            <Disc3 className="w-7 h-7 animate-spin text-emerald-600" aria-hidden="true" />
            <p className="text-xs font-medium text-slate-600">Cargando pistas y stems adquiridos...</p>
          </div>
        ) : items.length === 0 ? (
          /* Estado Vacío de Biblioteca (Sin compras previas) */
          <div
            className="p-8 sm:p-14 rounded-2xl border border-slate-200/90 bg-white text-center space-y-4 shadow-sm"
            id="library-empty-state"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center mx-auto text-emerald-700 shadow-sm">
              <Disc3 className="w-8 h-8" aria-hidden="true" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h2 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">
                Tu biblioteca está vacía
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Aún no has adquirido pistas ni stems multipista. Explora nuestro catálogo musical exclusivo para DJs y descarga tus primeras producciones.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/catalog"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
                id="explore-catalog-btn"
              >
                <Compass className="w-4 h-4" aria-hidden="true" />
                <span>Explorar catálogo musical</span>
              </Link>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          /* Estado Vacío por Filtros */
          <div
            className="p-8 sm:p-12 rounded-2xl border border-dashed border-slate-200 bg-white text-center space-y-3"
            id="library-no-results-state"
          >
            <Search className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-800">
              No se encontraron elementos con el filtro aplicado
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Intenta con otra palabra clave o restablece los filtros para ver todo tu historial de descargas.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveTab('all');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          /* Cuadrícula o Filas de Adquisiciones */
          <div className="space-y-3 sm:space-y-4" id="library-items-container">
            {filteredItems.map((item) => {
              const isStem = Boolean(item.stemId);
              const parentTrack = item.track || item.stem?.track;
              const displayTitle = isStem
                ? item.stem?.name || 'Stem de Audio'
                : parentTrack?.title || 'Pista de Estudio';
              const displayArtist = parentTrack?.artist || 'Artista RemixDock';
              const displayBpm = parentTrack?.bpm;
              const displayKey = parentTrack?.musicalKey || parentTrack?.key;
              const displayGenre = parentTrack?.genre?.name;
              const isCurrentlyPlaying = currentTrack?.id === parentTrack?.id && isPlaying;

              const isItemDownloading = downloadingItemId === item.id;
              const feedback = downloadFeedback?.itemId === item.id ? downloadFeedback : null;

              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm hover:border-slate-300 transition-all space-y-3"
                  id={`library-item-${item.id}`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* Identificador visual y metadatos */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 border ${
                          isStem
                            ? 'bg-teal-50 border-teal-200 text-teal-700'
                            : 'bg-slate-900 border-slate-200/80 text-emerald-400 shadow-sm'
                        }`}
                      >
                        {isStem ? (
                          <Layers className="w-6 h-6" aria-hidden="true" />
                        ) : (
                          <Disc3 className="w-7 h-7" aria-hidden="true" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            className="text-sm sm:text-base font-bold text-slate-900 truncate"
                            id={`library-item-title-${item.id}`}
                          >
                            {displayTitle}
                          </h3>

                          {/* Badge de tipo de recurso */}
                          {isStem ? (
                            <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/70">
                              Stem WAV: {item.stem?.type || 'Elemento'}
                            </span>
                          ) : (
                            <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                              Master WAV + Stems
                            </span>
                          )}

                          {parentTrack?.version && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {parentTrack.version}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 font-medium">
                          {displayArtist} {parentTrack?.remixer ? `(Remix: ${parentTrack.remixer})` : ''}
                          {isStem && parentTrack ? ` • De la pista "${parentTrack.title}"` : ''}
                        </p>

                        {/* Badges Técnicos Flat SaaS */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          {displayBpm && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/70">
                              {displayBpm} BPM
                            </span>
                          )}

                          {displayKey && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200/70">
                              Clave: {displayKey}
                            </span>
                          )}

                          {displayGenre && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/70">
                              {displayGenre}
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 ml-1">
                            <Calendar className="w-3 h-3 text-slate-400" aria-hidden="true" />
                            <span>Adquirido el {formatDate(item.downloadedAt)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones de la pista */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto justify-end">
                      {parentTrack && (
                        <button
                          type="button"
                          onClick={() => void togglePlay(parentTrack)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
                          id={`play-btn-${item.id}`}
                          aria-label={`Reproducir preview de ${displayTitle}`}
                        >
                          {isCurrentlyPlaying ? (
                            <>
                              <Pause className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                              <span>Pausar</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" aria-hidden="true" />
                              <span>Escuchar</span>
                            </>
                          )}
                        </button>
                      )}

                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => handleRedownload(item)}
                        disabled={isItemDownloading}
                        className="gap-2 min-h-[44px] px-3.5 text-xs font-semibold"
                        id={`redownload-btn-${item.id}`}
                        aria-label={`Descargar de nuevo ${displayTitle}`}
                      >
                        {isItemDownloading ? (
                          <>
                            <Disc3 className="w-4 h-4 animate-spin text-white" aria-hidden="true" />
                            <span>Descargando...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" aria-hidden="true" />
                            <span>Descargar de nuevo</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Feedback de re-descarga inline */}
                  {feedback && (
                    <div
                      role="alert"
                      className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 animate-in fade-in duration-150 ${
                        feedback.type === 'error'
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                      id={`library-feedback-alert-${item.id}`}
                    >
                      {feedback.type === 'error' ? (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" aria-hidden="true" />
                      )}
                      <p className="font-medium flex-1">{feedback.message}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
