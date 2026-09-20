'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Track, Stem } from '@/types/tracks.types';
import { useAudioPlayer } from '@/context/audio-player-context';
import { useAuth } from '@/context/auth-context';
import { useCredits } from '@/hooks/use-credits';
import { Button } from '@/components/ui/button';
import {
  X,
  Disc3,
  Play,
  Pause,
  Layers,
  Music,
  CheckCircle2,
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
  VOCALS: { label: 'Voces y Acapellas', className: 'bg-emerald-50 text-emerald-800 border-emerald-200/60' },
  FX: { label: 'Efectos y Risers', className: 'bg-teal-50 text-teal-800 border-teal-200/60' },
  OTHER: { label: 'Otros Elementos', className: 'bg-slate-100 text-slate-800 border-slate-200/60' },
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TrackDetailModal({ track, isOpen, onClose }: TrackDetailModalProps) {
  const router = useRouter();
  const { currentTrack, isPlaying, togglePlay } = useAudioPlayer();
  const { isAuthenticated } = useAuth();
  const { balance } = useCredits();

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

  const isCurrentPlaying = currentTrack?.id === track.id && isPlaying;
  const stemsToDisplay: Stem[] = Array.isArray(track.stems) ? track.stems : [];

  const handleAcquireClick = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/catalog`);
      return;
    }

    if (balance < track.creditCost) {
      router.push('/plans');
      return;
    }

    // Si tiene balance, redirigir a catálogo con mensaje o proceder
    alert(`¡Pista desbloqueada con éxito! Has canjeado ${track.creditCost} crédito por el master y los stems.`);
    onClose();
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
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-70px)]" id="track-detail-modal-body">
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
                  {track.title}
                </h2>
                {track.version && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                    {track.version}
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-600 font-medium mt-1">
                {track.artist} {track.remixer ? `(Remix: ${track.remixer})` : ''}
              </p>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
                  {track.bpm} BPM
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200/60">
                  Tonalidad: {track.musicalKey || track.key}
                </span>
                {track.genre?.name && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                    {track.genre.name}
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
              <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                {formatDuration(track.duration)}
              </span>
            </div>
            <div className="p-2">
              <span className="text-[11px] font-medium text-slate-500 block">Costo Pista</span>
              <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
                {track.creditCost} {track.creditCost === 1 ? 'crédito' : 'créditos'}
              </span>
            </div>
          </div>

          {/* Desglose de Stems Incluidos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600" aria-hidden="true" />
                <span>Stems Multipista Separados ({stemsToDisplay.length})</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">Archivos WAV individuales</span>
            </div>

            {stemsToDisplay.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-500" id="stems-list-container">
                Esta pista no incluye stems individuales registrados actualmente.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-sm" id="stems-list-container">
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

                      <div className="shrink-0 flex items-center gap-1.5 text-xs text-slate-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                        <span className="text-[11px] font-medium text-slate-600 hidden sm:inline">Incluido</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Acciones del Modal */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => void togglePlay(track)}
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
              className="min-h-[44px] gap-2"
              id="modal-acquire-btn"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Descargar master y stems ({track.creditCost} cr.)</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
