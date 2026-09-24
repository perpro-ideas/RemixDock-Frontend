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
  PayoutRequest,
  PayoutMethod,
  CreatePayoutRequestPayload,
  PAYOUT_STATUS_LABELS,
  PAYOUT_STATUS_BADGES,
  PAYOUT_METHOD_LABELS,
  StudioDashboardData,
} from '@/types/remixer.types';
import {
  DollarSign,
  Plus,
  ArrowLeft,
  RefreshCw,
  Shield,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  Send,
} from 'lucide-react';

export default function RemixerPayoutsPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading, token } = useAuth();
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [inReviewPayouts, setInReviewPayouts] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Formulario del Modal de Retiro
  const [amountCredits, setAmountCredits] = useState<number | ''>(20);
  const [method, setMethod] = useState<PayoutMethod>('PAYPAL');
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Cargar solicitudes de retiro
      const payoutsData = await apiFetch<PayoutRequest[] | { items?: PayoutRequest[]; data?: PayoutRequest[] }>(
        '/remixer/payouts',
        {
          token: token || undefined,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      const list = Array.isArray(payoutsData) ? payoutsData : payoutsData.items || payoutsData.data || [];
      setPayouts(list);

      // 2. Cargar balance de cabina
      try {
        const studioData = await apiFetch<StudioDashboardData>('/remixer/studio', {
          token: token || undefined,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setAvailableBalance(studioData.availableBalance || 0);
        setInReviewPayouts(studioData.inReviewPayouts || 0);
      } catch {
        // Fallback al cálculo local si no está el endpoint de studio
        const inReview = list
          .filter((p) => p.status === 'PENDING' || p.status === 'IN_REVIEW' || p.status === 'PROCESSING')
          .reduce((sum, p) => sum + p.amountCredits, 0);
        setInReviewPayouts(inReview);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('No fue posible cargar las solicitudes de retiro.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && (user?.role === 'REMIXER' || user?.role === 'ADMIN')) {
      loadData();
    }
  }, [isAuthLoading, isAuthenticated, user, loadData]);

  // Si no tiene permisos: pantalla de Acceso Restringido
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
              Esta sección está reservada exclusivamente para productores y remixers acreditados de RemixDock.
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

  const handleOpenModal = () => {
    setAmountCredits(availableBalance >= 20 ? 20 : availableBalance);
    setMethod('PAYPAL');
    setDestination(user?.email || '');
    setNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!isSubmitting) {
      setIsModalOpen(false);
      setFormError(null);
    }
  };

  const handleSubmitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const creditsNum = Number(amountCredits);

    if (isNaN(creditsNum) || creditsNum < 20) {
      setFormError('El monto mínimo para solicitar un retiro es de 20 créditos.');
      return;
    }

    if (creditsNum > availableBalance) {
      setFormError(`El monto solicitado (${creditsNum} cr.) supera tu saldo disponible (${availableBalance.toFixed(2)} cr.).`);
      return;
    }

    if (!destination.trim()) {
      setFormError('Por favor proporciona los datos de destino del cobro.');
      return;
    }

    if (method === 'PAYPAL' && !destination.includes('@')) {
      setFormError('Ingresa un correo electrónico de PayPal válido.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreatePayoutRequestPayload = {
        amountCredits: creditsNum,
        method,
        destination: destination.trim(),
        notes: notes.trim() || undefined,
      };

      await apiFetch<PayoutRequest>('/remixer/payouts', {
        method: 'POST',
        body: JSON.stringify(payload),
        token: token || undefined,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      setStatusMessage('¡Solicitud de retiro registrada con éxito! El equipo contable revisará tu transferencia.');
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFormError(err.message);
      } else {
        setFormError('Error al registrar la solicitud de retiro.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimatedUsd = amountCredits ? Number(amountCredits).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      <GlobalHeader />

      {/* Migas de Pan */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/dashboard' },
            { label: 'Studio de Producción', href: '/remixer/studio' },
            { label: 'Centro de Retiros' },
          ]}
        />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6 flex-1">
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <Link
                href="/remixer/studio"
                className="text-slate-400 hover:text-slate-700 transition-colors mr-1 p-1 rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-500"
                title="Volver al studio"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Centro de Retiros
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Transfiere tus regalías acumuladas a tu cuenta de PayPal o transferencia bancaria directa (tasa: 1 crédito = $1.00 USD).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={loadData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl min-h-[44px]"
              id="refresh-payouts-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={handleOpenModal}
              disabled={availableBalance < 20}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl min-h-[44px]"
              id="open-create-payout-btn"
              title={availableBalance < 20 ? 'Se requiere un mínimo de 20 créditos para solicitar retiros' : 'Solicitar retiro'}
            >
              <Plus className="w-4 h-4" />
              <span>Solicitar Retiro de Fondos</span>
            </Button>
          </div>
        </div>

        {/* Notificaciones */}
        {statusMessage && (
          <Alert variant="success" className="py-3" id="payout-success-alert">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <AlertTitle className="font-semibold text-xs sm:text-sm">Operación Exitosa</AlertTitle>
            <AlertDescription className="text-xs mt-0.5">{statusMessage}</AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="error" className="py-3" id="payout-error-alert">
            <AlertTitle className="font-semibold text-xs sm:text-sm">Aviso de Retiros</AlertTitle>
            <AlertDescription className="text-xs mt-0.5">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Tarjetas de Saldo Retirable Flat SaaS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="payout-balance-cards">
          {/* Saldo Líquido Disponible */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Saldo Líquido Retirable</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900" id="payout-available-balance">
                {availableBalance.toFixed(2)} cr.
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Equivalente exacto a <span className="font-bold text-slate-800">${availableBalance.toFixed(2)} USD</span>
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Umbral mínimo por retiro: 20 cr.</span>
              {availableBalance < 20 && (
                <span className="text-amber-700 font-medium">Saldo insuficiente para retiro</span>
              )}
            </div>
          </div>

          {/* Saldo en Revisión / Transferencia */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fondos en Trámite</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900" id="payout-in-review-balance">
                {inReviewPayouts.toFixed(2)} cr.
              </div>
              <p className="text-xs text-slate-500 mt-1">
                ≈ ${inReviewPayouts.toFixed(2)} USD en solicitudes pendientes o en proceso
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
              Tiempo estimado de liquidación contable: 24 a 48 horas hábiles
            </div>
          </div>
        </div>

        {/* Tabla de Historial de Retiros */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden" id="payouts-table-card">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Historial de Solicitudes de Cobro
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              {payouts.length} {payouts.length === 1 ? 'solicitud' : 'solicitudes'}
            </span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
              <span>Cargando solicitudes de retiro...</span>
            </div>
          ) : payouts.length === 0 ? (
            <div className="p-12 text-center space-y-2" id="no-payouts-state">
              <CreditCard className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">No tienes solicitudes de retiro registradas</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Cuando acumules al menos 20 créditos en regalías, podrás solicitar cobros directos por PayPal o transferencia bancaria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" id="payouts-table">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">Código</th>
                    <th className="px-5 py-3.5">Fecha</th>
                    <th className="px-5 py-3.5">Método y Destino</th>
                    <th className="px-5 py-3.5 text-right">Créditos</th>
                    <th className="px-5 py-3.5 text-right">Total USD</th>
                    <th className="px-5 py-3.5 text-center">Estado</th>
                    <th className="px-5 py-3.5">Notas de Auditoría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payouts.map((payout) => {
                    const badgeStyle = PAYOUT_STATUS_BADGES[payout.status] || 'bg-slate-100 text-slate-700 border-slate-200';
                    const statusText = PAYOUT_STATUS_LABELS[payout.status] || payout.status;
                    const methodText = PAYOUT_METHOD_LABELS[payout.method] || payout.method;

                    return (
                      <tr key={payout.id} id={`payout-row-${payout.id}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {payout.id.slice(0, 8)}...
                        </td>
                        <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                          {new Date(payout.createdAt).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-800">{methodText}</div>
                          <div className="text-[11px] text-slate-500 font-mono truncate max-w-xs" title={payout.destination}>
                            {payout.destination}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-slate-900 whitespace-nowrap">
                          {payout.amountCredits.toFixed(2)} cr.
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                          ${payout.amountUsd ? payout.amountUsd.toFixed(2) : payout.amountCredits.toFixed(2)} USD
                        </td>
                        <td className="px-5 py-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeStyle}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600 max-w-xs">
                          {payout.adminFeedback ? (
                            <span className="text-rose-700 font-medium bg-rose-50 px-2 py-1 rounded border border-rose-200 text-[11px] block">
                              {payout.adminFeedback}
                            </span>
                          ) : payout.adminNotes ? (
                            <span className="text-slate-500 text-[11px] italic">
                              {payout.adminNotes}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
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

      {/* Modal Accesible de Solicitud de Retiro Flat SaaS */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-payout-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            id="create-payout-modal-content"
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Encabezado del Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h3 id="create-payout-modal-title" className="text-base font-bold text-slate-900">
                  Solicitar Retiro de Fondos
                </h3>
              </div>
              <button
                type="button"
                id="close-payout-modal-btn"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmitPayout} noValidate className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <Alert variant="error" className="py-2.5" id="payout-modal-error-alert">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="text-xs">{formError}</AlertDescription>
                </Alert>
              )}

              {/* Información de Saldo Disponible */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Saldo disponible para cobro:</span>
                <span className="font-bold text-slate-900 text-sm">{availableBalance.toFixed(2)} cr.</span>
              </div>

              {/* Monto de Créditos y Conversión USD */}
              <div className="space-y-1.5">
                <label htmlFor="payout-amount-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Monto a Retirar (Mínimo 20 cr.) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="payout-amount-input"
                    value={amountCredits}
                    onChange={(e) => setAmountCredits(e.target.value === '' ? '' : Number(e.target.value))}
                    min={20}
                    max={availableBalance}
                    step={1}
                    required
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    créditos
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span>Equivalente en moneda: <strong className="text-emerald-700 font-bold">${estimatedUsd} USD</strong></span>
                  <button
                    type="button"
                    onClick={() => setAmountCredits(Math.floor(availableBalance))}
                    className="text-emerald-700 hover:text-emerald-800 font-semibold"
                  >
                    Retirar todo
                  </button>
                </div>
              </div>

              {/* Método de Cobro */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Método de Transferencia *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    id="method-paypal-btn"
                    onClick={() => {
                      setMethod('PAYPAL');
                      if (!destination || destination.includes('IBAN')) setDestination(user?.email || '');
                    }}
                    className={`p-3 rounded-xl border text-left transition-colors flex items-center gap-2.5 min-h-[44px] ${
                      method === 'PAYPAL'
                        ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="text-xs">PayPal</span>
                  </button>

                  <button
                    type="button"
                    id="method-bank-btn"
                    onClick={() => {
                      setMethod('BANK_TRANSFER');
                      if (destination.includes('@')) setDestination('');
                    }}
                    className={`p-3 rounded-xl border text-left transition-colors flex items-center gap-2.5 min-h-[44px] ${
                      method === 'BANK_TRANSFER'
                        ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="text-xs">Transferencia Bancaria</span>
                  </button>
                </div>
              </div>

              {/* Destino de la Transferencia */}
              <div className="space-y-1.5">
                <label htmlFor="payout-destination-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {method === 'PAYPAL' ? 'Correo Electrónico de PayPal *' : 'Datos Bancarios / IBAN *'}
                </label>
                <input
                  type={method === 'PAYPAL' ? 'email' : 'text'}
                  id="payout-destination-input"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={method === 'PAYPAL' ? 'tu-cuenta-paypal@ejemplo.com' : 'IBAN: ES00 0000 0000 0000 0000'}
                  required
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>

              {/* Notas Opcionales */}
              <div className="space-y-1.5">
                <label htmlFor="payout-notes-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Notas para Contabilidad (Opcional)
                </label>
                <textarea
                  id="payout-notes-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles adicionales sobre el cobro o facturación..."
                  rows={2}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Botones de Acción */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="min-h-[44px] text-xs"
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className="min-h-[44px] text-xs gap-2"
                  id="confirm-submit-payout-btn"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Enviando solicitud...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Confirmar Solicitud de Retiro</span>
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
