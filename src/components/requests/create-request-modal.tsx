'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { Genre } from '@/types/tracks.types';
import {
  FundingType,
  RemixRequest,
  CreateRemixRequestPayload,
  RemixRequestQuota,
} from '@/types/requests.types';
import {
  X,
  Music2,
  Sparkles,
  Coins,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRequest: RemixRequest) => void;
  quota?: RemixRequestQuota | null;
  userCredits?: number;
  token?: string | null;
}

export function CreateRequestModal({
  isOpen,
  onClose,
  onSuccess,
  quota,
  userCredits = 0,
  token,
}: CreateRequestModalProps) {
  // Form fields
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [genreId, setGenreId] = useState('');
  const [desiredBpm, setDesiredBpm] = useState<string>('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Funding option: INCLUDED_IN_PLAN vs CREDITS_BOUNTY
  const remainingQuota = quota?.remaining ?? quota?.available ?? quota?.remainingQuota ?? 0;
  const canRequestRemix = quota?.canRequestRemix !== undefined ? quota.canRequestRemix : remainingQuota > 0;
  const hasQuotaAvailable = Boolean(canRequestRemix && remainingQuota > 0);
  const [fundingType, setFundingType] = useState<FundingType>(
    hasQuotaAvailable ? 'INCLUDED_IN_PLAN' : 'CREDITS_BOUNTY'
  );
  const [bountyCredits, setBountyCredits] = useState<number>(10);

  // Data fetching & UX states
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoadingGenres, setIsLoadingGenres] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load genres
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchGenres = async () => {
      try {
        setIsLoadingGenres(true);
        const data = await apiFetch<Genre[]>('/genres', {
          token: token || undefined,
        });
        if (isMounted) {
          setGenres(Array.isArray(data) ? data : []);
          if (Array.isArray(data) && data.length > 0 && data[0] && !genreId) {
            setGenreId(data[0].id);
          }
        }
      } catch {
        if (isMounted) {
          // Fallback generos standard para DJs si el endpoint no responde
          const fallbackGenres: Genre[] = [
            { id: 'genre-house', name: 'House & Tech House', slug: 'house' },
            { id: 'genre-dance', name: 'Dance / Electro Pop', slug: 'dance' },
            { id: 'genre-latin', name: 'Latin Urban & Reggaeton', slug: 'latin' },
            { id: 'genre-retro', name: '80s / 90s Club Classics', slug: 'retro' },
          ];
          setGenres(fallbackGenres);
          const defaultFallback = fallbackGenres[0];
          if (defaultFallback) {
            setGenreId(defaultFallback.id);
          }
        }
      } finally {
        if (isMounted) setIsLoadingGenres(false);
      }
    };

    fetchGenres();
    return () => {
      isMounted = false;
    };
  }, [isOpen, token, genreId]);

  // Sincronizar modalidad por defecto según cupo al abrir
  useEffect(() => {
    if (isOpen) {
      setFundingType(hasQuotaAvailable ? 'INCLUDED_IN_PLAN' : 'CREDITS_BOUNTY');
      setErrorMessage(null);
    }
  }, [isOpen, hasQuotaAvailable]);

  // Cerrar al pulsar Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    },
    [onClose, isSubmitting]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const hasEnoughCredits = fundingType !== 'CREDITS_BOUNTY' || userCredits >= bountyCredits;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validaciones de dominio
    if (!title.trim()) {
      setErrorMessage('Ingresa el título de la canción que deseas encargar.');
      return;
    }
    if (!artist.trim()) {
      setErrorMessage('Ingresa el artista original de la pista.');
      return;
    }
    if (!genreId) {
      setErrorMessage('Selecciona un género musical para la producción.');
      return;
    }
    if (fundingType === 'CREDITS_BOUNTY') {
      if (!bountyCredits || bountyCredits < 5) {
        setErrorMessage('La recompensa mínima en créditos para la cabina de producción es de 5 créditos.');
        return;
      }
      if (userCredits < bountyCredits) {
        setErrorMessage(
          `Saldo insuficiente. Tienes ${userCredits} créditos y estás ofreciendo ${bountyCredits}. Recarga créditos para continuar.`
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const payload: CreateRemixRequestPayload = {
        title: title.trim(),
        artist: artist.trim(),
        genreId,
        desiredBpm: desiredBpm ? Number(desiredBpm) : undefined,
        targetBpm: desiredBpm ? Number(desiredBpm) : undefined,
        referenceUrl: referenceUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        fundingType,
        bountyCredits: fundingType === 'CREDITS_BOUNTY' ? bountyCredits : undefined,
      };

      const created = await apiFetch<RemixRequest>('/remix-requests', {
        method: 'POST',
        token: token || undefined,
        body: JSON.stringify(payload),
      });

      onSuccess(created);
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message || 'No fue posible registrar la petición de remix.');
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Error inesperado al conectar con el estudio de producción.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-request-title"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <Music2 className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="modal-request-title" className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Solicitar Remix Exclusivo
              </h2>
              <p className="text-xs text-slate-500">
                Encarga a nuestro equipo de productores una versión inédita para tu repertorio.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar modal"
            id="close-request-modal-btn"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm">
          {errorMessage && (
            <Alert variant="error" className="py-2.5">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>Atención</AlertTitle>
              <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Modalidad de Financiamiento */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Modalidad de Financiamiento
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Modalidad de financiamiento">
              {/* Opción A: Incluido en Suscripción */}
              <button
                type="button"
                role="radio"
                aria-checked={fundingType === 'INCLUDED_IN_PLAN'}
                disabled={!hasQuotaAvailable}
                onClick={() => {
                  if (hasQuotaAvailable) setFundingType('INCLUDED_IN_PLAN');
                }}
                className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between min-h-[88px] ${
                  fundingType === 'INCLUDED_IN_PLAN'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : hasQuotaAvailable
                    ? 'border-slate-200 bg-white hover:bg-slate-50 cursor-pointer'
                    : 'border-slate-200 bg-slate-50/60 opacity-60 cursor-not-allowed'
                }`}
                id="funding-option-plan-btn"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                    <span>Incluido en Membresía</span>
                  </span>
                  {hasQuotaAvailable && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {remainingQuota} {remainingQuota === 1 ? 'disponible' : 'disponibles'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                  {hasQuotaAvailable
                    ? `Consume 1 de tus peticiones mensuales incluidas en tu plan ${quota?.planName || 'DJ Pro Club'}.`
                    : 'No tienes peticiones mensuales disponibles en tu plan actual.'}
                </p>
              </button>

              {/* Opción B: Créditos Bounty */}
              <button
                type="button"
                role="radio"
                aria-checked={fundingType === 'CREDITS_BOUNTY'}
                onClick={() => setFundingType('CREDITS_BOUNTY')}
                className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between min-h-[88px] ${
                  fundingType === 'CREDITS_BOUNTY'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
                id="funding-option-bounty-btn"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                    <span>Recompensa en Créditos</span>
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap bg-slate-100 text-slate-700 border border-slate-200">
                    Saldo: {userCredits} cr.
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                  Financia el encargo ofreciendo una recompensa en créditos directos para el productor.
                </p>
              </button>
            </div>

            {/* Input de Créditos si eligió Bounty */}
            {fundingType === 'CREDITS_BOUNTY' && (
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="bounty-credits-input" className="text-xs font-semibold text-slate-800">
                    Créditos a ofrecer como recompensa (mínimo 5):
                  </label>
                  <span className="text-xs font-bold text-emerald-700">{bountyCredits} créditos</span>
                </div>
                <input
                  id="bounty-credits-input"
                  type="number"
                  min={5}
                  max={200}
                  value={bountyCredits}
                  onChange={(e) => setBountyCredits(Number(e.target.value))}
                  className="w-full h-10 px-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                />
                {!hasEnoughCredits && (
                  <div className="flex items-center justify-between gap-2 pt-1 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    <span>Saldo actual ({userCredits} cr.) menor a la recompensa fijada.</span>
                    <Link
                      href="/pricing?tab=credits"
                      className="font-semibold text-emerald-700 hover:text-emerald-800 underline inline-flex items-center gap-1 shrink-0"
                    >
                      <span>Recargar</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Información de la Canción */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label htmlFor="request-title-input" className="block text-xs font-semibold text-slate-800">
                Título de la canción <span className="text-red-500">*</span>
              </label>
              <input
                id="request-title-input"
                placeholder="Ej. Titanium / Pepas / One More Time"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full h-10 px-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="request-artist-input" className="block text-xs font-semibold text-slate-800">
                Artista original <span className="text-red-500">*</span>
              </label>
              <input
                id="request-artist-input"
                placeholder="Ej. David Guetta / Farruko / Daft Punk"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                required
                className="w-full h-10 px-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              />
            </div>
          </div>

          {/* Género y BPM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="request-genre-select" className="block text-xs font-semibold text-slate-800">
                Género de producción deseado <span className="text-red-500">*</span>
              </label>
              <select
                id="request-genre-select"
                value={genreId}
                onChange={(e) => setGenreId(e.target.value)}
                disabled={isLoadingGenres}
                className="w-full h-10 px-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                {isLoadingGenres ? (
                  <option>Cargando géneros...</option>
                ) : (
                  genres.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="request-bpm-input" className="block text-xs font-semibold text-slate-800">
                BPM objetivo para cabina (Opcional)
              </label>
              <input
                id="request-bpm-input"
                name="desiredBpm"
                type="number"
                min={60}
                max={200}
                placeholder="Ej. 126"
                value={desiredBpm}
                onChange={(e) => setDesiredBpm(e.target.value)}
                className="w-full h-10 px-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              />
            </div>
          </div>

          {/* Enlace de Referencia */}
          <div className="space-y-1">
            <label htmlFor="request-reference-input" className="block text-xs font-semibold text-slate-800">
              Enlace de referencia (SoundCloud, YouTube o Spotify)
            </label>
            <input
              id="request-reference-input"
              type="url"
              placeholder="https://soundcloud.com/... o https://youtube.com/..."
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
              className="w-full h-10 px-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
          </div>

          {/* Notas de Producción */}
          <div className="space-y-1">
            <label htmlFor="request-notes-textarea" className="block text-xs font-semibold text-slate-800">
              Notas técnicas y de cabina para el productor
            </label>
            <textarea
              id="request-notes-textarea"
              rows={3}
              placeholder="Especifica estilo: Extended Club Mix, Intro acapella, Drop Tech House con sub-bass marcado..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 leading-relaxed"
            />
          </div>
        </form>

        {/* Footer del Modal */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/80">
          <div className="text-xs text-slate-500">
            {fundingType === 'INCLUDED_IN_PLAN' ? (
              <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Sin costo adicional de créditos
              </span>
            ) : (
              <span>Costo: {bountyCredits} créditos de tu saldo</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px] text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting || !hasEnoughCredits}
              id="submit-request-btn"
              className="min-h-[44px] text-xs font-semibold px-4"
            >
              {isSubmitting ? 'Enviando encargo...' : 'Confirmar Petición'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
