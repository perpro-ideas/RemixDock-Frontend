'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { GlobalHeader } from '@/components/layout/global-header';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import {
  AssignRequestModal,
  RejectRequestModal,
  CompleteRequestModal,
} from '@/components/requests/admin-request-action-modals';
import {
  RemixRequest,
  RemixRequestStatus,
  FundingType,
  STATUS_LABELS,
} from '@/types/requests.types';
import {
  Shield,
  Search,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Coins,
  Layers,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export default function AdminRequestsPage() {
  const router = useRouter();
  const { user, token, accessToken, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const activeToken = token || accessToken;

  // Estados de datos
  const [requests, setRequests] = useState<RemixRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RemixRequestStatus>('ALL');
  const [fundingFilter, setFundingFilter] = useState<'ALL' | FundingType>('ALL');

  // Modales de Acción Administrativa
  const [activeRequestForAction, setActiveRequestForAction] = useState<RemixRequest | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState<boolean>(false);

  // 1. Protección de ruta administrativa (RBAC)
  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      router.push('/login?redirect=/admin/requests');
      return;
    }
    if (user && user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, isAuthLoading, user, router]);

  // 2. Cargar peticiones administrativas
  const loadAdminRequests = useCallback(async () => {
    if (!isAuthenticated || (user && user.role !== 'ADMIN')) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const data = await apiFetch<RemixRequest[]>('/admin/remix-requests', {
        token: activeToken || undefined,
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });

      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message || 'No fue posible cargar las peticiones administrativas.');
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Error al conectar con la consola de peticiones.');
      }
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, activeToken]);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && user?.role === 'ADMIN') {
      loadAdminRequests();
    }
  }, [isAuthLoading, isAuthenticated, user, loadAdminRequests]);

  // Actualizar ítem localmente tras éxito en modal
  const handleRequestUpdated = (updated: RemixRequest) => {
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
    setStatusMessage(`Petición "${updated.title}" actualizada exitosamente a ${STATUS_LABELS[updated.status]?.label || updated.status}.`);
  };

  // Filtrado reactivo de peticiones
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
      if (fundingFilter !== 'ALL' && req.fundingType !== fundingFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = req.title.toLowerCase().includes(query);
        const matchesArtist = req.artist.toLowerCase().includes(query);
        const matchesUser = req.user?.username.toLowerCase().includes(query) || req.user?.email.toLowerCase().includes(query);
        const matchesGenre = req.genre?.name.toLowerCase().includes(query);
        return matchesTitle || matchesArtist || Boolean(matchesUser) || Boolean(matchesGenre);
      }

      return true;
    });
  }, [requests, statusFilter, fundingFilter, searchQuery]);

  // Métricas rápidas
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const inProgressCount = requests.filter((r) => r.status === 'IN_PROGRESS').length;
  const completedCount = requests.filter((r) => r.status === 'COMPLETED').length;

  // Si está autenticado pero no es administrador: pantalla de Acceso Restringido
  if (!isAuthLoading && (!isAuthenticated || user?.role !== 'ADMIN')) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 selection:bg-emerald-100 selection:text-emerald-900">
        <Card className="max-w-md w-full text-center p-2" id="admin-unauthorized-card">
          <CardHeader className="space-y-3 items-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Shield className="w-6 h-6" aria-hidden="true" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">
              Acceso Restringido
            </CardTitle>
            <CardDescription className="text-sm text-slate-600">
              Esta sección está reservada exclusivamente para administradores de RemixDock. Tu cuenta actual no cuenta con los permisos requeridos.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Link href="/dashboard" className="w-full inline-block">
              <Button variant="primary" className="w-full min-h-[44px]">
                Volver a mi cabina
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header Canónico Global */}
      <GlobalHeader />

      {/* Migas de Pan Canónicas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Administración', href: '/dashboard' },
            { label: 'Peticiones de Remixes' },
          ]}
        />
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Encabezado Principal */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-violet-50 text-violet-600 border border-violet-200">
                <Shield className="w-5 h-5" aria-hidden="true" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Gestión de Peticiones de Remixes
              </h1>
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                Modo Administrador
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Supervisa encargos de la comunidad, asigna productores a cabina y entrega remixes terminados.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={loadAdminRequests}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl min-h-[44px] shrink-0"
            id="refresh-admin-requests-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualizar lista</span>
          </Button>
        </div>

        {/* Notificaciones */}
        {statusMessage && (
          <Alert variant="success" className="bg-emerald-50 border-emerald-200 text-emerald-800 py-3" id="admin-status-alert">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <AlertTitle className="font-semibold text-xs sm:text-sm">Operación Exitosa</AlertTitle>
            <AlertDescription className="text-xs text-emerald-700 mt-0.5">{statusMessage}</AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="error" className="py-3" id="admin-error-alert">
            <AlertCircle className="w-4 h-4" />
            <AlertTitle className="font-semibold text-xs sm:text-sm">Aviso de Gestión</AlertTitle>
            <AlertDescription className="text-xs mt-0.5">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Métricas Flat SaaS de Producción */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="py-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">En Revisión</span>
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-1" id="metric-pending-count">{pendingCount}</p>
              <CardDescription className="text-[11px] text-slate-500">Pendientes de asignación o evaluación técnica</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="py-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">En Estudio</span>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-1" id="metric-in-progress-count">{inProgressCount}</p>
              <CardDescription className="text-[11px] text-slate-500">Encargos en producción activa</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="py-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Entregadas</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-1" id="metric-completed-count">{completedCount}</p>
              <CardDescription className="text-[11px] text-slate-500">Pistas vinculadas al catálogo y acreditadas</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Buscador */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por canción, artista o DJ..."
                className="w-full h-10 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                id="admin-requests-search-input"
              />
            </div>

            {/* Filtro de Estado */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                id="admin-status-filter-select"
              >
                <option value="ALL">Todos los estados</option>
                <option value="PENDING">En Revisión (Pendientes)</option>
                <option value="IN_PROGRESS">En Estudio (En Producción)</option>
                <option value="COMPLETED">Entregadas</option>
                <option value="REJECTED">Rechazadas</option>
                <option value="CANCELLED">Canceladas</option>
              </select>
            </div>

            {/* Filtro de Financiamiento */}
            <div>
              <select
                value={fundingFilter}
                onChange={(e) => setFundingFilter(e.target.value as typeof fundingFilter)}
                className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                id="admin-funding-filter-select"
              >
                <option value="ALL">Todas las modalidades</option>
                <option value="INCLUDED_IN_PLAN">Incluido en Membresía</option>
                <option value="CREDITS_BOUNTY">Recompensa en Créditos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla Administrativa */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden" id="admin-requests-table-container">
          {isLoading ? (
            <div className="text-center py-16 space-y-3">
              <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Cargando encargos de remixes...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-2">
              <Layers className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-900">No se encontraron peticiones con los filtros aplicados</p>
              <p className="text-xs text-slate-500">Intenta restablecer los filtros para visualizar más encargos.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Canción y Artista</th>
                    <th className="py-3 px-4">DJ Solicitante</th>
                    <th className="py-3 px-4">Modalidad</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Productor / Asignado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.map((req) => {
                    const statusMeta = STATUS_LABELS[req.status] || STATUS_LABELS.PENDING;

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition-colors" data-admin-request-row={req.id}>
                        {/* Canción y Artista */}
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{req.title}</p>
                          <p className="text-xs text-slate-500">
                            {req.artist} {req.targetBpm ? `• ${req.targetBpm} BPM` : ''} {req.genre?.name ? `• ${req.genre.name}` : ''}
                          </p>
                          {req.referenceUrl && (
                            <a
                              href={req.referenceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-emerald-600 hover:text-emerald-700 underline inline-flex items-center gap-1 mt-0.5"
                            >
                              <span>Escuchar referencia</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </td>

                        {/* DJ Solicitante */}
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-800">{req.user?.username || 'DJ Miembro'}</p>
                          <p className="text-xs text-slate-400">{req.user?.email || 'email@remixdock.com'}</p>
                        </td>

                        {/* Modalidad */}
                        <td className="py-3 px-4">
                          {req.fundingType === 'INCLUDED_IN_PLAN' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Sparkles className="w-3 h-3" />
                              <span>Membresía</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <Coins className="w-3 h-3" />
                              <span>{req.bountyCredits || 10} cr.</span>
                            </span>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusMeta.className}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotColor}`} />
                            <span>{statusMeta.label}</span>
                          </span>
                        </td>

                        {/* Productor Asignado */}
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {req.assignedRemixer?.username ? (
                            <span className="font-medium text-slate-900">{req.assignedRemixer.username}</span>
                          ) : req.status === 'IN_PROGRESS' ? (
                            <span className="text-amber-700 font-medium">Estudio RemixDock</span>
                          ) : (
                            <span className="text-slate-400 italic">Sin asignar</span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Botón Asignar / Pasar a Estudio */}
                            {req.status === 'PENDING' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRequestForAction(req);
                                  setIsAssignModalOpen(true);
                                }}
                                id={`assign-request-btn-${req.id}`}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 min-h-[36px]"
                              >
                                Asignar a estudio
                              </button>
                            )}

                            {/* Botón Completar y Entregar */}
                            {(req.status === 'PENDING' || req.status === 'IN_PROGRESS') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRequestForAction(req);
                                  setIsCompleteModalOpen(true);
                                }}
                                id={`complete-request-btn-${req.id}`}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 min-h-[36px]"
                              >
                                Entregar remix
                              </button>
                            )}

                            {/* Botón Rechazar */}
                            {req.status === 'PENDING' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRequestForAction(req);
                                  setIsRejectModalOpen(true);
                                }}
                                id={`reject-request-btn-${req.id}`}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 min-h-[36px]"
                              >
                                Rechazar
                              </button>
                            )}

                            {/* Si ya está completada o rechazada */}
                            {req.status === 'COMPLETED' && (
                              <span className="text-xs text-emerald-600 font-semibold px-2">Entregado</span>
                            )}
                            {req.status === 'REJECTED' && (
                              <span className="text-xs text-red-600 font-semibold px-2">Rechazado</span>
                            )}
                            {req.status === 'CANCELLED' && (
                              <span className="text-xs text-slate-400 font-semibold px-2">Cancelado</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modales Administrativos */}
      <AssignRequestModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setActiveRequestForAction(null);
        }}
        onSuccess={handleRequestUpdated}
        request={activeRequestForAction}
        token={activeToken}
      />

      <RejectRequestModal
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setActiveRequestForAction(null);
        }}
        onSuccess={handleRequestUpdated}
        request={activeRequestForAction}
        token={activeToken}
      />

      <CompleteRequestModal
        isOpen={isCompleteModalOpen}
        onClose={() => {
          setIsCompleteModalOpen(false);
          setActiveRequestForAction(null);
        }}
        onSuccess={handleRequestUpdated}
        request={activeRequestForAction}
        token={activeToken}
      />
    </div>
  );
}
