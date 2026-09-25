'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
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
  Coins,
  Shield,
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

// Paquetes estándar de créditos prepago en caso de catálogo sin packs configurados
const defaultCreditPacks: Plan[] = [
  {
    id: 'pack-studio-25',
    name: 'Pack Básico 25',
    description: 'Paquete de créditos para recargas puntuales de cabina sin suscripción.',
    type: 'CREDITS_PACK',
    price: 14.99,
    creditsIncluded: 25,
    benefits: [
      '25 créditos de descarga inmediata',
      'Pago único sin renovación automática',
      'Créditos sin caducidad mensual',
      'Masters en formato WAV Lossless 24-bit',
    ],
    canRequestRemix: false,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'pack-pro-50',
    name: 'Pack Estudio 50',
    description: 'El paquete de créditos más elegido para renovar repertorio en cabina.',
    type: 'CREDITS_PACK',
    price: 24.99,
    creditsIncluded: 50,
    benefits: [
      '50 créditos de descarga inmediata',
      'Pago único sin renovación automática',
      'Créditos sin caducidad mensual',
      'Válido para remixes y stems individuales',
      'Canjeable en peticiones de remixes por encargo',
    ],
    canRequestRemix: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'pack-producer-100',
    name: 'Pack Productor 100',
    description: 'Máximo ahorro para DJs residentes y productores con alta rotación musical.',
    type: 'CREDITS_PACK',
    price: 44.99,
    creditsIncluded: 100,
    benefits: [
      '100 créditos de descarga inmediata',
      'Pago único sin renovación automática',
      'Créditos sin caducidad mensual',
      'Acceso preferente a stems multipista separados',
      'Prioridad en peticiones de remixes por encargo',
    ],
    canRequestRemix: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { refetch: refetchCredits } = useCredits();

  // Pestaña principal: 'plans' (Membresías) o 'credits' (Packs de Créditos)
  const tabParam = searchParams.get('tab');
  const activeTab: 'plans' | 'credits' = tabParam === 'credits' ? 'credits' : 'plans';

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPeriodicity, setSelectedPeriodicity] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado del modal de Checkout
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<Plan | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);

  const handleTabChange = (newTab: 'plans' | 'credits') => {
    const params = new URLSearchParams(searchParams.toString());
    if (newTab === 'credits') {
      params.set('tab', 'credits');
    } else {
      params.delete('tab');
    }
    const query = params.toString();
    router.replace(`/pricing${query ? `?${query}` : ''}`, { scroll: false });
  };

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
    const allAvailablePlans = [...plans, ...defaultCreditPacks];
    if (planIdParam && allAvailablePlans.length > 0 && isAuthenticated && !isCheckoutOpen && !selectedPlanForCheckout) {
      const matchedPlan = allAvailablePlans.find((p) => p.id === planIdParam);
      if (matchedPlan) {
        setSelectedPlanForCheckout(matchedPlan);
        setIsCheckoutOpen(true);
      }
    }
  }, [searchParams, plans, isAuthenticated, isCheckoutOpen, selectedPlanForCheckout]);

  const handleChoosePlan = (plan: Plan) => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/pricing&planId=${encodeURIComponent(plan.id)}`);
      return;
    }
    setSelectedPlanForCheckout(plan);
    setIsCheckoutOpen(true);
  };

  const handlePaymentSuccess = async () => {
    // Sincronizar reactivamente el balance de créditos en el header
    await refetchCredits();
  };

  // Filtrado de membresías recurrentes (MONTHLY y YEARLY)
  const membershipPlans = useMemo(() => {
    return plans.filter((p) => p.type !== 'CREDITS_PACK');
  }, [plans]);

  // Filtrado de paquetes prepago de créditos
  const creditPacks = useMemo(() => {
    const packsFromApi = plans.filter((p) => p.type === 'CREDITS_PACK');
    return packsFromApi.length > 0 ? packsFromApi : defaultCreditPacks;
  }, [plans]);

  // Filtrado secundario por periodicidad en membresías
  const filteredMembershipPlans = useMemo(() => {
    if (selectedPeriodicity === 'ALL') return membershipPlans;
    return membershipPlans.filter((plan) => plan.type === selectedPeriodicity);
  }, [membershipPlans, selectedPeriodicity]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900 pb-32 sm:pb-36">
      {/* Header Canónico Global */}
      <GlobalHeader />

      {/* Breadcrumbs de Navegación */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Pricing' },
          ]}
        />
      </div>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10 overflow-x-hidden">
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            <span>Oferta Comercial para DJs</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Planes diseñados para <br className="hidden sm:inline" />
            <span className="text-emerald-600">DJs y Productores</span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Elige entre suscripciones mensuales con créditos renovables y peticiones de remixes, o paquetes de créditos prepago sin caducidad.
          </p>

          {/* Selector de Pestañas Flat SaaS: Membresías vs Packs de Créditos */}
          <div className="w-full flex justify-center pt-3 px-1">
            <div
              className="inline-flex p-1.5 rounded-2xl bg-white border border-slate-200 shadow-sm"
              role="tablist"
              aria-label="Modalidad de compra"
            >
              <button
                type="button"
                role="tab"
                id="tab-plans"
                data-testid="tab-plans"
                aria-selected={activeTab === 'plans'}
                onClick={() => handleTabChange('plans')}
                className={`min-h-[44px] px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  activeTab === 'plans'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Disc3 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Membresías</span>
              </button>

              <button
                type="button"
                role="tab"
                id="tab-credits"
                data-testid="tab-credits"
                aria-selected={activeTab === 'credits'}
                onClick={() => handleTabChange('credits')}
                className={`min-h-[44px] px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  activeTab === 'credits'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Coins className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Packs de Créditos</span>
              </button>
            </div>
          </div>

          {/* Subfiltro de periodicidad para Membresías */}
          {activeTab === 'plans' && (
            <div className="w-full flex justify-center pt-2 px-1 overflow-x-auto no-scrollbar">
              <div
                className="inline-flex max-w-full overflow-x-auto p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 no-scrollbar whitespace-nowrap"
                role="tablist"
                aria-label="Filtro de periodicidad de facturación"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedPeriodicity === 'ALL'}
                  onClick={() => setSelectedPeriodicity('ALL')}
                  className={`min-h-[40px] px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shrink-0 ${
                    selectedPeriodicity === 'ALL'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  id="filter-tab-all"
                >
                  Todos los planes
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedPeriodicity === 'MONTHLY'}
                  onClick={() => setSelectedPeriodicity('MONTHLY')}
                  className={`min-h-[40px] px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shrink-0 ${
                    selectedPeriodicity === 'MONTHLY'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  id="filter-tab-monthly"
                >
                  Mensuales
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedPeriodicity === 'YEARLY'}
                  onClick={() => setSelectedPeriodicity('YEARLY')}
                  className={`min-h-[40px] px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shrink-0 ${
                    selectedPeriodicity === 'YEARLY'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  id="filter-tab-yearly"
                >
                  Anuales (Ahorro)
                </button>
              </div>
            </div>
          )}

          {/* Banner explicativo en pestaña de Packs de Créditos */}
          {activeTab === 'credits' && (
            <div className="pt-2 max-w-xl mx-auto">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 space-y-1 shadow-sm text-center">
                <p className="font-semibold text-slate-900">
                  Pago único sin suscripción ni renovación automática
                </p>
                <p className="text-slate-500">
                  Créditos sin caducidad mensual para pistas, stems o remixes por encargo.
                </p>
              </div>
            </div>
          )}
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
            <p className="text-sm font-medium text-slate-500">Cargando opciones disponibles...</p>
          </div>
        ) : activeTab === 'plans' ? (
          /* TAB 1: MEMBRESÍAS */
          filteredMembershipPlans.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 max-w-lg mx-auto space-y-3" id="plans-empty-state">
              <Music className="w-10 h-10 text-slate-400 mx-auto" aria-hidden="true" />
              <h3 className="text-lg font-bold text-slate-900">No hay membresías en esta categoría</h3>
              <p className="text-xs text-slate-500">
                Selecciona &quot;Todos los planes&quot; para explorar las membresías de suscripción disponibles.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPeriodicity('ALL')}
                className="mt-2"
              >
                Ver todos los planes
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredMembershipPlans.map((plan) => {
                const typeInfo = planTypeLabels[plan.type] || {
                  label: plan.type,
                  className: 'bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-3 py-1 font-semibold text-xs',
                };

                const isPopular = plan.type === 'MONTHLY' && plan.price > 15;
                const isProducer = plan.name.toLowerCase().includes('producer') || plan.id.includes('producer');
                const isStarter = plan.name.toLowerCase().includes('starter') || plan.id.includes('starter');

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

                      {/* Badges de Peticiones de Remixes Específicos */}
                      <div className="pt-1">
                        {plan.canRequestRemix ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Sparkles className="w-3 h-3" aria-hidden="true" />
                            <span>{plan.remixRequestsLimit || 2} peticiones de remixes al mes incluidas</span>
                          </span>
                        ) : isProducer ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                            <Shield className="w-3 h-3" aria-hidden="true" />
                            <span>Peticiones prioritarias para cabina</span>
                          </span>
                        ) : isStarter ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span>Peticiones mediante créditos Bounty</span>
                          </span>
                        ) : null}
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
                            Incluye {plan.creditsIncluded} créditos de descarga al mes
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
          )
        ) : (
          /* TAB 2: PACKS DE CRÉDITOS */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {creditPacks.map((pack) => {
              const isBestValue = pack.price > 20 && pack.price < 40;

              return (
                <Card
                  key={pack.id}
                  className={`flex flex-col justify-between relative transition-all duration-200 hover:shadow-md ${
                    isBestValue ? 'border-emerald-500/80 ring-2 ring-emerald-500/20' : 'border-slate-200/80'
                  }`}
                  data-plan-id={pack.id}
                >
                  {isBestValue && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm tracking-wide uppercase">
                        Mejor Valor
                      </span>
                    </div>
                  )}

                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-3 py-1 font-semibold text-xs">
                        Pago Único
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                        Sin caducidad
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
                        <CardTitle className="text-2xl font-bold text-slate-900">{pack.name}</CardTitle>
                      </div>
                      {pack.description && (
                        <CardDescription className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                          {pack.description}
                        </CardDescription>
                      )}
                    </div>

                    {/* Saldo de créditos destacado */}
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
                      <p className="text-xs font-semibold text-emerald-800">
                        {pack.creditsIncluded} Créditos directos de estudio
                      </p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Canjeables por tracks, stems o peticiones de remixes
                      </p>
                    </div>

                    {/* Price display */}
                    <div className="pt-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                          ${pack.price.toFixed(2)}
                        </span>
                        <span className="text-sm font-medium text-slate-500">pago único</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        Sin suscripciones mensuales ni renovación automática
                      </p>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-2">
                    <div className="border-t border-slate-100 pt-4 space-y-2.5">
                      <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                        Incluido en este paquete:
                      </p>
                      <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
                        {pack.benefits.map((benefit, idx) => (
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
                      variant={isBestValue ? 'primary' : 'outline'}
                      className="w-full justify-center group min-h-[44px]"
                      onClick={() => handleChoosePlan(pack)}
                      id={`choose-plan-${pack.id}-btn`}
                      aria-label={`Comprar paquete ${pack.name}`}
                    >
                      <span>Comprar paquete</span>
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

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Disc3 className="w-6 h-6 animate-spin" aria-hidden="true" />
            </div>
            <p className="text-sm text-slate-500 font-medium">Cargando catálogo comercial...</p>
          </div>
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
