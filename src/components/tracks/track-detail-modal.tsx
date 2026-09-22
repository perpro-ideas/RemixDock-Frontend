'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Track, Stem, DownloadResponse } from '@/types/tracks.types';
import { useAudioPlayer } from '@/context/audio-player-context';
import { useAuth } from '@/context/auth-context';
import { useCredits } from '@/hooks/use-credits';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  X,
  Disc3,
  Play,
  Pause,
  Layers,
  Music,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  Download,
} from 'lucide-react';

interface TrackDetailModalProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
}

const defaultStemStyle = {
  label: 'Elemento de Audio',
  className: 'bg-slate-100 text-slate-800 border-slate-200/60',
};

const stemTypeStyles: Record<string, { label: string; className: string }> = {
  DRUMS: { label: 'Batería y Percusión', className: 'bg-rose-50 text-rose-800 border-rose-200/60' },
  BASS: { label: 'Bajo y Sub', className: 'bg-amber-50 text-amber-800 border-amber-200/60' },
  SYNTH: { label: 'Sintetizadores', className: 'bg-indigo-50 text-indigo-800 border-indigo-200/60' },
  SYNTHS: { label: 'Sintetizadores', className: 'bg-indigo-50 text-indigo-800 border-indigo-200/60' },
  VOCALS: { label: 'Voces y Acapellas', className: 'bg-emerald-50 text-emerald-800 border-emerald-200/60' },
  INSTRUMENTS: { label: 'Instrumentos y Acústicos', className: 'bg-purple-50 text-purple-800 border-purple-200/60' },
  FX: { label: 'Efectos y Risers', className: 'bg-teal-50 text-teal-800 border-teal-200/60' },
  OTHER: { label: 'Otros Elementos', className: 'bg-slate-100 text-slate-800 border-slate-200/60' },
};

