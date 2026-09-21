'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { useCredits } from '@/hooks/use-credits';
import { CheckoutModal } from '@/components/payments/checkout-modal';
import { Plan, PlanType } from '@/types/plan.types';
import { GlobalHeader } from '@/components/layout/global-header';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import {
  Disc3,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Music,
  ShieldCheck,
  Zap,
} from 'lucide-react';

const planTypeLabels: Record<PlanType, { label: string; className: string }> = {
  MONTHLY: {
    label: 'Facturación Mensual',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full px-3 py-1 font-semibold text-xs',
  },
  YEARLY: {
    label: 'Facturación Anual',
    className: 'bg-teal-50 text-teal-700 border border-teal-200/80 rounded-full px-3 py-1 font-semibold text-xs',
  },
  CREDITS_PACK: {
    label: 'Paquete de Créditos',
    className: 'bg-slate-100 text-slate-700 border border-slate-200/80 rounded-full px-3 py-1 font-semibold text-xs',
  },
};

function PlansContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { refetch: refetchCredits } = useCredits();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado del modal de Checkout
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<Plan | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPlans() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const data = await apiFetch<Plan[]>('/plans');
        if (isMounted) {
          if (Array.isArray(data)) {
            setPlans(data.filter((p) => p.isActive));
          } else {
            setPlans([]);
          }
        }
      } catch (err) {
        if (isMounted) {
          if (err instanceof ApiClientError) {
            setErrorMessage(err.message || 'No se pudieron cargar los planes de suscripción.');
          } else if (err instanceof Error) {
            setErrorMessage(err.message);
          } else {
            setErrorMessage('No se pudo conectar con el catálogo de planes.');
          }
          setPlans([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPlans();

    return () => {
      isMounted = false;
    };
  }, []);

  // Abrir automáticamente el modal si el usuario retornó de login con ?planId=...
  useEffect(() => {
    const planIdParam = searchParams.get('planId');
    if (planIdParam && plans.length > 0 && isAuthenticated && !isCheckoutOpen && !selectedPlanForCheckout) {
      const matchedPlan = plans.find((p) => p.id === planIdParam);
      if (matchedPlan) {
        setSelectedPlanForCheckout(matchedPlan);
        setIsCheckoutOpen(true);
      }
    }
  }, [searchParams, plans, isAuthenticated, isCheckoutOpen, selectedPlanForCheckout]);

  const handleChoosePlan = (plan: Plan) => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/plans&planId=${encodeURIComponent(plan.id)}`);
      return;
    }
    setSelectedPlanForCheckout(plan);
    setIsCheckoutOpen(true);
  };

  const handlePaymentSuccess = async () => {
    // Sincronizar reactivamente el balance de créditos en el header
    await refetchCredits();
  };

  const filteredPlans = plans.filter((plan) => {
    if (selectedType === 'ALL') return true;
    return plan.type === selectedType;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header Canónico Global */}
      <GlobalHeader />

      {/* Breadcrumbs de Navegación */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Planes y Membresías' },
          ]}
        />
      </div>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10 sm:space-y-12 overflow-x-hidden">
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            <span>Membresías de Suscripción</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Planes diseñados para <br className="hidden sm:inline" />
            <span className="text-emerald-600">DJs y Productores</span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Elige la membresía que mejor se adapte a tu flujo de trabajo en cabina y estudio. Accede a stems multipista, descargas exclusivas y peticiones de remixes.
          </p>

          {/* Billing filter tabs */}
          <div className="w-full flex justify-center pt-4 px-1 overflow-x-auto no-scrollbar">
            <div
              className="inline-flex max-w-full overflow-x-auto p-1.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm no-scrollbar whitespace-nowrap"
              role="tablist"
              aria-label="Filtro de periodicidad de facturación"
            >
              <button
                type="button"
                role="tab"
                aria-selected={selectedType === 'ALL'}
                onClick={() => setSelectedType('ALL')}
                className={`min-h-[44px] px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shrink-0 ${
                  selectedType === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                id="filter-tab-all"
              >
                Todos los planes
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={selectedType === 'MONTHLY'}
                onClick={() => setSelectedType('MONTHLY')}
                className={`min-h-[44px] px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shrink-0 ${
                  selectedType === 'MONTHLY'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                id="filter-tab-monthly"
              >
                Mensuales
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={selectedType === 'YEARLY'}
                onClick={() => setSelectedType('YEARLY')}
                className={`min-h-[44px] px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shrink-0 ${
                  selectedType === 'YEARLY'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                id="filter-tab-yearly"
              >
                Anuales (Ahorro)
              </button>
            </div>
          </div>
        </section>

        {errorMessage && (
          <div className="max-w-2xl mx-auto">
            <Alert variant="error">
              <AlertTitle>Catálogo de planes</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Disc3 className="w-6 h-6 animate-spin" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-slate-500">Cargando membresías disponibles...</p>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 max-w-lg mx-auto space-y-3" id="plans-empty-state">
            <Music className="w-10 h-10 text-slate-400 mx-auto" aria-hidden="true" />
            <h3 className="text-lg font-bold text-slate-900">
              {plans.length === 0 ? 'No hay planes disponibles en este momento' : 'No hay planes en esta categoría'}
            </h3>
            <p className="text-xs text-slate-500">
              {plans.length === 0
                ? 'Vuelve a consultar más tarde para nuevas membresías de suscripción.'
                : 'Selecciona "Todos los planes" para explorar el catálogo completo de membresías.'}
            </p>
            {plans.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedType('ALL')}
                className="mt-2"
              >
                Ver todos los planes
              </Button>
            )}
          </div>
        ) : (
          /* Plans Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPlans.map((plan) => {
              const typeInfo = planTypeLabels[plan.type] || {
                label: plan.type,
                className: 'bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-3 py-1 font-semibold text-xs',
              };

              const isPopular = plan.type === 'MONTHLY' && plan.price > 15;

              return (
                <Card
                  key={plan.id}
                  className={`flex flex-col justify-between relative transition-all duration-200 hover:shadow-md ${
                    isPopular ? 'border-emerald-500/80 ring-2 ring-emerald-500/20' : 'border-slate-200/80'
                  }`}
                  data-plan-id={plan.id}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm tracking-wide uppercase">
                        Más Popular
                      </span>
                    </div>
                  )}

                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className={typeInfo.className}>{typeInfo.label}</span>
                      {plan.canRequestRemix && (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                          Remixes a medida
                        </span>
                      )}
                    </div>

                    <div>
                      <CardTitle className="text-2xl font-bold text-slate-900">{plan.name}</CardTitle>
                      {plan.description && (
                        <CardDescription className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                          {plan.description}
                        </CardDescription>
                      )}
                    </div>

                    {/* Price display */}
                    <div className="pt-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                          ${plan.price.toFixed(2)}
                        </span>
                        <span className="text-sm font-medium text-slate-500">
                          {plan.type === 'MONTHLY' ? '/ mes' : plan.type === 'YEARLY' ? '/ año' : 'pago único'}
                        </span>
                      </div>
                      {plan.creditsIncluded ? (
                        <p className="text-xs text-slate-500 mt-1 font-medium">
                          Incluye {plan.creditsIncluded} créditos de descarga
                        </p>
                      ) : null}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-2">
                    <div className="border-t border-slate-100 pt-4 space-y-2.5">
                      <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                        Beneficios incluidos:
                      </p>
                      <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
                        {plan.benefits.map((benefit, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <CheckCircle2
                              className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5"
                              aria-hidden="true"
                            />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>

                  <CardFooter className="border-t border-slate-100 pt-4 mt-auto">
                    <Button
                      type="button"
                      variant={isPopular ? 'primary' : 'outline'}
                      className="w-full justify-center group min-h-[44px]"
                      onClick={() => handleChoosePlan(plan)}
                      id={`choose-plan-${plan.id}-btn`}
                      aria-label={`Elegir plan ${plan.name}`}
                    >
                      <span>Elegir plan</span>
                      <ArrowRight
                        className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Guarantees and Trust */}
        <section className="border-t border-slate-200/80 pt-12 mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <Music className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Audio Lossless 24-bit</h3>
            <p className="text-xs text-slate-600">Pistas masterizadas en formato WAV y FLAC sin compresión con calidad de cabina.</p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <Zap className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Descarga Inmediata</h3>
            <p className="text-xs text-slate-600">Archivos organizados con BPM, tonalidad y stems independientes por instrumento.</p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Cancelación Flexible</h3>
            <p className="text-xs text-slate-600">Pausa o cancela tu suscripción en cualquier momento sin penalizaciones.</p>
          </div>
        </section>
      </main>

      {/* Modal de Checkout Flat SaaS */}
      <CheckoutModal
        plan={selectedPlanForCheckout}
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setSelectedPlanForCheckout(null);
        }}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}

export default function PlansPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Disc3 className="w-6 h-6 animate-spin" aria-hidden="true" />
            </div>
            <p className="text-sm text-slate-500 font-medium">Cargando planes...</p>
          </div>
        </div>
      }
    >
      <PlansContent />
    </Suspense>
  );
}
