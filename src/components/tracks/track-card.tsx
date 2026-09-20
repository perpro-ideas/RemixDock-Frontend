'use client';

import React from 'react';
import { Track } from '@/types/tracks.types';
import { useAudioPlayer } from '@/context/audio-player-context';
import { Card } from '@/components/ui/card';
import {
  Play,
  Pause,
  Disc3,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

interface TrackCardProps {
  track: Track;
  onViewDetails: (track: Track) => void;
}

export function TrackCard({ track, onViewDetails }: TrackCardProps) {
  const { currentTrack, isPlaying, isLoadingAudio, togglePlay } = useAudioPlayer();

  const isCurrentPlaying = currentTrack?.id === track.id && isPlaying;
  const isCurrentLoading = currentTrack?.id === track.id && isLoadingAudio;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    void togglePlay(track);
  };

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails(track);
  };

  return (
    <Card
      className={`p-4 sm:p-5 transition-all duration-200 border-slate-200/80 hover:border-emerald-300/80 hover:shadow-md group ${
        isCurrentPlaying ? 'border-emerald-500/80 ring-2 ring-emerald-500/20 bg-emerald-50/10' : 'bg-white'
      }`}
      data-track-id={track.id}
      id={`track-card-${track.id}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Info y Reproducción */}
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 w-full sm:w-auto">
          {/* Cover & Play Button Overlay */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm overflow-hidden border border-slate-200/60 group/cover">
            <Disc3
              className={`w-8 h-8 sm:w-9 sm:h-9 text-slate-400 transition-transform duration-300 ${
                isCurrentPlaying ? 'animate-spin text-emerald-400' : 'group-hover/cover:rotate-45'
              }`}
              aria-hidden="true"
            />

            <button
              type="button"
              onClick={handlePlayClick}
              className={`absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity min-h-[44px] min-w-[44px] ${
                isCurrentPlaying ? 'opacity-100 text-white' : 'opacity-0 group-hover/cover:opacity-100 text-white'
              }`}
              aria-label={
                isCurrentPlaying
                  ? `Pausar preview de ${track.title}`
                  : `Reproducir preview de ${track.title}`
              }
              id={`play-track-btn-${track.id}`}
            >
              {isCurrentLoading ? (
                <Disc3 className="w-6 h-6 animate-spin text-white" aria-hidden="true" />
              ) : isCurrentPlaying ? (
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shadow-md">
                  <Pause className="w-4 h-4 fill-current text-white" aria-hidden="true" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shadow-md hover:scale-105 transition-transform">
                  <Play className="w-4 h-4 fill-current text-white ml-0.5" aria-hidden="true" />
                </div>
              )}
            </button>
          </div>

          {/* Text Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className="text-sm sm:text-base font-bold text-slate-900 truncate tracking-tight"
                title={track.title}
                id={`track-title-${track.id}`}
              >
                {track.title}
              </h3>
              {track.version && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 shrink-0">
                  {track.version}
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-600 truncate mt-0.5" title={track.artist}>
              {track.artist} {track.remixer ? `(Remix: ${track.remixer})` : ''}
            </p>

            {/* DJ Tags */}
            <div className="flex items-center gap-1.5 sm:gap-2 mt-2 flex-wrap">
              {track.genre?.name && (
                <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                  {track.genre.name}
                </span>
              )}
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60"
                id={`track-bpm-${track.id}`}
              >
                {track.bpm} BPM
              </span>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200/60"
                id={`track-key-${track.id}`}
              >
                {track.musicalKey || track.key}
              </span>
              {track.stemsCount ? (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200/60"
                  id={`track-stems-${track.id}`}
                >
                  <Layers className="w-3 h-3 text-teal-600" aria-hidden="true" />
                  <span>{track.stemsCount} stems</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Acciones (Derecha / Abajo en móvil) */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              <span>{track.creditCost} {track.creditCost === 1 ? 'crédito' : 'créditos'}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDetailsClick}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
              aria-label={`Ver ficha técnica y stems de ${track.title}`}
              id={`view-stems-btn-${track.id}`}
            >
              <Info className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              <span>Ver stems</span>
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
