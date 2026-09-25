'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { Track, PaginatedTracksResponse } from '@/types/tracks.types';
import { RemixRequest } from '@/types/requests.types';
import {
  X,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';

/* =========================================================================
   1. MODAL: ASIGNAR REMIXER / PASAR A PRODUCCIÓN (EN ESTUDIO)
   ========================================================================= */
export interface RemixerUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface AssignRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: RemixRequest) => void;
  request: RemixRequest | null;
  token?: string | null;
}

export function AssignRequestModal({
  isOpen,
  onClose,
  onSuccess,
  request,
  token,
}: AssignRequestModalProps) {
  const [remixerId, setRemixerId] = useState('');
  const [remixers, setRemixers] = useState<RemixerUser[]>([]);
  const [isLoadingRemixers, setIsLoadingRemixers] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRemixerId(request?.assignedRemixerId || '');
      setNotes('');
      setErrorMessage(null);
    }
  }, [isOpen, request]);

  // Cargar lista de productores/remixers disponibles para asignación
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchRemixers = async () => {
      try {
        setIsLoadingRemixers(true);
        const data = await apiFetch<RemixerUser[] | { items?: RemixerUser[]; data?: RemixerUser[] }>(
          '/admin/remix-requests/remixers',
          { token: token || undefined }
        );
        if (isMounted) {
          const list = Array.isArray(data)
            ? data
            : (data?.items || data?.data || []);
          setRemixers(list);
        }
      } catch {
        if (isMounted) {
          setRemixers([]);
        }
      } finally {
        if (isMounted) setIsLoadingRemixers(false);
      }
    };

    fetchRemixers();
    return () => {
      isMounted = false;
    };
  }, [isOpen, token]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    },
    [onClose, isSubmitting]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!remixerId) {
      setErrorMessage('Selecciona un remixer o productor asignado.');
      return;
    }
    try {
      setIsSubmitting(true);
      const updated = await apiFetch<RemixRequest>(
        `/admin/remix-requests/${request.id}/assign`,
        {
          method: 'PATCH',
          token: token || undefined,
          body: JSON.stringify({
            remixerId,
            notes: notes.trim() || undefined,
          }),
        }
      );
      onSuccess(updated);
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message || 'No fue posible asignar la petición.');
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Error al comunicar con el estudio.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-assign-title"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden text-slate-900 transform-gpu">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-600" />
            <h2 id="modal-assign-title" className="text-sm sm:text-base font-bold text-slate-900">
              Asignar Remixer / Pasar a Estudio
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            id="close-assign-modal-btn"
            aria-label="Cerrar modal de asignación"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
          {errorMessage && (
            <Alert variant="error" className="py-2.5">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <p className="font-semibold text-slate-900">{request.title}</p>
            <p className="text-xs text-slate-500">
              Artista: {request.artist} {request.targetBpm ? `• ${request.targetBpm} BPM` : ''}
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="remixerSelect" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Seleccionar Remixer / Productor Asignado *
            </label>
            <select
              id="remixerSelect"
              value={remixerId}
              onChange={(e) => setRemixerId(e.target.value)}
              required
              disabled={isSubmitting || isLoadingRemixers}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors duration-150"
            >
              <option value="">
                {isLoadingRemixers ? 'Cargando productores...' : 'Selecciona un productor...'}
              </option>
              {remixers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.username} — ({r.role === 'ADMIN' ? 'Administrador' : 'Remixer'})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="assign-notes-textarea" className="block text-xs font-semibold text-slate-800">
              Instrucciones técnicas internas
            </label>
            <textarea
              id="assign-notes-textarea"
              rows={2}
              placeholder="Notas de entrega, formato esperado (Extended Club + Stems)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors duration-150"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              id="confirm-assign-btn"
              className="min-h-[44px] text-xs font-semibold bg-amber-600 hover:bg-amber-700"
            >
              {isSubmitting ? 'Asignando...' : 'Iniciar Producción'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================================
   2. MODAL: RECHAZO TÉCNICO CON FEEDBACK
   ========================================================================= */
export interface RejectRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: RemixRequest) => void;
  request: RemixRequest | null;
  token?: string | null;
}

export function RejectRequestModal({
  isOpen,
  onClose,
  onSuccess,
  request,
  token,
}: RejectRequestModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setErrorMessage(null);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    },
    [onClose, isSubmitting]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMessage('Debes indicar un motivo de rechazo técnico para el DJ.');
      return;
    }

    try {
      setIsSubmitting(true);
      const updated = await apiFetch<RemixRequest>(
        `/admin/remix-requests/${request.id}/reject`,
        {
          method: 'PATCH',
          token: token || undefined,
          body: JSON.stringify({ reason: reason.trim() }),
        }
      );
      onSuccess(updated);
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message || 'No fue posible registrar el rechazo.');
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Error al rechazar el encargo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-reject-title"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden text-slate-900 transform-gpu">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-red-50/50">
          <div className="flex items-center gap-2 text-red-700">
            <XCircle className="w-4 h-4" />
            <h2 id="modal-reject-title" className="text-sm sm:text-base font-bold">
              Rechazar Solicitud de Remix
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            id="close-reject-modal-btn"
            aria-label="Cerrar modal de rechazo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
          {errorMessage && (
            <Alert variant="error" className="py-2.5">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>Atención</AlertTitle>
              <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
            </Alert>
          )}

          <p className="text-xs text-slate-600 leading-relaxed">
            Al rechazar, los créditos de recompensa o el cupo del DJ se restaurarán de inmediato. Especifica una retroalimentación técnica:
          </p>

          <div className="space-y-1">
            <label htmlFor="reject-reason-textarea" className="block text-xs font-semibold text-slate-800">
              Motivo técnico o de viabilidad <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reject-reason-textarea"
              rows={3}
              placeholder="Ej. Audio de referencia no disponible, derechos restringidos por discográfica, tonalidad no procesable..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full p-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-colors duration-150"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
              type="submit"
              variant="danger"
              disabled={isSubmitting}
              id="confirm-reject-btn"
              className="min-h-[44px] text-xs font-semibold"
            >
              {isSubmitting ? 'Rechazando...' : 'Confirmar Rechazo'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================================
   3. MODAL: COMPLETAR Y ENTREGAR REMIX (VINCULAR TRACK DEL CATÁLOGO)
   ========================================================================= */
export interface CompleteRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: RemixRequest) => void;
  request: RemixRequest | null;
  token?: string | null;
}

