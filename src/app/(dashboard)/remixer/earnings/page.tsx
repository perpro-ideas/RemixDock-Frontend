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
  RemixerEarning,
  EARNING_TYPE_LABELS,
  EARNING_TYPE_BADGES,
} from '@/types/remixer.types';
import {
  Download,
  Sparkles,
  ArrowDownLeft,
  Search,
  RefreshCw,
  Shield,
  FileSpreadsheet,
  ArrowLeft,
} from 'lucide-react';

export default function RemixerEarningsPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading, token } = useAuth();
  const [earnings, setEarnings] = useState<RemixerEarning[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadEarnings = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await apiFetch<RemixerEarning[] | { items?: RemixerEarning[]; data?: RemixerEarning[] }>(
        '/remixer/earnings',
        {
          token: token || undefined,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      const list = Array.isArray(data) ? data : data.items || data.data || [];
      setEarnings(list);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('No fue posible cargar el libro mayor de ganancias.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && (user?.role === 'REMIXER' || user?.role === 'ADMIN')) {
      loadEarnings();
    }
  }, [isAuthLoading, isAuthenticated, user, loadEarnings]);

  // Métricas acumuladas del libro mayor
  const totalRoyalties = earnings
    .filter((e) => e.type === 'ROYALTY_DOWNLOAD')
    .reduce((sum, e) => sum + e.amountCredits, 0);

  const totalBounties = earnings
    .filter((e) => e.type === 'REMIX_BOUNTY')
    .reduce((sum, e) => sum + e.amountCredits, 0);

  const totalPayouts = earnings
    .filter((e) => e.type === 'PAYOUT_DEDUCTION')
    .reduce((sum, e) => sum + Math.abs(e.amountCredits), 0);

  // Filtrado reactivo
  const filteredEarnings = useMemo(() => {
    return earnings.filter((earning) => {
      // Filtro por tipo
      if (typeFilter !== 'ALL' && earning.type !== typeFilter) {
        return false;
      }

      // Filtro por búsqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDesc = earning.description?.toLowerCase().includes(query);
        const matchesTrack = earning.track?.title?.toLowerCase().includes(query) || earning.track?.artist?.toLowerCase().includes(query);
        const matchesRequest = earning.request?.title?.toLowerCase().includes(query);
        return matchesDesc || matchesTrack || matchesRequest;
      }

      return true;
    });
  }, [earnings, typeFilter, searchQuery]);

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      <GlobalHeader />

      {/* Migas de Pan Canónicas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/dashboard' },
            { label: 'Studio de Producción', href: '/remixer/studio' },
            { label: 'Libro Mayor de Ganancias' },
          ]}
        />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6 flex-1">
        {/* Encabezado Principal */}
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
                Libro Mayor de Ganancias
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Registro contable inmutable de todas las regalías por descargas de catálogo, recompensas Bounty de cabina y retiros realizados.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={loadEarnings}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl min-h-[44px]"
              id="refresh-earnings-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Actualizar libro</span>
            </Button>

            <Link href="/remixer/payouts">
              <Button
                variant="primary"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl min-h-[44px]"
              >
                <span>Centro de Retiros</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Notificaciones */}
        {errorMessage && (
          <Alert variant="error" className="py-3" id="earnings-error-alert">
            <AlertTitle className="font-semibold text-xs sm:text-sm">Aviso Contable</AlertTitle>
            <AlertDescription className="text-xs mt-0.5">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* 3 Tarjetas de Resumen Contable Flat SaaS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="earnings-summary-cards">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Regalías de Catálogo</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <Download className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900" id="summary-royalties-total">
              +{totalRoyalties.toFixed(2)} cr.
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Generado por adquisición de tracks y stems
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recompensas de Encargo</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900" id="summary-bounties-total">
              +{totalBounties.toFixed(2)} cr.
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ganado por encargos completados en estudio
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Retiros Desembolsados</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900" id="summary-payouts-total">
              -{totalPayouts.toFixed(2)} cr.
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Transferido a tus cuentas de cobro
            </p>
          </div>
        </div>

        {/* Barra de Filtros Flat SaaS */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Selector de Tipo */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0" id="earnings-type-filters">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'ROYALTY_DOWNLOAD', label: 'Descargas' },
              { id: 'REMIX_BOUNTY', label: 'Encargos Bounty' },
              { id: 'PAYOUT_DEDUCTION', label: 'Retiros' },
              { id: 'PLATFORM_ADJUSTMENT', label: 'Ajustes' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                id={`filter-type-${f.id}`}
                onClick={() => setTypeFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                  typeFilter === f.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Buscador Reactivo */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="search-earnings-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por pista o concepto..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 min-h-[40px]"
            />
          </div>
        </div>

        {/* Tabla del Libro Mayor */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden" id="earnings-table-card">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
              <span>Cargando movimientos contables...</span>
            </div>
          ) : filteredEarnings.length === 0 ? (
            <div className="p-12 text-center space-y-2" id="no-earnings-state">
              <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">No se encontraron movimientos contables</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No hay registros que coincidan con los filtros aplicados.
              </p>
              {(typeFilter !== 'ALL' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Restablecer filtros
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" id="earnings-table">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">Fecha y Hora</th>
                    <th className="px-5 py-3.5">Tipo de Movimiento</th>
                    <th className="px-5 py-3.5">Concepto / Pista Asociada</th>
                    <th className="px-5 py-3.5 text-right">Créditos</th>
                    <th className="px-5 py-3.5 text-right">Equivalente USD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEarnings.map((earning) => {
                    const isPositive = earning.amountCredits > 0;
                    const badgeStyle = EARNING_TYPE_BADGES[earning.type] || 'bg-slate-100 text-slate-700 border-slate-200';
                    const label = EARNING_TYPE_LABELS[earning.type] || earning.type;

                    return (
                      <tr key={earning.id} id={`earning-row-${earning.id}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                          {new Date(earning.createdAt).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeStyle}`}>
                            {label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-900 font-medium">
                          <div>
                            <span>{earning.track?.title || earning.request?.title || earning.description}</span>
                            {earning.track?.artist && (
                              <span className="block text-[11px] text-slate-500 font-normal">
                                Artista: {earning.track.artist}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`px-5 py-4 text-right font-bold whitespace-nowrap text-sm ${isPositive ? 'text-emerald-700' : 'text-slate-700'}`}>
                          {isPositive ? `+${earning.amountCredits.toFixed(2)} cr.` : `${earning.amountCredits.toFixed(2)} cr.`}
                        </td>
                        <td className="px-5 py-4 text-right text-slate-600 whitespace-nowrap font-medium text-xs">
                          ${Math.abs(earning.amountUsd || earning.amountCredits).toFixed(2)} USD
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
    </div>
  );
}