function formatDuration(sec?: number): string {
  if (typeof sec !== 'number' || isNaN(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TrackDetailModal({ track, isOpen, onClose }: TrackDetailModalProps) {
  const router = useRouter();
  const { currentTrack, isPlaying, togglePlay } = useAudioPlayer();
  const { isAuthenticated } = useAuth();
  const { refetch } = useCredits();

  const [detailedTrack, setDetailedTrack] = useState<Track | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadingStemId, setDownloadingStemId] = useState<string | null>(null);
  const [downloadFeedback, setDownloadFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    showPlansLink?: boolean;
  } | null>(null);

  // Helper para forzar descarga en el navegador mediante elemento <a> temporal
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

  // Carga dinámica de detalles de pista y stems desde GET /api/v1/tracks/:id
  useEffect(() => {
    let isMounted = true;
    setDownloadFeedback(null);
    setIsDownloading(false);
    setDownloadingStemId(null);

    if (isOpen && track?.id) {
      // Si el track ya contiene stems en memoria, los usamos directamente
      if (Array.isArray(track.stems) && track.stems.length > 0) {
        setDetailedTrack(track);
        setIsLoadingDetails(false);
        return;
      }

      // Si no tiene stems o vienen vacíos, consultar el endpoint de detalle
      setIsLoadingDetails(true);
      apiFetch<Track>(`/tracks/${track.id}`)
        .then((fullTrack) => {
          if (isMounted) {
            setDetailedTrack(fullTrack);
          }
        })
        .catch((err) => {
          console.error('Error al cargar stems de la pista:', err);
          if (isMounted) {
            setDetailedTrack(track);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoadingDetails(false);
          }
        });
    } else {
      setDetailedTrack(null);
      setIsLoadingDetails(false);
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, track]);

  // Bloquear scroll de fondo mientras el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Manejo de tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !track) {
    return null;
  }

  const activeTrack = detailedTrack || track;
  const isCurrentPlaying = currentTrack?.id === activeTrack.id && isPlaying;
  const stemsToDisplay: Stem[] = Array.isArray(activeTrack.stems) ? activeTrack.stems : [];

  // Descarga del master y stems completos (REM-106 / REM-113)
  const handleAcquireClick = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/catalog`);
      return;
    }

    setIsDownloading(true);
    setDownloadFeedback(null);

    try {
      const response = await apiFetch<DownloadResponse>(`/tracks/${activeTrack.id}/download`, {
        method: 'POST',
      });

      triggerBrowserDownload(
        response.downloadUrl,
        `${activeTrack.title} - ${activeTrack.artist} (Master & Stems).zip`
      );

      // Sincronizar el saldo reactivo de créditos
      await refetch();

      if (response.isRedownload) {
        setDownloadFeedback({
          type: 'info',
          message: 'Re-descarga autorizada. Tu descarga ha comenzado sin costo de créditos.',
        });
      } else {
        setDownloadFeedback({
          type: 'success',
          message: `¡Pista adquirida! Se han canjeado ${response.costCredits} créditos y la descarga ha comenzado.`,
        });
      }
    } catch (err) {
      if (
        err instanceof ApiClientError &&
        (err.statusCode === 400 || err.statusCode === 402 || err.message?.toLowerCase().includes('crédito'))
      ) {
        setDownloadFeedback({
          type: 'error',
          message: 'Saldo de créditos insuficiente para adquirir esta pista y sus stems.',
          showPlansLink: true,
        });
      } else {
        setDownloadFeedback({
          type: 'error',
          message: err instanceof Error ? err.message : 'Error al procesar la descarga de la pista.',
        });
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Descarga de stem individual
  const handleDownloadStem = async (stem: Stem) => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/catalog`);
      return;
    }

    setDownloadingStemId(stem.id);
    setDownloadFeedback(null);

    try {
      const response = await apiFetch<DownloadResponse>(`/stems/${stem.id}/download`, {
        method: 'POST',
      });

      triggerBrowserDownload(
        response.downloadUrl,
        `${activeTrack.title} - ${stem.name}.wav`
      );

      // Sincronizar el saldo reactivo de créditos
      await refetch();

      if (response.isRedownload) {
        setDownloadFeedback({
          type: 'info',
          message: `Re-descarga gratuita del stem "${stem.name}" iniciada sin costo.`,
        });
      } else {
        setDownloadFeedback({
          type: 'success',
          message: `Stem "${stem.name}" descargado con éxito (${response.costCredits} créditos).`,
        });
      }
    } catch (err) {
      if (
        err instanceof ApiClientError &&
        (err.statusCode === 400 || err.statusCode === 402 || err.message?.toLowerCase().includes('crédito'))
      ) {
        setDownloadFeedback({
          type: 'error',
          message: 'Saldo insuficiente para descargar este stem individual.',
          showPlansLink: true,
        });
      } else {
        setDownloadFeedback({
          type: 'error',
          message: err instanceof Error ? err.message : 'Error al procesar la descarga del stem.',
        });
      }
    } finally {
      setDownloadingStemId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="track-detail-modal-title"
      id="track-detail-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col my-auto"
        id="track-detail-modal-content"
      >
        {/* Encabezado del Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700">
              <FileAudio className="w-4 h-4" aria-hidden="true" />
            </div>
            <span className="font-bold text-sm text-slate-900 tracking-tight">
              Ficha Técnica de Estudio
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label="Cerrar detalles de la pista"
            id="close-track-detail-btn"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Cuerpo del Modal con Scroll Interno Seguro */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 min-h-0" id="track-detail-modal-body">
          {/* Ficha principal */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900 flex items-center justify-center text-emerald-400 shrink-0 shadow-md border border-slate-200/80">
              <Disc3 className="w-9 h-9 sm:w-11 sm:h-11" aria-hidden="true" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="track-detail-modal-title"
                  className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight"
                >
                  {activeTrack.title}
                </h2>
                {activeTrack.version && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                    {activeTrack.version}
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-600 font-medium mt-1">
                {activeTrack.artist} {activeTrack.remixer ? `(Remix: ${activeTrack.remixer})` : ''}
              </p>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
                  {activeTrack.bpm} BPM
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200/60">
                  Tonalidad: {activeTrack.musicalKey || activeTrack.key}
                </span>
                {activeTrack.genre?.name && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                    {activeTrack.genre.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Especificaciones Técnicas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
            <div className="p-2">
              <span className="text-[11px] font-medium text-slate-500 block">Formato Audio</span>
              <span className="text-xs font-bold text-slate-900 mt-0.5 block">WAV 24-bit</span>
            </div>
            <div className="p-2">
              <span className="text-[11px] font-medium text-slate-500 block">Frecuencia</span>
              <span className="text-xs font-bold text-slate-900 mt-0.5 block">44.1 kHz</span>
            </div>
            <div className="p-2">
              <span className="text-[11px] font-medium text-slate-500 block">Duración</span>
              <span className="text-xs font-bold text-slate-900 mt-0.5 block" id="modal-track-duration">
                {formatDuration(activeTrack.durationSeconds ?? activeTrack.duration)}
              </span>
            </div>
            <div className="p-2">
              <span className="text-[11px] font-medium text-slate-500 block">Costo Pista</span>
              <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
                {activeTrack.creditCost} {activeTrack.creditCost === 1 ? 'crédito' : 'créditos'}
              </span>
            </div>
          </div>

          {/* Desglose de Stems Incluidos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600" aria-hidden="true" />
                <span>
                  Stems Multipista Separados ({isLoadingDetails ? (activeTrack.stemsCount ?? '...') : stemsToDisplay.length})
                </span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">Archivos WAV individuales</span>
            </div>

            {isLoadingDetails ? (
              <div
                className="p-8 flex flex-col items-center justify-center border border-slate-200/80 rounded-xl bg-slate-50 text-slate-500 gap-2.5 shadow-sm"
                id="stems-loading-container"
              >
                <Disc3 className="w-6 h-6 animate-spin text-emerald-600" aria-hidden="true" />
                <p className="text-xs font-medium text-slate-600">Cargando stems individuales de estudio...</p>
              </div>
            ) : stemsToDisplay.length === 0 ? (
              <div
                className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-500"
                id="stems-list-container"
              >
                Esta pista no incluye stems individuales registrados actualmente.
              </div>
            ) : (
              <div
                className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-sm"
                id="stems-list-container"
              >
                {stemsToDisplay.map((stem) => {
                  const style = stemTypeStyles[stem.type] || defaultStemStyle;
                  return (
                    <div
                      key={stem.id}
                      className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200/60 flex items-center justify-center shrink-0 text-teal-700">
                          <Music className="w-3.5 h-3.5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">{stem.name}</p>
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-medium border mt-0.5 ${style.className}`}>
                            {style.label}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                          <span className="text-[11px] font-medium text-slate-600">Incluido</span>
                        </div>
                        <button
                          type="button"
                          id={`download-stem-btn-${stem.id}`}
                          onClick={() => handleDownloadStem(stem)}
                          disabled={downloadingStemId === stem.id}
                          className="inline-flex items-center justify-center p-2 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 min-h-[44px] min-w-[44px]"
                          title={`Descargar ${stem.name}`}
                          aria-label={`Descargar stem ${stem.name}`}
                        >
                          {downloadingStemId === stem.id ? (
                            <Disc3 className="w-4 h-4 animate-spin text-emerald-600" aria-hidden="true" />
                          ) : (
                            <Download className="w-4 h-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Banner de retroalimentación de descargas */}
          {downloadFeedback && (
            <div
              id="modal-download-alert"
              role="alert"
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                downloadFeedback.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : downloadFeedback.type === 'info'
                  ? 'bg-sky-50 border-sky-200 text-sky-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              {downloadFeedback.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" aria-hidden="true" />
              )}
              <div className="flex-1">
                <p className="font-medium">{downloadFeedback.message}</p>
                {downloadFeedback.showPlansLink && (
                  <div className="mt-2">
                    <Link
                      href="/pricing?tab=credits"
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      id="modal-go-to-plans-link"
                    >
                      Adquirir créditos en planes
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Acciones del Modal Fijas en el Pie */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/60 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => void togglePlay(activeTrack)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-colors min-h-[44px]"
            id="modal-preview-btn"
          >
            {isCurrentPlaying ? (
              <>
                <Pause className="w-4 h-4 text-slate-700 fill-current" aria-hidden="true" />
                <span>Pausar preview</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-slate-700 fill-current ml-0.5" aria-hidden="true" />
                <span>Reproducir preview</span>
              </>
            )}
          </button>

          <Button
            type="button"
            variant="primary"
            onClick={handleAcquireClick}
            disabled={isDownloading}
            className="min-h-[44px] gap-2"
            id="modal-acquire-btn"
          >
            {isDownloading ? (
              <>
                <Disc3 className="w-4 h-4 animate-spin text-white" aria-hidden="true" />
                <span>Descargando...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Descargar master y stems ({activeTrack.creditCost} cr.)</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
