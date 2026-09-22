'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { GlobalHeader } from '@/components/layout/global-header';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { CreateRequestModal } from '@/components/requests/create-request-modal';
import { CreditBalanceResponse } from '@/types/credits.types';
import {
  RemixRequest,
  RemixRequestQuota,
  STATUS_LABELS,
} from '@/types/requests.types';
import {
  Music2,
  Plus,
  Sparkles,
  Coins,
  CheckCircle2,
  FolderHeart,
  Sliders,
  AlertCircle,
  RefreshCw,
  Search,
  ArrowUpRight,
} from 'lucide-react';

export default function RequestsPage() {
  const router = useRouter();
  const { token, accessToken, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const activeToken = token || accessToken;

  // Estados de datos
  const [requests, setRequests] = useState<RemixRequest[]>([]);
  const [quota, setQuota] = useState<RemixRequestQuota | null>(null);
  const [creditsBalance, setCreditsBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Filtros
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED_REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal de Creación
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isCancellingId, setIsCancellingId] = useState<string | null>(null);

  // Protección de ruta (RBAC / Auth)
  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      router.push('/login?redirect=/requests');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  // Carga de datos de la página
  const loadRequestsData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);

      // 1. Cargar peticiones del DJ
      const requestsPromise = apiFetch<RemixRequest[]>('/remix-requests', {
        token: activeToken || undefined,
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      }).catch(() => []);

      // 2. Cargar balance de créditos
      const creditsPromise = apiFetch<CreditBalanceResponse>('/me/credits', {
        token: activeToken || undefined,
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      }).catch(() => null);

      // 3. Cargar información de cupos del plan
      const quotaPromise = apiFetch<RemixRequestQuota>('/remix-requests/quota', {
        token: activeToken || undefined,
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      }).catch(() => null);

      const [requestsData, creditsData, quotaData] = await Promise.all([
        requestsPromise,
        creditsPromise,
        quotaPromise,
      ]);

      const requestList = Array.isArray(requestsData) ? requestsData : [];
      setRequests(requestList);

      if (creditsData) {
        setCreditsBalance(creditsData.balance || 0);
      }

      if (quotaData) {
        setQuota(quotaData);
      } else {
        // Fallback cupo calculado si el endpoint de cuota no está activo
        const planRequests = requestList.filter((r) => r.fundingType === 'INCLUDED_IN_PLAN');
        setQuota({
          totalMonthlyQuota: 2,
          usedQuota: planRequests.length,
          remainingQuota: Math.max(0, 2 - planRequests.length),
          hasActiveSubscription: true,
          planName: 'DJ Pro Club',
        });
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message || 'No fue posible cargar tus peticiones de remixes.');
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Error al conectar con la cabina de peticiones.');
      }
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, activeToken]);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      loadRequestsData();
    }
  }, [isAuthLoading, isAuthenticated, loadRequestsData]);

  // Cancelar petición en estado PENDING
  const handleCancelRequest = async (requestId: string) => {
    try {
      setIsCancellingId(requestId);
      setErrorMessage(null);
      setStatusMessage(null);

      const updated = await apiFetch<RemixRequest>(`/remix-requests/${requestId}/cancel`, {
        method: 'PATCH',
        token: activeToken || undefined,
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });

      setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, ...updated, status: 'CANCELLED' } : r)));
      setStatusMessage('La petición ha sido cancelada exitosamente.');
      // Refrescar balance y cupos
      loadRequestsData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message || 'No fue posible cancelar el encargo.');
      } else {
        setErrorMessage('Error al cancelar la petición.');
      }
    } finally {
      setIsCancellingId(null);
    }
  };

  // Callback al crear una nueva petición
  const handleRequestCreated = (newReq: RemixRequest) => {
    setRequests((prev) => [newReq, ...prev]);
    setStatusMessage('¡Tu petición de remix exclusivo ha sido recibida por el estudio de producción!');
    loadRequestsData();
  };

  // Filtrado de peticiones
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Filtro por pestaña de estado
      if (activeTab === 'PENDING' && req.status !== 'PENDING') return false;
      if (activeTab === 'IN_PROGRESS' && req.status !== 'IN_PROGRESS') return false;
      if (activeTab === 'COMPLETED' && req.status !== 'COMPLETED') return false;
      if (activeTab === 'CANCELLED_REJECTED' && req.status !== 'CANCELLED' && req.status !== 'REJECTED') return false;

      // Filtro por búsqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = req.title.toLowerCase().includes(query);
        const matchesArtist = req.artist.toLowerCase().includes(query);
        const matchesGenre = req.genre?.name.toLowerCase().includes(query);
        return matchesTitle || matchesArtist || Boolean(matchesGenre);
      }

      return true;
    });
  }, [requests, activeTab, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header Canónico Global */}
      <GlobalHeader />

      {/* Migas de Pan Canónicas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Peticiones de Remixes' },
          ]}
        />
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Encabezado y Acción Principal */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <Music2 className="w-5 h-5" aria-hidden="true" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Peticiones de Remixes Exclusivos
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              Solicita versiones personalizadas para cabina financiadas con tu membresía o recompensas en créditos.
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            id="create-request-btn"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 min-h-[44px] shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Solicitar Remix Exclusivo</span>
          </Button>
        </div>

        {/* Notificaciones y Mensajes de Estado */}
        {statusMessage && (
          <Alert variant="success" className="bg-emerald-50 border-emerald-200 text-emerald-800 py-3" id="requests-status-alert">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <AlertTitle className="font-semibold text-xs sm:text-sm">Operación Exitosa</AlertTitle>
            <AlertDescription className="text-xs text-emerald-700 mt-0.5">{statusMessage}</AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="error" className="py-3" id="requests-error-alert">
            <AlertCircle className="w-4 h-4" />
            <AlertTitle className="font-semibold text-xs sm:text-sm">Aviso de Cabina</AlertTitle>
            <AlertDescription className="text-xs mt-0.5">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Widget de Estado de Cupos y Membresía */}
        <section aria-labelledby="quota-widget-title" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="md:col-span-2 border-slate-200/80 shadow-sm" id="quota-status-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider" id="quota-widget-title">
                  Cupo de Peticiones del Mes
                </span>
                {quota?.hasActiveSubscription ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Sparkles className="w-3 h-3" />
                    <span>Membresía Activa: {quota.planName || 'DJ Pro Club'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    Sin suscripción activa
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-col sm:flex-row sm:items-baseline gap-2">
                {quota && quota.totalMonthlyQuota > 0 ? (
                  <>
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight" id="quota-status-text">
                      Has utilizado {quota.usedQuota} de {quota.totalMonthlyQuota} peticiones
                    </span>
                    <span className="text-xs sm:text-sm text-emerald-700 font-semibold">
                      ({quota.remainingQuota} disponible{quota.remainingQuota === 1 ? '' : 's'} en tu ciclo actual)
                    </span>
                  </>
                ) : (
                  <div className="space-y-1">
                    <span className="text-lg sm:text-xl font-bold text-slate-900">
                      No dispones de peticiones incluidas este mes
                    </span>
                    <p className="text-xs text-slate-600">
                      Puedes encargar remixes ofreciendo recompensas en créditos Bounty o ascender a una membresía con cupos mensuales.
                    </p>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-slate-500 flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pistas entregadas masterizadas en WAV Lossless 24-bit</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Incluye stems multipista separados listos para mezclar</span>
              </span>
            </CardContent>
          </Card>

          {/* Tarjeta Rápida de Saldo y Enlace a Pricing */}
          <Card className="border-slate-200/80 shadow-sm flex flex-col justify-between" id="requests-credits-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Créditos Disponibles
                </span>
                <Coins className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900" id="requests-credits-balance">
                  {creditsBalance}
                </span>
                <span className="text-xs font-semibold text-slate-500">créditos</span>
              </div>
              <CardDescription className="text-xs text-slate-600 mt-1">
                Disponibles para financiar peticiones mediante recompensas Bounty.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Link
                href="/pricing?tab=credits"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors min-h-[44px]"
                id="requests-recharge-link"
              >
                <span>Obtener más créditos</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>
            </CardContent>
          </Card>
        </section>

        {/* Barra de Filtros y Búsqueda */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Selector de Pestañas Flat SaaS por Estado */}
            <div
              className="inline-flex max-w-full overflow-x-auto p-1 rounded-xl bg-white border border-slate-200/90 shadow-sm"
              role="tablist"
              aria-label="Filtro por estado de petición"
            >
              {[
                { id: 'ALL', label: 'Todas' },
                { id: 'PENDING', label: 'En Revisión' },
                { id: 'IN_PROGRESS', label: 'En Estudio' },
                { id: 'COMPLETED', label: 'Entregadas' },
                { id: 'CANCELLED_REJECTED', label: 'Canceladas/Rechazadas' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`tab-filter-${tab.id.toLowerCase()}`}
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`min-h-[40px] px-3.5 sm:px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    activeTab === tab.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Buscador de Encargos */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por canción o artista..."
                className="w-full h-10 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                id="requests-search-input"
              />
            </div>
          </div>

          {/* Listado de Peticiones */}
          {isLoading ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs sm:text-sm text-slate-500">Cargando tus peticiones de remixes...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            /* Estado Vacío */
            <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3" id="empty-requests-state">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-400 flex items-center justify-center mx-auto">
                <Music2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No hay peticiones en esta sección</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                {searchQuery
                  ? 'No encontramos peticiones que coincidan con tu búsqueda.'
                  : '¿Tienes una pista en mente que necesita una versión exclusiva de club? Encarga tu remix hoy.'}
              </p>
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="min-h-[44px] text-xs font-semibold"
                  id="empty-create-request-btn"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  <span>Crear nueva petición</span>
                </Button>
              </div>
            </div>
          ) : (
            /* Rejilla / Listado de Peticiones Flat SaaS */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="requests-grid">
              {filteredRequests.map((req) => {
                const statusMeta = STATUS_LABELS[req.status] || STATUS_LABELS.PENDING;
                const isPending = req.status === 'PENDING';
                const isCompleted = req.status === 'COMPLETED';
                const isRejected = req.status === 'REJECTED';

                return (
                  <Card
                    key={req.id}
                    className="border-slate-200/80 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
                    data-request-id={req.id}
                  >
                    <CardHeader className="pb-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        {/* Badge de Modalidad */}
                        {req.fundingType === 'INCLUDED_IN_PLAN' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Sparkles className="w-3 h-3" />
                            <span>Incluido en Plan</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Coins className="w-3 h-3" />
                            <span>Recompensa: {req.bountyCredits || 10} cr.</span>
                          </span>
                        )}

                        {/* Badge de Estado */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusMeta.className}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotColor}`} />
                          <span>{statusMeta.label}</span>
                        </span>
                      </div>

                      <div>
                        <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">
                          {req.title}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-600 mt-0.5">
                          Artista: <span className="font-semibold text-slate-800">{req.artist}</span>
                          {req.genre?.name ? ` • ${req.genre.name}` : ''}
                          {req.targetBpm ? ` • ${req.targetBpm} BPM` : ''}
                        </CardDescription>
                      </div>

                      {req.notes && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2">
                          <span className="font-semibold text-slate-700">Instrucciones:</span> {req.notes}
                        </p>
                      )}

                      {/* Motivo de rechazo técnico si aplica */}
                      {isRejected && req.rejectionReason && (
                        <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200">
                          <span className="font-bold">Motivo técnico:</span> {req.rejectionReason}
                        </div>
                      )}

                      {/* Info de productor asignado si está en estudio */}
                      {req.status === 'IN_PROGRESS' && (
                        <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-center gap-2">
                          <Sliders className="w-3.5 h-3.5 text-amber-600" />
                          <span>En producción activa por el equipo de remixers.</span>
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="pt-2 pb-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>Solicitado el {new Date(req.createdAt).toLocaleDateString('es-ES')}</span>

                      <div className="flex items-center gap-2">
                        {/* Si está pendiente: botón para cancelar */}
                        {isPending && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleCancelRequest(req.id)}
                            disabled={isCancellingId === req.id}
                            id={`cancel-request-btn-${req.id}`}
                            className="h-8 px-2.5 text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 min-h-[36px]"
                          >
                            {isCancellingId === req.id ? 'Cancelando...' : 'Cancelar encargo'}
                          </Button>
                        )}

                        {/* Si está completado: botón directo a Mi Biblioteca */}
                        {isCompleted && (
                          <Link
                            href="/library"
                            id={`library-track-link-${req.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors min-h-[36px]"
                          >
                            <FolderHeart className="w-3.5 h-3.5" />
                            <span>Escuchar en mi biblioteca</span>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Modal de Creación */}
      <CreateRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleRequestCreated}
        quota={quota}
        userCredits={creditsBalance}
        token={activeToken}
      />
    </div>
  );
}
