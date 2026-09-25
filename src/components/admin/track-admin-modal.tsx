'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import {
  Track,
  Genre,
  StemType,
  CAMELOT_KEYS,
  CreateStemPayload,
  CreateTrackPayload,
  UpdateTrackPayload,
} from '@/types/tracks.types';
import {
  X,
  Plus,
  Trash2,
  Disc3,
  Layers,
  Sparkles,
  Music,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

const STEM_TYPES: { value: StemType; label: string }[] = [
  { value: 'DRUMS', label: 'Drums / Percusión' },
  { value: 'BASS', label: 'Bass / Línea de Bajo' },
  { value: 'SYNTHS', label: 'Synths / Sintetizadores' },
  { value: 'VOCALS', label: 'Vocals / Acapella' },
  { value: 'INSTRUMENTS', label: 'Instruments / Instrumentación' },
  { value: 'OTHER', label: 'Other / Efectos & Otros' },
];

export interface TrackAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedTrack: Track, isNew: boolean) => void;
  trackToEdit?: Track | null;
  genres: Genre[];
  token?: string | null;
}

export function TrackAdminModal({
  isOpen,
  onClose,
  onSuccess,
  trackToEdit,
  genres,
  token,
}: TrackAdminModalProps) {
  const isEditing = Boolean(trackToEdit);

  // Campos principales del track
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [remixer, setRemixer] = useState('');
  const [version, setVersion] = useState('');
  const [genreId, setGenreId] = useState('');
  const [bpm, setBpm] = useState('128');
  const [musicalKey, setMusicalKey] = useState('8A');
  const [durationSeconds, setDurationSeconds] = useState('240');
  const [creditCost, setCreditCost] = useState('1');
  const [previewAudioUrl, setPreviewAudioUrl] = useState('');
  const [downloadAudioUrl, setDownloadAudioUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  // Stems dinámicos
  const [stems, setStems] = useState<CreateStemPayload[]>([]);

  // Estados de interfaz
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inicializar o resetear datos del formulario cuando cambia el modal o el track a editar
  useEffect(() => {
    if (trackToEdit) {
      setTitle(trackToEdit.title || '');
      setArtist(trackToEdit.artist || '');
      setRemixer(trackToEdit.remixer || '');
      setVersion(trackToEdit.version || '');
      setGenreId(trackToEdit.genreId || trackToEdit.genre?.id || (genres[0]?.id || ''));
      setBpm(String(trackToEdit.bpm || 128));
      setMusicalKey(trackToEdit.musicalKey || trackToEdit.key || '8A');
      setDurationSeconds(String(trackToEdit.durationSeconds || trackToEdit.duration || 240));
      setCreditCost(String(trackToEdit.creditCost ?? 1));
      setPreviewAudioUrl(trackToEdit.previewAudioUrl || trackToEdit.previewUrl || '');
      setDownloadAudioUrl(trackToEdit.downloadAudioUrl || trackToEdit.fileUrl || '');
      setCoverImageUrl(trackToEdit.coverImageUrl || trackToEdit.coverUrl || '');
      setIsPublished(trackToEdit.isPublished ?? true);

      // Si vienen stems en el objeto, mapearlos
      if (Array.isArray(trackToEdit.stems) && trackToEdit.stems.length > 0) {
        setStems(
          trackToEdit.stems.map((s) => ({
            name: s.name,
            type: s.type,
            audioUrl: s.audioUrl || s.fileUrl || '',
          }))
        );
      } else {
        setStems([]);
      }
    } else {
      // Valores por defecto para nuevo track
      setTitle('');
      setArtist('');
      setRemixer('');
      setVersion('Club Mix');
      setGenreId(genres[0]?.id || '');
      setBpm('128');
      setMusicalKey('8A');
      setDurationSeconds('240');
      setCreditCost('1');
      setPreviewAudioUrl('https://actions.google.com/sounds/v1/science_fiction/scifi_laser.ogg');
      setDownloadAudioUrl('https://actions.google.com/sounds/v1/science_fiction/scifi_laser.ogg');
      setCoverImageUrl('');
      setIsPublished(true);
      setStems([]);
    }
    setErrorMessage(null);
  }, [trackToEdit, genres, isOpen]);

  if (!isOpen) return null;

  // Manejadores para el constructor dinámico de stems
  const handleAddStem = () => {
    const defaultType: StemType =
      stems.length === 0
        ? 'DRUMS'
        : stems.length === 1
        ? 'BASS'
        : stems.length === 2
        ? 'SYNTHS'
        : stems.length === 3
        ? 'VOCALS'
        : 'INSTRUMENTS';

    const defaultName =
      defaultType === 'DRUMS'
        ? 'Drums & Percussion'
        : defaultType === 'BASS'
        ? 'Sub Bass & Lead Bass'
        : defaultType === 'SYNTHS'
        ? 'Synths & Plucks'
        : defaultType === 'VOCALS'
        ? 'Main Vocals Acapella'
        : 'Instruments & Melodies';

    setStems((prev) => [
      ...prev,
      {
        name: defaultName,
        type: defaultType,
        audioUrl: 'https://actions.google.com/sounds/v1/science_fiction/scifi_laser.ogg',
      },
    ]);
  };

  const handleUpdateStem = (
    index: number,
    field: keyof CreateStemPayload,
    value: string
  ) => {
    setStems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      if (!item) return prev;

      if (field === 'type') {
        updated[index] = { ...item, type: value as StemType };
      } else if (field === 'name') {
        updated[index] = { ...item, name: String(value) };
      } else if (field === 'audioUrl') {
        updated[index] = { ...item, audioUrl: String(value) };
      }
      return updated;
    });
  };

  const handleRemoveStem = (index: number) => {
    setStems((prev) => prev.filter((_, i) => i !== index));
  };

  // Envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validación básica de campos
    if (!title.trim()) {
      setErrorMessage('El título de la pista es obligatorio.');
      return;
    }
    if (!artist.trim()) {
      setErrorMessage('El artista principal es obligatorio.');
      return;
    }
    const parsedBpm = parseInt(bpm, 10);
    if (isNaN(parsedBpm) || parsedBpm < 50 || parsedBpm > 240) {
      setErrorMessage('El BPM debe ser un valor numérico entre 50 y 240.');
      return;
    }
    const parsedDuration = parseInt(durationSeconds, 10);
    if (isNaN(parsedDuration) || parsedDuration <= 0) {
      setErrorMessage('La duración en segundos debe ser mayor a 0.');
      return;
    }
    const parsedCredits = parseInt(creditCost, 10);
    if (isNaN(parsedCredits) || parsedCredits < 0) {
      setErrorMessage('El costo en créditos no puede ser negativo.');
      return;
    }

    const payload: CreateTrackPayload = {
      title: title.trim(),
      artist: artist.trim(),
      remixer: remixer.trim() || undefined,
      version: version.trim() || undefined,
      genreId: genreId || undefined,
      bpm: parsedBpm,
      musicalKey,
      durationSeconds: parsedDuration,
      creditCost: parsedCredits,
      previewAudioUrl: previewAudioUrl.trim() || undefined,
      downloadAudioUrl: downloadAudioUrl.trim() || undefined,
      coverImageUrl: coverImageUrl.trim() || undefined,
      isPublished,
      stems: stems.map((s) => ({
        name: s.name.trim(),
        type: s.type,
        audioUrl: s.audioUrl?.trim() || undefined,
      })),
    };

    try {
      setIsSubmitting(true);
      let resultTrack: Track;

      if (isEditing && trackToEdit) {
        // PATCH /api/v1/admin/tracks/:id
        const updatePayload: UpdateTrackPayload = payload;
        resultTrack = await apiFetch<Track>(`/admin/tracks/${trackToEdit.id}`, {
          method: 'PATCH',
          body: JSON.stringify(updatePayload),
          token: token || undefined,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      } else {
        // POST /api/v1/admin/tracks
        resultTrack = await apiFetch<Track>('/admin/tracks', {
          method: 'POST',
          body: JSON.stringify(payload),
          token: token || undefined,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      }

      onSuccess(resultTrack, !isEditing);
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message || 'No fue posible guardar la pista musical.');
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Error al comunicar los cambios al catálogo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 animate-in fade-in duration-150 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="track-admin-modal-title"
      id="track-admin-modal"
    >
      <div
        className="bg-white border border-slate-200/90 rounded-2xl shadow-xl w-full max-w-3xl my-auto max-h-[92vh] flex flex-col text-slate-900 overflow-hidden transform-gpu"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200/80 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <Disc3 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
                id="track-admin-modal-title"
              >
                {isEditing ? 'Editar Track y Stems' : 'Nuevo Track y Stems'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? 'Modifica metadatos, tonalidad, stems y estado de visibilidad.'
                  : 'Ingresa los datos para registrar un remix exclusivo en el catálogo.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            id="close-track-modal-btn"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Contenido scrolleable del formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {errorMessage && (
            <Alert variant="error" id="modal-error-alert">
              <AlertTitle>Error al guardar</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Sección 1: Datos Musicales Principales */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
              <Music className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Información de la Pista
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="track-title-input"
                label="Título de la Pista"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Titanium Extended Club"
                required
              />

              <Input
                id="track-artist-input"
                label="Artista Original"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Ej: David Guetta ft. Sia"
                required
              />

              <Input
                id="track-remixer-input"
                label="Remixer / Productor (Opcional)"
                value={remixer}
                onChange={(e) => setRemixer(e.target.value)}
                placeholder="Ej: DJ Steve Remix"
              />

              <Input
                id="track-version-input"
                label="Versión / Tipo de Mezcla"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="Ej: Extended Club Mix, Intro Outro"
              />
            </div>
          </div>

          {/* Sección 2: Ficha Técnica DJ (BPM, Clave, Género, Costo) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
              <Sliders className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Ficha Técnica DJ
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700" htmlFor="track-genre-select">
                  Género
                </label>
                <select
                  id="track-genre-select"
                  value={genreId}
                  onChange={(e) => setGenreId(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-colors"
                >
                  <option value="">Seleccionar género</option>
                  {genres.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                id="track-bpm-input"
                label="BPM (Tempo)"
                type="number"
                min={50}
                max={240}
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                placeholder="128"
                required
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700" htmlFor="track-key-select">
                  Clave Camelot <span className="text-rose-500">*</span>
                </label>
                <select
                  id="track-key-select"
                  value={musicalKey}
                  onChange={(e) => setMusicalKey(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-colors"
                  required
                >
                  {CAMELOT_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                id="track-duration-input"
                label="Duración (segundos)"
                type="number"
                min={1}
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(e.target.value)}
                placeholder="240"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <Input
                id="track-credit-cost-input"
                label="Costo en Créditos"
                type="number"
                min={0}
                max={20}
                value={creditCost}
                onChange={(e) => setCreditCost(e.target.value)}
                placeholder="1"
                hint="Créditos descontados por la pista completa con sus stems."
                required
              />

              <Input
                id="track-cover-url-input"
                label="URL de Portada (Opcional)"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://ejemplo.com/portada.jpg"
              />
            </div>
          </div>

          {/* Sección 3: Enlaces de Audio */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
              <Sparkles className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Enlaces y Archivos de Audio
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="track-preview-url-input"
                label="Audio Preview (30s / MP3)"
                value={previewAudioUrl}
                onChange={(e) => setPreviewAudioUrl(e.target.value)}
                placeholder="https://storage.remixdock.com/previews/track.mp3"
              />

              <Input
                id="track-download-url-input"
                label="Audio Completo / Master WAV (Descarga)"
                value={downloadAudioUrl}
                onChange={(e) => setDownloadAudioUrl(e.target.value)}
                placeholder="https://storage.remixdock.com/masters/track.wav"
              />
            </div>
          </div>

          {/* Sección 4: Constructor Dinámico de Stems */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600" aria-hidden="true" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Stems Multipista ({stems.length})
                </h3>
              </div>

              <button
                type="button"
                onClick={handleAddStem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 min-h-[44px]"
                id="add-stem-btn"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>+ Añadir Stem</span>
              </button>
            </div>

            {stems.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center space-y-1">
                <p className="text-xs font-medium text-slate-700">Sin stems adicionales configurados</p>
                <p className="text-[11px] text-slate-500">
                  Puedes añadir stems independientes (Drums, Bass, Acapella, etc.) para descargas multipista.
                </p>
              </div>
            ) : (
              <div className="space-y-3" id="stems-builder-container">
                {stems.map((stem, index) => (
                  <div
                    key={index}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5"
                    id={`stem-row-${index}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                          {index + 1}
                        </span>
                        <span>Canal de Stem</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveStem(index)}
                        className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        id={`remove-stem-btn-${index}`}
                        aria-label={`Eliminar stem ${stem.name || index + 1}`}
                        title="Eliminar este stem"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700" htmlFor={`stem-name-input-${index}`}>
                          Nombre del Stem *
                        </label>
                        <input
                          id={`stem-name-input-${index}`}
                          value={stem.name}
                          onChange={(e) => handleUpdateStem(index, 'name', e.target.value)}
                          placeholder="Ej: Drums & Percussion"
                          className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700" htmlFor={`stem-type-select-${index}`}>
                          Tipo de Elemento
                        </label>
                        <select
                          id={`stem-type-select-${index}`}
                          value={stem.type}
                          onChange={(e) => handleUpdateStem(index, 'type', e.target.value)}
                          className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {STEM_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700" htmlFor={`stem-audiourl-input-${index}`}>
                          URL del Archivo WAV
                        </label>
                        <input
                          id={`stem-audiourl-input-${index}`}
                          value={stem.audioUrl || ''}
                          onChange={(e) => handleUpdateStem(index, 'audioUrl', e.target.value)}
                          placeholder="https://storage.remixdock.com/stems/drums.wav"
                          className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sección 5: Estado de Publicación */}
          <div className="pt-2 border-t border-slate-200">
            <label
              htmlFor="track-published-checkbox"
              className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100/70 transition-colors"
            >
              <input
                type="checkbox"
                id="track-published-checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-900 block">
                  Publicar inmediatamente en el catálogo musical
                </span>
                <span className="text-[11px] text-slate-500 block leading-relaxed">
                  Si marcas esta casilla, la pista estará disponible para reproducción y descarga por todos los DJs. Si la desmarcas, se guardará como borrador interno.
                </span>
              </div>
            </label>
          </div>

          {/* Footer de Acciones del Modal */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/80">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px] text-xs font-semibold px-4"
              id="cancel-track-btn"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              loadingText="Guardando..."
              className="min-h-[44px] text-xs font-semibold px-5 gap-2"
              id="save-track-btn"
            >
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              <span>{isEditing ? 'Guardar Cambios' : 'Crear Track'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
