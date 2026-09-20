'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Track } from '@/types/tracks.types';

interface AudioPlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLoadingAudio: boolean;
  play: (track?: Track) => Promise<void>;
  pause: () => void;
  togglePlay: (track?: Track) => Promise<void>;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  stop: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevVolumeRef = useRef<number>(0.8);

  // Inicializar elemento de audio persistente en el cliente
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = 0.8;
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoadingAudio(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleWaiting = () => {
      setIsLoadingAudio(true);
    };

    const handlePlaying = () => {
      setIsLoadingAudio(false);
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleError = () => {
      setIsLoadingAudio(false);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
    };
  }, []);

  const play = useCallback(async (track?: Track): Promise<void> => {
    const audio = audioRef.current;
    if (!audio) return;

    if (track && track.id !== currentTrack?.id) {
      setCurrentTrack(track);
      setCurrentTime(0);
      setIsLoadingAudio(true);

      audio.src = track.previewUrl || '';
      audio.load();
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      } finally {
        setIsLoadingAudio(false);
      }
      return;
    }

    if (audio.src) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  }, [currentTrack?.id]);

  const pause = useCallback((): void => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(async (track?: Track): Promise<void> => {
    if (track && track.id !== currentTrack?.id) {
      await play(track);
      return;
    }

    if (isPlaying) {
      pause();
    } else {
      await play();
    }
  }, [currentTrack?.id, isPlaying, play, pause]);

  const seek = useCallback((seconds: number): void => {
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.max(0, Math.min(seconds, duration || audio.duration || 0));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  }, [duration]);

  const setVolume = useCallback((newVolume: number): void => {
    const audio = audioRef.current;
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clamped);
    if (clamped > 0) {
      prevVolumeRef.current = clamped;
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }
    if (audio) {
      audio.volume = clamped;
    }
  }, []);

  const toggleMute = useCallback((): void => {
    const audio = audioRef.current;
    if (isMuted) {
      const restored = prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.8;
      setIsMuted(false);
      setVolumeState(restored);
      if (audio) audio.volume = restored;
    } else {
      prevVolumeRef.current = volume;
      setIsMuted(true);
      setVolumeState(0);
      if (audio) audio.volume = 0;
    }
  }, [isMuted, volume]);

  const stop = useCallback((): void => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
    }
    setIsPlaying(false);
    setCurrentTrack(null);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        isLoadingAudio,
        play,
        pause,
        togglePlay,
        seek,
        setVolume,
        toggleMute,
        stop,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer(): AudioPlayerContextType {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer debe utilizarse dentro de un AudioPlayerProvider');
  }
  return context;
}
