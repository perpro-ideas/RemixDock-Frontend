'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { GlobalHeader } from '@/components/layout/global-header';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import {
  PayoutRequest,
  PayoutStatus,
  UpdatePayoutStatusPayload,
  PAYOUT_STATUS_LABELS,
  PAYOUT_STATUS_BADGES,
  PAYOUT_METHOD_LABELS,
} from '@/types/remixer.types';
import {
  Shield,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  RefreshCw,
  Edit3,
  FileCheck2,
  Check,
} from 'lucide-react';

export default function AdminPayoutsPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading, token } = useAuth();
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Estado del Modal de Auditoría
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [targetStatus, setTargetStatus] = useState<PayoutStatus>('APPROVED');
  const [adminFeedback, setAdminFeedback] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadAdminPayouts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await apiFetch<PayoutRequest[] | { items?: PayoutRequest[]; data?: PayoutRequest[] }>(
        '/admin/payouts',
        {
          token: token || undefined,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      const list = Array.isArray(data) ? data : data.items || data.data || [];
      setPayouts(list);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('No fue posible cargar las solicitudes de retiro para auditoría.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && user?.role === 'ADMIN') {
      loadAdminPayouts();
    }
  }, [isAuthLoading, isAuthenticated, user, loadAdminPayouts]);

  // Métricas financieras Flat SaaS
  const pendingPayouts = payouts.filter((p) => p.status === 'PENDING' || p.status === 'IN_REVIEW');
  const pendingTotal = pendingPayouts.reduce((sum, p) => sum + p.amountCredits, 0);

  const processingPayouts = payouts.filter((p) => p.status === 'PROCESSING' || p.status === 'APPROVED');
  const processingTotal = processingPayouts.reduce((sum, p) => sum + p.amountCredits, 0);

  const completedPayouts = payouts.filter((p) => p.status === 'COMPLETED');
  const completedTotal = completedPayouts.reduce((sum, p) => sum + (p.amountUsd || p.amountCredits), 0);

  // Filtrado de solicitudes
  const filteredPayouts = useMemo(() => {
    return payouts.filter((payout) => {
      if (statusFilter !== 'ALL' && payout.status !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesRemixer =
          payout.remixer?.username?.toLowerCase().includes(query) ||
          payout.remixer?.email?.toLowerCase().includes(query);
        const matchesDestination = payout.destination?.toLowerCase().includes(query);
        const matchesId = payout.id?.toLowerCase().includes(query);
        return Boolean(matchesRemixer) || matchesDestination || matchesId;
      }

      return true;
    });
  }, [payouts, statusFilter, searchQuery]);

  // Si no es ADMIN: pantalla de Acceso Restringido
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

  // Abrir Modal de Auditoría
  const handleOpenAuditModal = (payout: PayoutRequest) => {
    setSelectedPayout(payout);
    setTargetStatus(payout.status === 'PENDING' ? 'APPROVED' : payout.status);
    setAdminFeedback(payout.adminFeedback || '');
    setInternalNotes(payout.adminNotes || '');
    setModalError(null);
  };

  const handleCloseAuditModal = () => {
    if (!isAuditing) {
      setSelectedPayout(null);
      setModalError(null);
    }
  };

  // Guardar transición de estado
  const handleSaveAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayout) return;
    setModalError(null);

    if (targetStatus === 'REJECTED' && !adminFeedback.trim()) {
      setModalError('Para rechazar una solicitud de retiro es obligatorio proporcionar una justificación técnica o contable al productor.');
      return;
    }

    setIsAuditing(true);

    try {
      const payload: UpdatePayoutStatusPayload = {
        status: targetStatus,
        adminFeedback: adminFeedback.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
      };

      await apiFetch<PayoutRequest>(`/admin/payouts/${selectedPayout.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
        token: token || undefined,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      setStatusMessage(`La solicitud ${selectedPayout.id.slice(0, 8)} ha sido actualizada a estado "${PAYOUT_STATUS_LABELS[targetStatus]}".`);
      setSelectedPayout(null);
      await loadAdminPayouts();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setModalError(err.message);
      } else {
        setModalError('Error al actualizar el estado del retiro.');
      }
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      <GlobalHeader />

      {/* Migas de Pan Canónicas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/dashboard' },
            { label: 'Administración' },
            { label: 'Auditoría de Retiros' },
          ]}
        />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6 flex-1">
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Auditoría Contable de Retiros
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                Modo Administrador
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Supervisa las solicitudes de desembolso de los remixers, valida cuentas de cobro y autoriza transferencias.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={loadAdminPayouts}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl min-h-[44px]"
              id="refresh-admin-payouts-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Actualizar lista</span>
            </Button>
          </div>
        </div>

        {/* Notificaciones */}
        {statusMessage && (
          <Alert variant="success" className="py-3" id="admin-payout-status-alert">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <AlertTitle className="font-semibold text-xs sm:text-sm">Operación Exitosa</AlertTitle>
            <AlertDescription className="text-xs mt-0.5">{statusMessage}</AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="error" className="py-3" id="admin-payout-error-alert">
            <AlertCircle className="w-4 h-4" />
            <AlertTitle className="font-semibold text-xs sm:text-sm">Aviso de Auditoría</AlertTitle>
            <AlertDescription className="text-xs mt-0.5">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Métricas Financieras Flat SaaS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="admin-payout-metrics">
          {/* Pendientes de Aprobación */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pendientes de Revisión</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900" id="metric-pending-count">
                {pendingPayouts.length} {pendingPayouts.length === 1 ? 'retiro' : 'retiros'}
              </div>
              <p className="text-xs text-amber-700 font-bold mt-0.5">
                {pendingTotal.toFixed(2)} cr. por revisar
              </p>
            </div>
          </div>

          {/* En Proceso de Transferencia */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">En Transferencia</span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
                <RefreshCw className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900" id="metric-processing-count">
                {processingPayouts.length} {processingPayouts.length === 1 ? 'retiro' : 'retiros'}
              </div>
              <p className="text-xs text-sky-700 font-bold mt-0.5">
                {processingTotal.toFixed(2)} cr. en trámite bancario
              </p>
            </div>
          </div>

          {/* Total Desembolsado */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Liquidado</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900" id="metric-completed-total">
                ${completedTotal.toFixed(2)} USD
              </div>
              <p className="text-xs text-emerald-700 font-bold mt-0.5">
                {completedPayouts.length} transferencias completadas
              </p>
            </div>
          </div>
        </div>

        {/* Filtros de la Tabla */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0" id="admin-payout-status-filters">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'PENDING', label: 'Pendientes' },
              { id: 'PROCESSING', label: 'En Proceso' },
              { id: 'COMPLETED', label: 'Completados' },
              { id: 'REJECTED', label: 'Rechazados' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                id={`admin-filter-${f.id}`}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                  statusFilter === f.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="admin-search-payouts-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por productor, email o destino..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 min-h-[40px]"
            />
          </div>
        </div>

        {/* Tabla de Auditoría */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden" id="admin-payouts-table-card">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
              <span>Cargando solicitudes para auditoría...</span>
            </div>
          ) : filteredPayouts.length === 0 ? (
            <div className="p-12 text-center space-y-2" id="no-admin-payouts-state">
              <FileCheck2 className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">No se encontraron solicitudes de cobro</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No hay retiros registrados con los filtros de búsqueda actuales.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" id="admin-payouts-table">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">Código / Fecha</th>
                    <th className="px-5 py-3.5">Remixer / Productor</th>
                    <th className="px-5 py-3.5">Método y Destino</th>
                    <th className="px-5 py-3.5 text-right">Monto</th>
                    <th className="px-5 py-3.5 text-center">Estado</th>
                    <th className="px-5 py-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayouts.map((payout) => {
                    const badgeStyle = PAYOUT_STATUS_BADGES[payout.status] || 'bg-slate-100 text-slate-700 border-slate-200';
                    const statusText = PAYOUT_STATUS_LABELS[payout.status] || payout.status;
                    const methodText = PAYOUT_METHOD_LABELS[payout.method] || payout.method;

                    return (
                      <tr key={payout.id} id={`admin-payout-row-${payout.id}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="font-mono text-[11px] text-slate-500 block">
                            {payout.id.slice(0, 8)}...
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(payout.createdAt).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900">{payout.remixer?.username || 'Productor'}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">{payout.remixer?.email}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-800">{methodText}</div>
                          <div className="text-[11px] text-slate-500 font-mono truncate max-w-xs" title={payout.destination}>
                            {payout.destination}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="font-bold text-slate-900 text-sm">{payout.amountCredits.toFixed(2)} cr.</div>
                          <div className="text-[11px] text-emerald-700 font-semibold">
                            ${(payout.amountUsd || payout.amountCredits).toFixed(2)} USD
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeStyle}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenAuditModal(payout)}
                            className="text-xs min-h-[38px] px-3 py-1.5 gap-1.5"
                            id={`audit-payout-btn-${payout.id}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Auditar</span>
                          </Button>
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

      {/* Modal de Auditoría y Moderación Flat SaaS */}
      {selectedPayout && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200"
        >
          <div
            id="audit-payout-modal-content"
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] transform-gpu"
          >
            {/* Encabezado */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-700">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 id="audit-modal-title" className="text-base font-bold text-slate-900">
                  Auditar Solicitud de Retiro
                </h3>
              </div>
              <button
                type="button"
                id="close-audit-modal-btn"
                onClick={handleCloseAuditModal}
                disabled={isAuditing}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSaveAudit} noValidate className="p-6 space-y-4 overflow-y-auto">
              {modalError && (
                <Alert variant="error" className="py-2.5" id="audit-modal-error-alert">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="text-xs">{modalError}</AlertDescription>
                </Alert>
              )}

              {/* Ficha Resumen de la Solicitud */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Productor:</span>
                  <span className="font-bold text-slate-900">{selectedPayout.remixer?.username} ({selectedPayout.remixer?.email})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Monto:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedPayout.amountCredits.toFixed(2)} cr. (≈ ${(selectedPayout.amountUsd || selectedPayout.amountCredits).toFixed(2)} USD)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Método y Destino:</span>
                  <span className="font-mono text-slate-800">{PAYOUT_METHOD_LABELS[selectedPayout.method]}: {selectedPayout.destination}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Estado Actual:</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${PAYOUT_STATUS_BADGES[selectedPayout.status]}`}>
                    {PAYOUT_STATUS_LABELS[selectedPayout.status]}
                  </span>
                </div>
              </div>

              {/* Selector de Nuevo Estado */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Acción de Moderación / Nuevo Estado *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'APPROVED', label: 'Aprobar para Pago', desc: 'Valida fondos' },
                    { id: 'PROCESSING', label: 'En Proceso', desc: 'Transferencia bancaria' },
                    { id: 'COMPLETED', label: 'Completar y Liquidar', desc: 'Transferido al remixer' },
                    { id: 'REJECTED', label: 'Rechazar Retiro', desc: 'Reembolsa créditos' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      id={`status-option-${option.id}`}
                      onClick={() => setTargetStatus(option.id as PayoutStatus)}
                      className={`p-2.5 rounded-xl border text-left transition-colors duration-150 min-h-[44px] ${
                        targetStatus === option.id
                          ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-bold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-semibold">{option.label}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Justificación obligatoria en caso de rechazo */}
              {targetStatus === 'REJECTED' && (
                <div className="space-y-1.5">
                  <label htmlFor="audit-feedback-input" className="block text-xs font-semibold text-rose-700 uppercase tracking-wider">
                    Motivo de Rechazo para el Productor *
                  </label>
                  <textarea
                    id="audit-feedback-input"
                    value={adminFeedback}
                    onChange={(e) => setAdminFeedback(e.target.value)}
                    placeholder="Ejemplo: Cuenta PayPal no válida o datos bancarios incorrectos. Por favor actualiza tus datos."
                    rows={2}
                    required
                    disabled={isAuditing}
                    className="w-full px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50/30 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-colors duration-150"
                  />
                  <p className="text-[11px] text-slate-500">
                    Este mensaje se mostrará directamente en el panel del remixer para que pueda corregir los datos.
                  </p>
                </div>
              )}

              {/* Notas Internas de Contabilidad */}
              <div className="space-y-1.5">
                <label htmlFor="audit-notes-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Notas Internas de Auditoría (Opcional)
                </label>
                <input
                  type="text"
                  id="audit-notes-input"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="ID de transacción bancaria / referencia PayPal..."
                  disabled={isAuditing}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors duration-150 min-h-[44px]"
                />
              </div>

              {/* Botones del Modal */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseAuditModal}
                  disabled={isAuditing}
                  className="min-h-[44px] text-xs"
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={isAuditing}
                  className="min-h-[44px] text-xs gap-2"
                  id="confirm-audit-payout-btn"
                >
                  {isAuditing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Guardar Auditoría</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
