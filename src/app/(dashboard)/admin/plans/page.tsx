'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { Plan, PlanType, CreatePlanPayload } from '@/types/plan.types';
import { GlobalHeader } from '@/components/layout/global-header';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import {
  Disc3,
  Plus,
  Shield,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Layers,
  X,
} from 'lucide-react';

const planTypeBadges: Record<PlanType, { label: string; className: string }> = {
  MONTHLY: {
    label: 'Mensual',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full px-2.5 py-0.5 text-xs font-semibold',
  },
  YEARLY: {
    label: 'Anual',
    className: 'bg-teal-50 text-teal-700 border border-teal-200/80 rounded-full px-2.5 py-0.5 text-xs font-semibold',
  },
  CREDITS_PACK: {
    label: 'Créditos',
    className: 'bg-slate-100 text-slate-700 border border-slate-200/80 rounded-full px-2.5 py-0.5 text-xs font-semibold',
  },
};

export default function AdminPlansPage() {
  const { user, accessToken, isLoading: isAuthLoading, isAuthenticated } = useAuth();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);

  // Estados Modal Creación de Plan
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<PlanType>('MONTHLY');
  const [formPrice, setFormPrice] = useState('19.99');
  const [formDuration, setFormDuration] = useState('30');
  const [formCredits, setFormCredits] = useState('50');
  const [formCanRequestRemix, setFormCanRequestRemix] = useState(false);
  const [formBenefits, setFormBenefits] = useState(
    'Descargas en formato WAV\nAcceso a stems multipista\nSoporte prioritario'
  );

  // 1. Cargar planes administrativos memorizado con useCallback
  const loadAdminPlans = useCallback(async () => {
    try {
      setIsLoadingPlans(true);
      setErrorMessage(null);
      const data = await apiFetch<Plan[]>('/admin/plans', {
        token: accessToken,
      });

      if (Array.isArray(data)) {
        setPlans(data);
      } else {
        setPlans([]);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message || 'No fue posible cargar los planes de suscripción.');
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('No se pudo conectar con el catálogo administrativo.');
      }
      setPlans([]);
    } finally {
      setIsLoadingPlans(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && user?.role === 'ADMIN') {
      void loadAdminPlans();
    }
  }, [isAuthLoading, isAuthenticated, user?.role, loadAdminPlans]);

  // Si está autenticado pero no es administrador: Acceso restringido
  if (!isAuthLoading && (!isAuthenticated || user?.role !== 'ADMIN')) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 selection:bg-emerald-100 selection:text-emerald-900">
        <Card className="max-w-md w-full text-center p-2">
          <CardHeader className="space-y-3 items-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Shield className="w-6 h-6" aria-hidden="true" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">
              Acceso Restringido
            </CardTitle>
            <CardDescription className="text-sm text-slate-600">
              Esta sección está reservada exclusivamente para administradores de la plataforma. Tu rol actual no cuenta con los permisos necesarios.
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

  // 2. Manejo de Toggle Activo / Pausado (PATCH /api/v1/admin/plans/:id)
  const handleToggleActive = async (plan: Plan) => {
    try {
      setIsUpdatingId(plan.id);
      setStatusMessage(null);
      setErrorMessage(null);

      const updatedStatus = !plan.isActive;

      await apiFetch<Plan>(`/admin/plans/${plan.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: updatedStatus }),
        token: accessToken,
      });

      // Actualizar estado local reactivamente
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, isActive: updatedStatus } : p))
      );

      setStatusMessage(
        updatedStatus
          ? `El plan "${plan.name}" ahora está activo en el catálogo público.`
          : `El plan "${plan.name}" ha sido pausado y ya no se mostrará a los usuarios.`
      );
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message || 'No fue posible actualizar el estado del plan.');
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Error al comunicar con el servidor.');
      }
    } finally {
      setIsUpdatingId(null);
    }
  };

  // 3. Manejo de Creación de Nuevo Plan (POST /api/v1/admin/plans)
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
      isActive: true,
    };

    try {
      setIsCreating(true);
      const createdPlan = await apiFetch<Plan>('/admin/plans', {
        method: 'POST',
        body: JSON.stringify(payload),
        token: accessToken,
      });

      setPlans((prev) => [createdPlan, ...prev]);
      setStatusMessage(`El plan "${createdPlan.name}" fue creado exitosamente.`);
      setIsModalOpen(false);

      // Reiniciar formulario
      setFormName('');
      setFormDescription('');
      setFormPrice('19.99');
      setFormCanRequestRemix(false);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header Canónico Global */}
      <GlobalHeader />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {/* Breadcrumbs de Navegación */}
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/dashboard' },
            { label: 'Administración' },
            { label: 'Planes' },
          ]}
        />
        {/* Header Section with Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Gestión de Planes de Suscripción
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Administra el catálogo de membresías, configura precios y ajusta la visibilidad pública.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/plans"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition-colors min-h-[44px]"
            >
              <span>Ver catálogo público ↗</span>
            </Link>

            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              className="gap-2 min-h-[44px]"
              id="create-plan-btn"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Crear nuevo plan</span>
            </Button>
          </div>
        </div>

        {/* Feedback Alerts */}
        {statusMessage && (
          <Alert variant="success" id="admin-status-alert">
            <AlertTitle>Operación completada</AlertTitle>
            <AlertDescription>{statusMessage}</AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="error">
            <AlertTitle>Error de gestión</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Administrative Plans Table Card */}
        <Card>
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Membresías Registradas ({plans.length})</CardTitle>
                <CardDescription className="mt-0.5">
                  Controla la disponibilidad en tiempo real de cada plan en la plataforma.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoadingPlans ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                <Disc3 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="text-sm">Cargando planes...</span>
              </div>
            ) : plans.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Layers className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-medium">No hay planes registrados en este momento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm" aria-label="Tabla de planes de suscripción">
                  <thead className="bg-slate-50/80 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th scope="col" className="px-6 py-3.5 font-semibold">Plan</th>
                      <th scope="col" className="px-6 py-3.5 font-semibold">Tipo</th>
                      <th scope="col" className="px-6 py-3.5 font-semibold">Precio (USD)</th>
                      <th scope="col" className="px-6 py-3.5 font-semibold">Créditos / Duración</th>
                      <th scope="col" className="px-6 py-3.5 font-semibold">Estado</th>
                      <th scope="col" className="px-6 py-3.5 font-semibold text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {plans.map((plan) => {
                      const typeBadge = planTypeBadges[plan.type] || {
                        label: plan.type,
                        className: 'bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2.5 py-0.5 text-xs',
                      };

                      return (
                        <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors" data-plan-row={plan.id}>
                          {/* Plan Name & Description */}
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">{plan.name}</div>
                            {plan.description && (
                              <div className="text-xs text-slate-500 mt-0.5 max-w-xs truncate">
                                {plan.description}
                              </div>
                            )}
                          </td>

                          {/* Plan Type */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={typeBadge.className}>{typeBadge.label}</span>
                          </td>

                          {/* Price */}
                          <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-900">
                            ${plan.price.toFixed(2)}
                          </td>

                          {/* Credits & Duration */}
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                            <div>{plan.creditsIncluded ? `${plan.creditsIncluded} descargas` : 'Sin límite fijado'}</div>
                            <div className="text-slate-400">
                              {plan.durationDays ? `${plan.durationDays} días de vigencia` : 'Sin expiración'}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {plan.isActive ? (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                                data-status="active"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Activo</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200"
                                data-status="paused"
                              >
                                <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Pausado</span>
                              </span>
                            )}
                          </td>

                          {/* Actions: Toggle Button */}
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(plan)}
                              disabled={isUpdatingId === plan.id}
                              aria-label={plan.isActive ? `Pausar plan ${plan.name}` : `Activar plan ${plan.name}`}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                                plan.isActive
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80'
                              }`}
                              data-toggle-btn={plan.id}
                            >
                              {plan.isActive ? (
                                <>
                                  <ToggleRight className="w-4 h-4 text-rose-600" aria-hidden="true" />
                                  <span>Pausar plan</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                                  <span>Activar plan</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modal / Diálogo para Crear Plan */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 id="modal-title" className="text-lg font-bold text-slate-900">
                Crear Nuevo Plan de Suscripción
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
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
                required
              />

              <Input
                id="plan-description"
                name="description"
                label="Descripción breve"
                placeholder="ej. Diseñado para sets nocturnos y cabinas profesionales."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
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
                    className="w-full min-h-[44px] px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
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
                  hint="Cantidad de pistas o stems."
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="plan-can-request"
                  type="checkbox"
                  checked={formCanRequestRemix}
                  onChange={(e) => setFormCanRequestRemix(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <label htmlFor="plan-can-request" className="text-xs sm:text-sm font-medium text-slate-700">
                  Permite solicitar remixes personalizados a medida
                </label>
              </div>

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
                  className="w-full p-3 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
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
      )}
    </div>
  );
}