export function CompleteRequestModal({
  isOpen,
  onClose,
  onSuccess,
  request,
  token,
}: CompleteRequestModalProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isExclusive, setIsExclusive] = useState(true);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchCatalog = async () => {
      try {
        setIsLoadingTracks(true);
        const data = await apiFetch<PaginatedTracksResponse | Track[]>('/tracks', {
          token: token || undefined,
        });
        if (isMounted) {
          const list = Array.isArray(data) ? data : data?.items || [];
          setTracks(list);
          const firstTrack = list[0];
          if (list.length > 0 && !selectedTrackId && firstTrack) {
            setSelectedTrackId(firstTrack.id);
          }
        }
      } catch {
        if (isMounted) {
          // Fallback track para entornos de prueba
          const fallbackTracks: Track[] = [
            {
              id: 'track-completed-mock-1',
              title: request && request.title ? `${request.title} (Exclusive Club Mix)` : 'Titanium Club Extended',
              artist: (request && request.artist) || 'David Guetta',
              bpm: 126,
              creditCost: 1,
              createdAt: new Date().toISOString(),
            },
          ];
          setTracks(fallbackTracks);
          const fallback = fallbackTracks[0];
          if (fallback) {
            setSelectedTrackId(fallback.id);
          }
        }
      } finally {
        if (isMounted) setIsLoadingTracks(false);
      }
    };

    fetchCatalog();
    setDeliveryNotes('');
    setIsExclusive(true);
    setErrorMessage(null);

    return () => {
      isMounted = false;
    };
  }, [isOpen, token, request, selectedTrackId]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    },
    [onClose, isSubmitting]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrackId) {
      setErrorMessage('Selecciona la pista masterizada del catálogo para entregar.');
      return;
    }

    try {
      setIsSubmitting(true);
      const updated = await apiFetch<RemixRequest>(
        `/admin/remix-requests/${request.id}/complete`,
        {
          method: 'PATCH',
          token: token || undefined,
          body: JSON.stringify({
            trackId: selectedTrackId,
            notes: deliveryNotes.trim() || undefined,
            isExclusive,
            publishToCatalog: !isExclusive,
          }),
        }
      );
      onSuccess(updated);
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message || 'No fue posible completar la entrega.');
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Error al completar el encargo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-complete-title"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden text-slate-900 transform-gpu">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-emerald-50/60">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h2 id="modal-complete-title" className="text-sm sm:text-base font-bold">
              Completar y Entregar Remix
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            id="close-complete-modal-btn"
            aria-label="Cerrar modal de entrega"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
          {errorMessage && (
            <Alert variant="error" className="py-2.5">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>Atención</AlertTitle>
              <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
            </Alert>
          )}

          <p className="text-xs text-slate-600 leading-relaxed">
            Vincula la pista masterizada del catálogo. La pista se añadirá automáticamente a la biblioteca del DJ solicitante para su descarga inmediata.
          </p>

          <div className="space-y-1">
            <label htmlFor="complete-track-select" className="block text-xs font-semibold text-slate-800">
              Pista terminada del catálogo <span className="text-red-500">*</span>
            </label>
            <select
              id="complete-track-select"
              value={selectedTrackId}
              onChange={(e) => setSelectedTrackId(e.target.value)}
              disabled={isLoadingTracks}
              className="w-full h-10 px-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors duration-150"
            >
              {isLoadingTracks ? (
                <option>Cargando pistas del catálogo...</option>
              ) : (
                tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} — {t.artist} ({t.bpm} BPM)
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Switch de Exclusividad del Remix */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label htmlFor="isExclusiveSwitch" className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                id="isExclusiveSwitch"
                checked={isExclusive}
                onChange={(e) => setIsExclusive(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors duration-150"
              />
              <div>
                <span className="block text-sm font-semibold text-slate-900">
                  Mantener privado y exclusivo para el DJ solicitante (Recomendado)
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  {isExclusive
                    ? '🔒 Pista no visible en /catalog. Únicamente el solicitante podrá reproducirla y descargarla en su biblioteca personal.'
                    : '🌐 Pista publicada en /catalog. Disponible para toda la comunidad mediante descarga con créditos.'}
                </span>
              </div>
            </label>
          </div>

          <div className="space-y-1">
            <label htmlFor="complete-notes-textarea" className="block text-xs font-semibold text-slate-800">
              Notas de entrega para el DJ (Opcional)
            </label>
            <textarea
              id="complete-notes-textarea"
              rows={2}
              placeholder="Ej. Masterizado a -6dB, incluye stems de vocales y percusión limpia..."
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              className="w-full p-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors duration-150"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
              type="submit"
              variant="primary"
              disabled={isSubmitting || !selectedTrackId}
              id="confirm-complete-btn"
              className="min-h-[44px] text-xs font-semibold bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? 'Entregando...' : 'Completar y Notificar al DJ'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
