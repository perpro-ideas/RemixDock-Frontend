'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { CreditsBadge } from '@/components/credits/credits-badge';
import { Plan, PlanType } from '@/types/plan.types';
import {
  Disc3,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
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

// Planes predeterminados de demostración en caso de que el catálogo aún no tenga registros en base de datos
const fallbackPlans: Plan[] = [
  {
    id: 'plan-starter-monthly',
    name: 'DJ Starter',
    description: 'Acceso inicial para DJs que buscan pistas seleccionadas de alta calidad.',
    type: 'MONTHLY',
    price: 9.99,
    durationDays: 30,
    creditsIncluded: 15,
    benefits: [
      '15 descargas mensuales en formato WAV/FLAC',
      'Acceso al catálogo general de remixes',
      'Preescucha en streaming sin pérdidas',
      'Soporte estándar por correo',
    ],
    canRequestRemix: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'plan-pro-monthly',
    name: 'DJ Pro Club',
    description: 'El plan más popular para DJs residentes y productores activos.',
    type: 'MONTHLY',
    price: 19.99,
    durationDays: 30,
    creditsIncluded: 50,
    benefits: [
      '50 descargas mensuales en formato WAV/FLAC',
      'Acceso ilimitado a stems multipista separados',
      'Lanzamientos exclusivos 48 horas antes',
      'Hasta 2 solicitudes mensuales de remixes',
      'Soporte prioritario para cabina',
    ],
    canRequestRemix: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'plan-elite-yearly',
    name: 'Pro Producer Anual',
    description: 'Ahorro máximo para estudios de producción y DJs de gira.',
    type: 'YEARLY',
    price: 189.99,
    durationDays: 365,
    creditsIncluded: 700,
    benefits: [
      '700 descargas anuales acumulables',
      'Descarga ilimitada de stems y pistas acapella',
      'Solicitud directa de remixes personalizados',
      'Licencia comercial para sesiones en vivo',
      'Atención preferente vía WhatsApp/Telegram',
    ],
    canRequestRemix: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function PlansPage() {
  const { isAuthenticated } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPlans() {
      try {
        setIsLoading(true);
        const data = await apiFetch<Plan[]>('/plans');
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setPlans(data.filter((p) => p.isActive));
          } else {
            setPlans(fallbackPlans);
          }
        }
      } catch (err) {
        if (isMounted) {
          if (err instanceof ApiClientError && err.statusCode >= 500) {
            setErrorMessage('El servidor de catálogo está experimentando demoras.');
          }
          setPlans(fallbackPlans);
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

  const filteredPlans = plans.filter((plan) => {
    if (selectedType === 'ALL') return true;
    return plan.type === selectedType;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* Public Navigation Header */}
      <header className="border-b border-slate-200/80 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-slate-900 font-bold text-lg tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg p-1"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Disc3 className="w-5 h-5 animate-spin-slow" aria-hidden="true" />
            </div>
            <span>
              Remix<span className="text-emerald-600">Dock</span>
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href="/"
              className="min-h-[44px] px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" aria-hidden="true" />
              <span>Inicio</span>
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                <CreditsBadge />
                <Link
                  href="/dashboard"
                  className="min-h-[44px] px-3.5 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  id="plans-dashboard-link"
                >
                  Dashboard
                </Link>
              </div>
            ) : (
              <Link
                href="/login"
                className="min-h-[44px] px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm transition-all inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                Iniciar sesión
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            <span>Membresías de Suscripción</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Planes diseñados para <br className="hidden sm:inline" />
            <span className="text-emerald-600">DJs y Productores</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Elige la membresía que mejor se adapte a tu flujo de trabajo en cabina y estudio. Accede a stems multipista, descargas exclusivas y peticiones de remixes.
          </p>

          {/* Billing filter tabs */}
          <div className="flex items-center justify-center pt-4">
            <div
              role="tablist"
              aria-label="Filtro de planes por ciclo de facturación"
              className="inline-flex p-1 bg-slate-200/70 rounded-2xl border border-slate-200"
            >
              <button
                role="tab"
                aria-selected={selectedType === 'ALL'}
                onClick={() => setSelectedType('ALL')}
                className={`min-h-[40px] px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                  selectedType === 'ALL'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos los planes
              </button>
              <button
                role="tab"
                aria-selected={selectedType === 'MONTHLY'}
                onClick={() => setSelectedType('MONTHLY')}
                className={`min-h-[40px] px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                  selectedType === 'MONTHLY'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mensuales
              </button>
              <button
                role="tab"
                aria-selected={selectedType === 'YEARLY'}
                onClick={() => setSelectedType('YEARLY')}
                className={`min-h-[40px] px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                  selectedType === 'YEARLY'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Anuales
              </button>
              <button
                role="tab"
                aria-selected={selectedType === 'CREDITS_PACK'}
                onClick={() => setSelectedType('CREDITS_PACK')}
                className={`min-h-[40px] px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                  selectedType === 'CREDITS_PACK'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Paquetes
              </button>
            </div>
          </div>
        </section>

        {errorMessage && (
          <Alert variant="error" className="max-w-2xl mx-auto">
            <AlertTitle>Error al consultar el catálogo</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Disc3 className="w-6 h-6 animate-spin" aria-hidden="true" />
            </div>
            <p className="text-sm text-slate-500 font-medium">
              Cargando catálogo de planes...
            </p>
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
                    <Link
                      href={`/register?plan=${plan.id}`}
                      className="w-full"
                    >
                      <Button
                        variant={isPopular ? 'primary' : 'outline'}
                        className="w-full justify-center group min-h-[44px]"
                      >
                        <span>Elegir plan</span>
                        <ArrowRight
                          className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </Button>
                    </Link>
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
    </div>
  );
}
