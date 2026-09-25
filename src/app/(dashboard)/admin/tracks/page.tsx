'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { Track, Genre, PaginatedTracksResponse } from '@/types/tracks.types';
import { TrackAdminModal } from '@/components/admin/track-admin-modal';
import { GlobalHeader } from '@/components/layout/global-header';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import {
  Disc3,
  Plus,
  Shield,
  Search,
  ToggleLeft,
  ToggleRight,
  Layers,
  Edit3,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function AdminTracksPage() {
  const router = useRouter();
  const { user, token, accessToken, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const activeToken = token || accessToken;

  // Estados de datos
  const [tracks, setTracks] = useState<Track[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTogglingId, setIsTogglingId] = useState<string | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenreId, setSelectedGenreId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Modal de Creación / Edición
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [trackToEdit, setTrackToEdit] = useState<Track | null>(null);
  const [isLoadingDetailId, setIsLoadingDetailId] = useState<string | null>(null);

  // 1. Cargar pistas administrativas
  const loadAdminTracks = useCallback(async () => {
    try {
      setIsLoadingTracks(true);
      setErrorMessage(null);
      const data = await apiFetch<PaginatedTracksResponse | Track[]>('/admin/tracks', {
        token: activeToken || undefined,
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });

      const trackList = Array.isArray(data) ? data : data?.items || [];
      setTracks(trackList);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message || 'No fue posible cargar el catálogo de tracks.');
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('No se pudo conectar con el catálogo administrativo de tracks.');
      }
      setTracks([]);
    } finally {
      setIsLoadingTracks(false);
    }
  }, [activeToken]);

  // 2. Cargar catálogo de géneros
  const loadGenres = useCallback(async () => {
    try {
      const data = await apiFetch<Genre[]>('/genres');
      setGenres(Array.isArray(data) ? data : []);
    } catch {
      setGenres([]);
    }
  }, []);

  // 3. Efecto inicial sincronizado con el estado de autenticación y rol
  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated) {
      router.push('/login?redirect=/admin/tracks');
      return;
    }

    if (user?.role === 'ADMIN') {
      void loadAdminTracks();
      void loadGenres();
    }
  }, [isAuthLoading, isAuthenticated, user?.role, router, loadAdminTracks, loadGenres]);

  // 4. Filtrado de pistas en memoria (Hooks de React antes de retornos tempranos)
  const filteredTracks = useMemo(() => {
    let result = tracks;

    // Filtro por estado
    if (statusFilter === 'published') {
      result = result.filter((t) => t.isPublished === true);
    } else if (statusFilter === 'draft') {
      result = result.filter((t) => t.isPublished === false);
    }

    // Filtro por género
    if (selectedGenreId !== 'all') {
      result = result.filter(
        (t) => t.genreId === selectedGenreId || t.genre?.id === selectedGenreId
      );
    }

    // Filtro por búsqueda textual
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((t) => {
        const title = t.title?.toLowerCase() || '';
        const artist = t.artist?.toLowerCase() || '';
        const remixer = t.remixer?.toLowerCase() || '';
        const version = t.version?.toLowerCase() || '';
        return (
          title.includes(query) ||
          artist.includes(query) ||
          remixer.includes(query) ||
          version.includes(query)
        );
      });
    }

    return result;
  }, [tracks, statusFilter, selectedGenreId, searchQuery]);

  // Conteos para tabs
  const counts = useMemo(() => {
    const published = tracks.filter((t) => t.isPublished === true).length;
    const drafts = tracks.filter((t) => t.isPublished === false).length;
    return { all: tracks.length, published, drafts };
  }, [tracks]);

  // Si está autenticado pero no es administrador: pantalla de Acceso Restringido
  if (!isAuthLoading && (!isAuthenticated || user?.role !== 'ADMIN')) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 selection:bg-emerald-100 selection:text-emerald-900">
        <Card className="max-w-md w-full text-center p-2" id="admin-unauthorized-card">
          <CardHeader className="space-y-3 items-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Shield className="w-6 h-6" aria-hidden="true" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">
              Acceso Restringido
            </CardTitle>
            <CardDescription className="text-sm text-slate-600">
              Esta sección está reservada exclusivamente para administradores de RemixDock. Tu cuenta actual no cuenta con los permisos requeridos.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Link href="/dashboard" className="w-full inline-block">
              <Button variant="primary" className="w-full min-h-[44px]">
                Volver a mi estudio
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 5. Manejo de alternancia rápido de publicación (PATCH /api/v1/admin/tracks/:id)
  const handleTogglePublished = async (track: Track) => {
    try {
      setIsTogglingId(track.id);
      setStatusMessage(null);
      setErrorMessage(null);

      const nextState = !track.isPublished;

      await apiFetch<Track>(`/admin/tracks/${track.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublished: nextState }),
        token: activeToken || undefined,
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });

      setTracks((prev) =>
        prev.map((t) => (t.id === track.id ? { ...t, isPublished: nextState } : t))
      );

      setStatusMessage(
        nextState
          ? `La pista "${track.title}" ahora está publicada en el catálogo musical.`
          : `La pista "${track.title}" ha sido cambiada a borrador y no es visible para los DJs.`
      );
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message || 'No fue posible cambiar el estado de publicación.');
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Error al comunicar los cambios al servidor.');
      }
    } finally {
      setIsTogglingId(null);
    }
  };

  // 6. Abrir modal para crear
  const handleOpenCreateModal = () => {
    setTrackToEdit(null);
    setIsModalOpen(true);
  };

  // 7. Abrir modal para editar (con fetch de stems si no vinieran en el listado resumido)
  const handleOpenEditModal = async (track: Track) => {
    setIsLoadingDetailId(track.id);
    setErrorMessage(null);

    try {
      let fullTrack = track;
      // Si el track no tiene stems pero tiene stemsCount > 0, cargar detalle
      if (!track.stems || track.stems.length === 0) {
        try {
          const detail = await apiFetch<Track>(`/tracks/${track.id}`, {
            token: activeToken || undefined,
            headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
          });
          if (detail && detail.id) {
            fullTrack = { ...track, stems: detail.stems || [] };
          }
        } catch {
          // Si falla la consulta de detalle, continuar con el track actual
        }
      }

      setTrackToEdit(fullTrack);
      setIsModalOpen(true);
    } finally {
      setIsLoadingDetailId(null);
    }
  };

  // 8. Callback de éxito del modal
  const handleModalSuccess = (savedTrack: Track, isNew: boolean) => {
    if (isNew) {
      setTracks((prev) => [savedTrack, ...prev]);
      setStatusMessage(`La pista "${savedTrack.title}" fue creada exitosamente.`);
    } else {
      setTracks((prev) =>
        prev.map((t) => (t.id === savedTrack.id ? { ...t, ...savedTrack } : t))
      );
      setStatusMessage(`La pista "${savedTrack.title}" fue actualizada exitosamente.`);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Disc3 className="w-8 h-8 animate-spin text-emerald-600" aria-hidden="true" />
          <p className="text-xs font-medium text-slate-500">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      {/* Header Canónico Global */}
      <GlobalHeader />

      {/* Contenedor Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {/* Breadcrumbs de Navegación */}
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/dashboard' },
            { label: 'Administración' },
            { label: 'Tracks y Stems' },
          ]}
        />
        {/* Encabezado Principal y Botón de Creación */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1
                className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
                id="admin-tracks-page-title"
              >
                Gestión de Tracks y Stems
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Modo Administrador</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
              Sube nuevos masters, configura stems multipista y controla la visibilidad en el catálogo musical de RemixDock.
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={handleOpenCreateModal}
            className="gap-2 min-h-[44px] px-4 self-start sm:self-auto shrink-0 shadow-sm"
            id="create-track-btn"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>+ Nuevo Track</span>
          </Button>
        </section>

        {/* Notificaciones de Estado y Errores */}
        {statusMessage && (
          <Alert variant="success" id="admin-status-alert">
            <div className="flex-1">
              <AlertTitle>Operación completada</AlertTitle>
              <AlertDescription>{statusMessage}</AlertDescription>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold ml-2"
            >
              Cerrar
            </button>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="error" id="admin-error-alert">
            <div className="flex-1">
              <AlertTitle>Atención requerida</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-700 hover:text-rose-900 text-xs font-semibold ml-2"
            >
              Cerrar
            </button>
          </Alert>
        )}

        {/* Sección de Filtros y Búsqueda */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-4 shadow-sm">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Buscador de pistas */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título, artista o remixer..."
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white transition-colors duration-150 shadow-sm"
                id="admin-track-search"
                aria-label="Buscar tracks en el catálogo administrativo"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Selector de Género y Botón Sincronizar */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                <span className="font-medium hidden sm:inline">Género:</span>
              </div>
              <select
                id="admin-track-genre-filter"
                value={selectedGenreId}
                onChange={(e) => setSelectedGenreId(e.target.value)}
                className="h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              >
                <option value="all">Todos los géneros</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => void loadAdminTracks()}
                disabled={isLoadingTracks}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
                id="admin-refresh-tracks-btn"
                title="Actualizar catálogo de tracks"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoadingTracks ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span className="hidden sm:inline">Sincronizar</span>
              </button>
            </div>
          </div>

          {/* Pestañas de Filtro por Estado */}
          <div className="flex items-center gap-2 border-t border-slate-100 pt-3 overflow-x-auto" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 min-h-[44px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                statusFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              id="tab-status-all"
            >
              <span>Todos los tracks</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                  statusFilter === 'all' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {counts.all}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'published'}
              onClick={() => setStatusFilter('published')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 min-h-[44px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                statusFilter === 'published'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              id="tab-status-published"
            >
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Publicados</span>
              </span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                  statusFilter === 'published' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {counts.published}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'draft'}
              onClick={() => setStatusFilter('draft')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 min-h-[44px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                statusFilter === 'draft'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              id="tab-status-draft"
            >
              <span className="flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Borradores</span>
              </span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                  statusFilter === 'draft' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {counts.drafts}
              </span>
            </button>
          </div>
        </section>

        {/* Tabla Administrativa de Tracks */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {isLoadingTracks ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Disc3 className="w-7 h-7 animate-spin text-emerald-600" aria-hidden="true" />
              <p className="text-xs font-medium text-slate-600">Cargando catálogo de tracks...</p>
            </div>
          ) : tracks.length === 0 ? (
            <div className="p-12 text-center space-y-3" id="admin-tracks-empty-state">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
                <Disc3 className="w-7 h-7" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No hay pistas registradas en el catálogo</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Comienza agregando los primeros masters de audio y stems multipista para tus DJs.
              </p>
              <Button
                type="button"
                variant="primary"
                onClick={handleOpenCreateModal}
                className="gap-2 min-h-[44px] text-xs font-semibold px-4"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>+ Crear primer track</span>
              </Button>
            </div>
          ) : filteredTracks.length === 0 ? (
            <div className="p-12 text-center space-y-3" id="admin-tracks-no-results">
              <Search className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-800">
                No se encontraron pistas con el filtro aplicado
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Modifica el criterio de búsqueda o restablece los filtros para ver todo el catálogo.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGenreId('all');
                  setStatusFilter('all');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200"
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="admin-tracks-table">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Track & Artista</th>
                    <th className="py-3.5 px-4">Género</th>
                    <th className="py-3.5 px-4">BPM & Tono</th>
                    <th className="py-3.5 px-4">Stems</th>
                    <th className="py-3.5 px-4">Créditos</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 text-xs">
                  {filteredTracks.map((track) => {
                    const isPublished = track.isPublished ?? true;
                    const isToggling = isTogglingId === track.id;
                    const isLoadingDetail = isLoadingDetailId === track.id;
                    const stemsCount = track.stemsCount ?? track.stems?.length ?? 0;
                    const displayKey = track.musicalKey || track.key || '8A';

                    return (
                      <tr
                        key={track.id}
                        className="hover:bg-slate-50/80 transition-colors"
                        id={`admin-track-row-${track.id}`}
                      >
                        {/* Portada + Título / Artista / Versión */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-200/80 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm overflow-hidden">
                              {track.coverUrl || track.coverImageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={track.coverUrl || track.coverImageUrl}
                                  alt={track.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Disc3 className="w-5 h-5" aria-hidden="true" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <span
                                className="font-bold text-slate-900 block truncate"
                                id={`track-title-${track.id}`}
                              >
                                {track.title}
                              </span>
                              <span className="text-[11px] text-slate-500 block truncate">
                                {track.artist} {track.remixer ? `• Remix: ${track.remixer}` : ''}
                              </span>
                              {track.version && (
                                <span className="inline-block text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded mt-0.5">
                                  {track.version}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Género */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/70">
                            {track.genre?.name || 'Electrónica'}
                          </span>
                        </td>

                        {/* BPM y Clave Camelot */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                              {track.bpm} BPM
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200/80">
                              {displayKey}
                            </span>
                          </div>
                        </td>

                        {/* Stems */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200/80">
                            <Layers className="w-3 h-3 text-teal-600" aria-hidden="true" />
                            <span>{stemsCount} stems</span>
                          </span>
                        </td>

                        {/* Costo en Créditos */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-700 text-xs">
                            {track.creditCost} {track.creditCost === 1 ? 'crédito' : 'créditos'}
                          </span>
                        </td>

                        {/* Estado: Publicado o Borrador */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isPublished ? (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                              id={`badge-status-${track.id}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
                              <span>Publicado</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                              id={`badge-status-${track.id}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                              <span>Borrador</span>
                            </span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {/* Toggle Publicación Rápido */}
                            <button
                              type="button"
                              onClick={() => handleTogglePublished(track)}
                              disabled={isToggling}
                              className={`p-2 rounded-xl border transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                                isPublished
                                  ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                                  : 'text-slate-500 bg-slate-100 hover:bg-slate-200 border-slate-200'
                              }`}
                              id={`toggle-publish-btn-${track.id}`}
                              title={isPublished ? 'Despublicar (pasar a borrador)' : 'Publicar en el catálogo'}
                              aria-label={isPublished ? `Despublicar ${track.title}` : `Publicar ${track.title}`}
                            >
                              {isToggling ? (
                                <Disc3 className="w-4 h-4 animate-spin" aria-hidden="true" />
                              ) : isPublished ? (
                                <ToggleRight className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-slate-400" aria-hidden="true" />
                              )}
                            </button>

                            {/* Botón Editar */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(track)}
                              disabled={isLoadingDetail}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
                              id={`edit-track-btn-${track.id}`}
                              aria-label={`Editar track ${track.title}`}
                            >
                              {isLoadingDetail ? (
                                <Disc3 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                              ) : (
                                <Edit3 className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                              )}
                              <span>Editar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Modal de Creación / Edición */}
      <TrackAdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        trackToEdit={trackToEdit}
        genres={genres}
        token={activeToken}
      />
    </div>
  );
}
