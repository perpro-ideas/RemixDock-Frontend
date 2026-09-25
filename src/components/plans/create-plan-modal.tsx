'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { Plan, PlanType, CreatePlanPayload } from '@/types/plan.types';
import { X } from 'lucide-react';

export interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPlan: Plan) => void;
  accessToken: string | null;
}

export function CreatePlanModal({
  isOpen,
  onClose,
  onSuccess,
  accessToken,
}: CreatePlanModalProps) {
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<PlanType>('MONTHLY');
  const [formPrice, setFormPrice] = useState('19.99');
  const [formDuration, setFormDuration] = useState('30');
  const [formCredits, setFormCredits] = useState('50');
  const [formCanRequestRemix, setFormCanRequestRemix] = useState(false);
  const [remixRequestsLimit, setRemixRequestsLimit] = useState<number>(2);
  const [formBenefits, setFormBenefits] = useState(
    'Descargas en formato WAV\nAcceso a stems multipista\nSoporte prioritario'
  );

  if (!isOpen) return null;

  const handleCreatePlan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null);

    const trimmedName = formName.trim();
    const priceNum = parseFloat(formPrice);

    if (!trimmedName) {
      setCreateError('Por favor ingresa un nombre para el plan.');
      return;
    }

    if (isNaN(priceNum) || priceNum < 0) {
      setCreateError('Por favor ingresa un precio válido mayor o igual a 0.');
      return;
    }

    const benefitsArray = formBenefits
      .split('\n')
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    if (benefitsArray.length === 0) {
      setCreateError('Por favor añade al menos un beneficio para el plan.');
      return;
    }

    const payload: CreatePlanPayload = {
      name: trimmedName,
      description: formDescription.trim() || undefined,
      type: formType,
      price: priceNum,
      durationDays: formDuration ? parseInt(formDuration, 10) : undefined,
      creditsIncluded: formCredits ? parseInt(formCredits, 10) : undefined,
      benefits: benefitsArray,
      canRequestRemix: formCanRequestRemix,
      remixRequestsLimit: formCanRequestRemix ? Number(remixRequestsLimit) : 0,
      isActive: true,
    };

    try {
      setIsCreating(true);
      const createdPlan = await apiFetch<Plan>('/admin/plans', {
        method: 'POST',
        body: JSON.stringify(payload),
        token: accessToken,
      });

      onSuccess(createdPlan);
      onClose();

      // Reiniciar formulario
      setFormName('');
      setFormDescription('');
      setFormPrice('19.99');
      setFormCanRequestRemix(false);
      setRemixRequestsLimit(2);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setCreateError(err.message || 'No fue posible crear el nuevo plan.');
      } else if (err instanceof Error) {
        setCreateError(err.message);
      } else {
        setCreateError('Error al crear el nuevo plan en el servidor.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 transform-gpu">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 id="modal-title" className="text-lg font-bold text-slate-900">
            Crear Nuevo Plan de Suscripción
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label="Cerrar ventana de creación"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {createError && (
          <Alert variant="error">
            <AlertTitle>No fue posible crear el plan</AlertTitle>
            <AlertDescription>{createError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleCreatePlan} className="space-y-4" noValidate>
          <Input
            id="plan-name"
            name="name"
            label="Nombre del plan"
            placeholder="ej. Club Resident VIP"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            autoComplete="off"
            required
          />

          <Input
            id="plan-description"
            name="description"
            label="Descripción breve"
            placeholder="ej. Diseñado para sets nocturnos y cabinas profesionales."
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            autoComplete="off"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="plan-type" className="block text-sm font-medium text-slate-700">
                Tipo de facturación <span className="text-rose-500">*</span>
              </label>
              <select
                id="plan-type"
                value={formType}
                onChange={(e) => setFormType(e.target.value as PlanType)}
                className="w-full min-h-[44px] px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors duration-150"
              >
                <option value="MONTHLY">Facturación Mensual</option>
                <option value="YEARLY">Facturación Anual</option>
                <option value="CREDITS_PACK">Paquete de Créditos</option>
              </select>
            </div>

            <Input
              id="plan-price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              label="Precio en USD ($)"
              placeholder="19.99"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="plan-duration"
              name="duration"
              type="number"
              min="1"
              label="Duración en días"
              placeholder="30"
              value={formDuration}
              onChange={(e) => setFormDuration(e.target.value)}
              autoComplete="off"
              hint="ej. 30 para mensual, 365 para anual."
            />

            <Input
              id="plan-credits"
              name="credits"
              type="number"
              min="1"
              label="Créditos de descarga"
              placeholder="50"
              value={formCredits}
              onChange={(e) => setFormCredits(e.target.value)}
              autoComplete="off"
              hint="Cantidad de pistas o stems."
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="plan-can-request"
              type="checkbox"
              checked={formCanRequestRemix}
              onChange={(e) => setFormCanRequestRemix(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors duration-150"
            />
            <label htmlFor="plan-can-request" className="text-xs sm:text-sm font-medium text-slate-700">
              Permite solicitar remixes personalizados a medida
            </label>
          </div>

          {formCanRequestRemix && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 animate-in fade-in duration-150">
              <label htmlFor="remixRequestsLimit" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Cupo de Peticiones Incluidas por Ciclo (Mensual) *
              </label>
              <input
                type="number"
                id="remixRequestsLimit"
                min={1}
                max={50}
                value={remixRequestsLimit}
                onChange={(e) => setRemixRequestsLimit(Math.max(1, parseInt(e.target.value, 10) || 1))}
                autoComplete="off"
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors duration-150"
              />
              <p className="text-xs text-slate-500">
                Cantidad de encargos exclusivos que el suscriptor puede solicitar sin costo de créditos en cada ciclo de facturación.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="plan-benefits" className="block text-sm font-medium text-slate-700">
              Beneficios incluidos (uno por línea) <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="plan-benefits"
              rows={4}
              value={formBenefits}
              onChange={(e) => setFormBenefits(e.target.value)}
              placeholder="Audio Lossless sin compresión&#10;50 descargas mensuales&#10;Stems separados"
              className="w-full p-3 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors duration-150 placeholder:text-slate-400"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              variant="primary"
              isLoading={isCreating}
              loadingText="Creando plan..."
              id="submit-create-plan-btn"
            >
              Crear plan
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Exportar también como PlanFormModal para máxima compatibilidad de arquitectura
export const PlanFormModal = CreatePlanModal;
