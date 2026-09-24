'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { GlobalHeader } from '@/components/layout/global-header';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import {
  StudioDashboardData,
  EARNING_TYPE_LABELS,
  EARNING_TYPE_BADGES,
} from '@/types/remixer.types';
import {
  Disc3,
  DollarSign,
  TrendingUp,
  Music,
  ListMusic,
  ArrowUpRight,
  Shield,
  RefreshCw,
  Layers,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

export default function RemixerStudioPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading, token } = useAuth();
  const [data, setData] = useState<StudioDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'requests' | 'earnings'>('requests');

  const loadStudioData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      let rawData: Partial<StudioDashboardData> | null = null;
      try {
        rawData = await apiFetch<StudioDashboardData>('/remixer/studio/dashboard', {
          token: token || undefined,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      } catch (fetchErr) {
        if (fetchErr instanceof ApiClientError && fetchErr.statusCode === 404) {
          rawData = await apiFetch<StudioDashboardData>('/remixer/studio', {
            token: token || undefined,
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
        } else {
          throw fetchErr;
        }
      }

      if (rawData) {
        const mappedData: StudioDashboardData = {
          availableBalance: Number(rawData.availableBalance ?? 0),
          totalGenerated: Number(rawData.totalGenerated ?? 0),
          inReviewPayouts: Number(rawData.inReviewPayouts ?? 0),
          activeTracksCount: Number(rawData.activeTracksCount ?? 0),
          assignedRequestsCount: Number(rawData.assignedRequestsCount ?? 0),
          assignedRequests: Array.isArray(rawData.assignedRequests) ? rawData.assignedRequests : [],
          recentEarnings: Array.isArray(rawData.recentEarnings) ? rawData.recentEarnings : [],
        };
        setData(mappedData);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('No fue posible cargar las métricas del studio de producción.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && (user?.role === 'REMIXER' || user?.role === 'ADMIN')) {
      loadStudioData();
    }
  }, [isAuthLoading, isAuthenticated, user, loadStudioData]);

  // Si está autenticado pero no es REMIXER ni ADMIN: pantalla de Acceso Restringido
  if (!isAuthLoading && (!isAuthenticated || (user?.role !== 'REMIXER' && user?.role !== 'ADMIN'))) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 selection:bg-emerald-100 selection:text-emerald-900">
        <Card className="max-w-md w-full text-center p-2" id="remixer-unauthorized-card">
          <CardHeader className="space-y-3 items-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Shield className="w-6 h-6" aria-hidden="true" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">
              Acceso Restringido
            </CardTitle>
            <CardDescription className="text-sm text-slate-600">
              Esta sección está reservada exclusivamente para productores y remixers acreditados de RemixDock. Tu cuenta actual no cuenta con los permisos requeridos.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Link href="/dashboard" className="w-full inline-block">
              <Button variant="primary" className="w-full min-h-[44px]" id="unauthorized-return-btn">
                Volver a mi cabina
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const assignedRequests = data?.assignedRequests || [];
  const recentEarnings = data?.recentEarnings || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header Canónico Global */}
      <GlobalHeader />

      {/* Migas de Pan Canónicas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/dashboard' },
            { label: 'Studio de Producción' },
          ]}
        />
      </div>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6 flex-1">
        {/* Encabezado de la Cabina */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Studio de Producción
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Productor / Remixer
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Supervisa tus encargos de remixes asignados, revisa las regalías generadas por tus pistas y gestiona transferencias de cobro.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={loadStudioData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl min-h-[44px]"
              id="refresh-studio-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </Button>

            <Link href="/remixer/payouts">
              <Button
                variant="primary"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl min-h-[44px]"
                id="quick-payout-btn"
              >
                <DollarSign className="w-4 h-4" />
                <span>Solicitar Retiro</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Notificaciones de Error */}
        {errorMessage && (
          <Alert variant="error" className="py-3" id="studio-error-alert">
            <AlertTitle className="font-semibold text-xs sm:text-sm">Aviso de Studio</AlertTitle>
            <AlertDescription className="text-xs mt-0.5">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* 4 Tarjetas de Métricas Flat SaaS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="studio-metrics-grid">
          {/* 1. Saldo Disponible para Cobro */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Saldo Disponible</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900" id="studio-available-balance">
                {data ? `${data.availableBalance.toFixed(2)} cr.` : '0.00 cr.'}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ≈ ${data ? data.availableBalance.toFixed(2) : '0.00'} USD disponibles
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <Link
                href="/remixer/payouts"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
              >
                <span>Cobrar fondos</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              {data && data.inReviewPayouts > 0 && (
                <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                  {data.inReviewPayouts.toFixed(2)} cr. en retiro
                </span>
              )}
            </div>
          </div>

          {/* 2. Total Histórico Generado */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Generado</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900" id="studio-total-generated">
                {data ? `${data.totalGenerated.toFixed(2)} cr.` : '0.00 cr.'}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Acumulado histórico de regalías y recompensas
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link
                href="/remixer/earnings"
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
                id="view-earnings-btn"
              >
                <span>Ver libro mayor</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 3. Pistas en Catálogo */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pistas en Catálogo</span>
              <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-700">
                <Music className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900" id="studio-active-tracks">
                {data ? data.activeTracksCount : 0}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Tracks y stems activos generando regalías
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link
                href="/catalog"
                className="text-xs font-semibold text-violet-700 hover:text-violet-800 inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
              >
                <span>Explorar catálogo</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 4. Encargos Asignados */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Encargos en Estudio</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <ListMusic className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900" id="studio-assigned-requests">
                {data ? data.assignedRequestsCount : 0}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Peticiones de remixes en producción
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
              >
                <span>Ver pedidos asignados</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Pestañas de Cabina Flat SaaS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200">
            <button
              type="button"
              id="tab-assigned-requests"
              onClick={() => setActiveTab('requests')}
              className={`pb-3 px-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 -mb-px flex items-center gap-2 ${
                activeTab === 'requests'
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Mis Encargos en Estudio ({assignedRequests.length})</span>
            </button>

            <button
              type="button"
              id="tab-recent-earnings"
              onClick={() => setActiveTab('earnings')}
              className={`pb-3 px-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 -mb-px flex items-center gap-2 ${
                activeTab === 'earnings'
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Últimas Regalías ({recentEarnings.length})</span>
            </button>
          </div>

          {/* Contenido Pestaña 1: Mis Encargos en Estudio */}
          {activeTab === 'requests' && (
            <div className="space-y-3" id="assigned-requests-container">
              {isLoading ? (
                <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-2" />
                  <span>Cargando encargos de cabina...</span>
                </div>
              ) : assignedRequests.length === 0 ? (
                <div className="p-8 sm:p-12 rounded-2xl border border-dashed border-slate-200 bg-white text-center space-y-3" id="no-assigned-requests-state">
                  <ListMusic className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-800">
                    No tienes encargos de remixes asignados actualmente
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Cuando el equipo de administración te asigne peticiones de remixes de la comunidad, aparecerán aquí con sus especificaciones de cabina.
                  </p>
                </div>
              ) : (
                assignedRequests.map((req) => (
                  <div
                    key={req.id}
                    id={`assigned-request-${req.id}`}
                    className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{req.title}</span>
                        <span className="text-xs text-slate-500">por {req.artist}</span>
                        {req.fundingType === 'CREDITS_BOUNTY' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Recompensa: {req.bountyCredits || 0} cr.
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Incluido en Membresía
                          </span>
                        )}
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                          {req.status === 'IN_PROGRESS' ? 'En Estudio' : req.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        {req.desiredBpm && (
                          <span className="font-medium text-slate-700">
                            BPM Sugerido: {req.desiredBpm}
                          </span>
                        )}
                        {req.referenceUrl && (
                          <a
                            href={req.referenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-medium"
                          >
                            <span>Enlace de referencia</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {req.notes && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                          <span className="font-semibold text-slate-700">Notas de cabina: </span>
                          {req.notes}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <Link href={`/admin/requests?search=${encodeURIComponent(req.title)}`}>
                        <Button
                          variant="primary"
                          className="min-h-[44px] gap-2 text-xs"
                          id={`deliver-remix-btn-${req.id}`}
                        >
                          <Disc3 className="w-4 h-4" />
                          <span>Entregar Remix Terminado</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Contenido Pestaña 2: Últimas Regalías */}
          {activeTab === 'earnings' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden" id="recent-earnings-container">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-2" />
                  <span>Cargando libro contable...</span>
                </div>
              ) : recentEarnings.length === 0 ? (
                <div className="p-8 text-center space-y-2" id="no-recent-earnings-state">
                  <TrendingUp className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-800">No hay movimientos contables registrados</p>
                  <p className="text-xs text-slate-500">Tus regalías por descargas de tracks y stems aparecerán aquí.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-5 py-3">Fecha</th>
                        <th className="px-5 py-3">Tipo</th>
                        <th className="px-5 py-3">Concepto / Pista</th>
                        <th className="px-5 py-3 text-right">Créditos</th>
                        <th className="px-5 py-3 text-right">Equivalente USD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentEarnings.map((earning) => {
                        const isPositive = earning.amountCredits > 0;
                        const badgeStyle = EARNING_TYPE_BADGES[earning.type] || 'bg-slate-100 text-slate-700 border-slate-200';
                        const label = EARNING_TYPE_LABELS[earning.type] || earning.type;

                        return (
                          <tr key={earning.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                              {new Date(earning.createdAt).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeStyle}`}>
                                {label}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-900 font-medium max-w-xs truncate">
                              {earning.track?.title || earning.request?.title || earning.description}
                            </td>
                            <td className={`px-5 py-3.5 text-right font-bold whitespace-nowrap ${isPositive ? 'text-emerald-700' : 'text-slate-700'}`}>
                              {isPositive ? `+${earning.amountCredits.toFixed(2)} cr.` : `${earning.amountCredits.toFixed(2)} cr.`}
                            </td>
                            <td className="px-5 py-3.5 text-right text-slate-500 whitespace-nowrap font-medium">
                              ${Math.abs(earning.amountUsd || earning.amountCredits).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                    <Link
                      href="/remixer/earnings"
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
                    >
                      <span>Ver libro mayor contable completo</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
