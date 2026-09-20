'use client';

import React from 'react';
import { useAudioPlayer } from '@/context/audio-player-context';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  X,
  Disc3,
  Sparkles,
  Layers,
  RotateCcw,
  RotateCw,
} from 'lucide-react';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayerDock() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isLoadingAudio,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    stop,
  } = useAudioPlayer();

  if (!currentTrack) {
    return null;
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetSeconds = parseFloat(e.target.value);
    seek(targetSeconds);
  };

  const handleSkipBack = () => {
    seek(Math.max(0, currentTime - 10));
  };

  const handleSkipForward = () => {
    seek(Math.min(duration, currentTime + 10));
  };

  return (
    <aside
      aria-label="Reproductor de audio"
      id="audio-player-dock"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom"
    >
      {/* Barra de progreso táctil superior para móvil */}
      <div className="relative w-full h-1.5 bg-slate-100 cursor-pointer group">
        <div
          className="h-full bg-emerald-600 transition-all duration-100"
          style={{ width: `${progressPercent}%` }}
        />
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.5}
          value={currentTime}
          onChange={handleProgressChange}
          aria-label="Barra de desplazamiento de audio"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Track Info (Izquierda) */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 max-w-[45%] sm:max-w-[30%]">
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-900 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm overflow-hidden border border-slate-200/60">
              <Disc3
                className={`w-6 h-6 sm:w-7 sm:h-7 ${isPlaying ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  id="dock-track-title"
                  className="text-xs sm:text-sm font-bold text-slate-900 truncate block tracking-tight"
                  title={currentTrack.title}
                >
                  {currentTrack.title}
                </span>
                {currentTrack.version && (
                  <span className="hidden md:inline-block text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 whitespace-nowrap">
                    {currentTrack.version}
                  </span>
                )}
              </div>
              <p
                id="dock-track-artist"
                className="text-[11px] sm:text-xs text-slate-600 truncate mt-0.5"
                title={currentTrack.artist}
              >
                {currentTrack.artist}
              </p>

              <div className="flex items-center gap-1.5 mt-1">
                <span
                  id="dock-track-bpm"
                  className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60"
                >
                  {currentTrack.bpm} BPM
                </span>
                <span
                  id="dock-track-key"
                  className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200/60"
                >
                  {currentTrack.musicalKey || currentTrack.key}
                </span>
              </div>
            </div>
          </div>

          {/* Central Controls & Timeline (Centro) */}
          <div className="flex-1 max-w-lg flex flex-col items-center justify-center">
            {/* Controles de reproducción */}
            <div className="flex items-center gap-1 sm:gap-3">
              <button
                type="button"
                onClick={handleSkipBack}
                className="hidden xs:inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                aria-label="Retroceder 10 segundos"
                title="Retroceder 10s"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => void togglePlay()}
                disabled={isLoadingAudio}
                id="dock-play-pause-btn"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 min-h-[44px] min-w-[44px]"
                aria-label={isPlaying ? 'Pausar reproducción' : 'Iniciar reproducción'}
              >
                {isLoadingAudio ? (
                  <Disc3 className="w-5 h-5 animate-spin" aria-hidden="true" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" aria-hidden="true" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={handleSkipForward}
                className="hidden xs:inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                aria-label="Avanzar 10 segundos"
                title="Avanzar 10s"
              >
                <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {/* Barra de progreso de escritorio */}
            <div className="hidden sm:flex items-center gap-2.5 w-full mt-1">
              <span className="text-[11px] font-mono font-medium text-slate-500 w-9 text-right" id="dock-current-time">
                {formatTime(currentTime)}
              </span>

              <div className="relative flex-1 flex items-center">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.5}
                  value={currentTime}
                  onChange={handleProgressChange}
                  aria-label="Progreso de audio"
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                />
              </div>

              <span className="text-[11px] font-mono font-medium text-slate-500 w-9" id="dock-duration-time">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Right Actions: Stems, Volume, Dismiss (Derecha) */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Stems count pill */}
            {currentTrack.stemsCount ? (
              <span
                id="dock-stems-count"
                className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200/60"
              >
                <Layers className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
                <span>{currentTrack.stemsCount} stems</span>
              </span>
            ) : null}

            {/* Credit Cost */}
            <span
              id="dock-credit-cost"
              className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              <span>{currentTrack.creditCost} {currentTrack.creditCost === 1 ? 'crédito' : 'créditos'}</span>
            </span>

            {/* Volume control */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
                id="dock-mute-btn"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-slate-400" aria-hidden="true" />
                ) : (
                  <Volume2 className="w-4 h-4 text-slate-600" aria-hidden="true" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                aria-label="Control de volumen"
                id="dock-volume-slider"
                className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              />
            </div>

            {/* Stop / Close Dock Button */}
            <button
              type="button"
              onClick={stop}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Detener y cerrar reproductor"
              id="dock-close-btn"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
