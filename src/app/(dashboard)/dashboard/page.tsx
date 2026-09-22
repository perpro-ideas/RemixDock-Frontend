'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useCredits } from '@/hooks/use-credits';
import { GlobalHeader } from '@/components/layout/global-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Role } from '@/types/auth.types';
import { CreditEntryType } from '@/types/credits.types';
import {
  Disc3,
  User as UserIcon,
  Mail,
  Shield,
  Calendar,
  Compass,
  FolderHeart,
  Sparkles,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  History,
  Music2,
  ListChecks,
} from 'lucide-react';

const roleBadgeStyles: Record<Role, { label: string; className: string }> = {
  ADMIN: {
    label: 'Administrador',
    className: 'bg-slate-100 text-slate-800 border border-slate-200 rounded-full px-3 py-1 font-medium text-xs',
  },
  REMIXER: {
    label: 'Remixer',
    className: 'bg-teal-50 text-teal-700 border border-teal-200/80 rounded-full px-3 py-1 font-medium text-xs',
  },
  USER: {
    label: 'Usuario / DJ',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full px-3 py-1 font-medium text-xs',
  },
};

const movementTypeLabels: Record<CreditEntryType, string> = {
  PLAN_SUBSCRIPTION: 'Membresía',
  TOPUP_PURCHASE: 'Recarga de Créditos',
  REMIX_DOWNLOAD: 'Descarga',
  REMIX_REQUEST: 'Petición Exclusiva',
  ADMIN_ADJUSTMENT: 'Ajuste de Cuenta',
};

const movementTypeBadgeStyles: Record<string, { label: string; className: string }> = {
  PLAN_SUBSCRIPTION: {
    label: 'Membresía',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  SUBSCRIPTION: {
    label: 'Membresía',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  TOPUP_PURCHASE: {
    label: 'Recarga de Créditos',
    className: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  TOPUP: {
    label: 'Recarga de Créditos',
    className: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  REMIX_DOWNLOAD: {
    label: 'Descarga',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  REMIX_REQUEST: {
    label: 'Petición Exclusiva',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  ADMIN_ADJUSTMENT: {
    label: 'Ajuste de Cuenta',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
};

function formatMovementDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const {
    balance,
    history,
    isLoading: isCreditsLoading,
    refetch: refetchCredits,
  } = useCredits();

  const [isRefreshingCredits, setIsRefreshingCredits] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleManualRefetch = async () => {
    try {
      setIsRefreshingCredits(true);
      await refetchCredits();
    } finally {
      setIsRefreshingCredits(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Disc3 className="w-6 h-6 animate-spin" aria-hidden="true" />
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Cargando cuenta...
          </p>
        </div>
      </div>
    );
  }

  const roleInfo = roleBadgeStyles[user.role] || {
    label: user.role,
    className: 'bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-3 py-1 font-medium text-xs',
  };

  const formattedDate = user.createdAt
    ? new Intl.DateTimeFormat('es-ES', {
        dateStyle: 'medium',
      }).format(new Date(user.createdAt))
    : 'No disponible';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header Canónico Global */}
      <GlobalHeader maxWidth="6xl" />

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Welcome Banner: Minimalist Flat SaaS */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-8 shadow-sm">
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            ¡Hola de nuevo, {user.username}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">
            Administra tu cuenta, revisa tus remixes y accede a tu biblioteca musical.
          </p>
        </section>

        {/* Acceso Rápido a Mi Biblioteca (REM-113) */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" id="dashboard-library-banner">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200/70 flex items-center justify-center text-teal-700 shrink-0">
              <FolderHeart className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Mi Biblioteca Musical
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Accede a tus pistas adquiridas y stems listos para re-descargar de inmediato sin costo.
              </p>
            </div>
          </div>
          <Link
            href="/library"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] shrink-0 w-full sm:w-auto"
            id="dashboard-library-panel-btn"
          >
            <span>Ver mis adquisiciones</span>
            <ArrowUpRight className="w-4 h-4 text-slate-500" aria-hidden="true" />
          </Link>
        </section>

        {/* Billetera y Balance de Créditos (REM-71) */}
        <section aria-labelledby="credits-section-title" className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 id="credits-section-title" className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" aria-hidden="true" />
                <span>Billetera y Balance de Créditos</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 sm:line-clamp-none">
                Gestiona tus créditos para la descarga de pistas y stems multipista.
              </p>
            </div>
            <button
              type="button"
              onClick={handleManualRefetch}
              disabled={isRefreshingCredits || isCreditsLoading}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] min-w-[44px] shrink-0"
              aria-label="Actualizar balance de créditos"
              id="refresh-credits-btn"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-slate-500 ${isRefreshingCredits || isCreditsLoading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tarjeta de Saldo Destacado */}
            <Card className="lg:col-span-1 flex flex-col justify-between border-slate-200/80" id="credits-balance-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Saldo disponible
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    Activo
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight" id="dashboard-credits-balance">
                    {isCreditsLoading ? '...' : balance}
                  </span>
                  <span className="text-sm font-semibold text-emerald-700">
                    {balance === 1 ? 'crédito disponible' : 'créditos disponibles'}
                  </span>
                </div>
                <CardDescription className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Cada crédito te permite adquirir remixes inéditos y packs de stems directos de estudio.
                </CardDescription>
              </CardHeader>

              <CardFooter className="pt-2 pb-5 border-t border-slate-100 flex flex-col gap-2">
                <Link
                  href="/pricing?tab=credits"
                  id="recharge-credits-btn"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  <span>Obtener más créditos</span>
                </Link>
                <p className="text-[11px] text-slate-400 text-center">
                  Suscripciones mensuales o paquetes de recarga inmediata.
                </p>
              </CardFooter>
            </Card>

            {/* Historial de Movimientos Recientes */}
            <Card className="lg:col-span-2 border-slate-200/80" id="credits-history-card">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    <span>Movimientos Recientes</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Historial de recargas de saldo y descargas de música.
                  </CardDescription>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  Últimos movimientos
                </span>
              </CardHeader>

              <CardContent className="pt-0">
                {history.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200" id="empty-credits-history">
                    <Wallet className="w-8 h-8 text-slate-400 mx-auto mb-2" aria-hidden="true" />
                    <p className="text-sm font-semibold text-slate-700">Sin movimientos registrados</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Aún no has realizado recargas ni descargas con créditos en tu cuenta.
                    </p>
                    <div className="mt-4">
                      <Link
                        href="/pricing?tab=credits"
                        className="inline-flex items-center text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded min-h-[44px] px-2 py-1"
                      >
                        Ver planes y adquirir créditos →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Desktop View: Table */}
                    <div className="overflow-x-auto hidden sm:block" id="credits-history-table">
                      <table className="w-full text-left border-collapse" aria-label="Historial de movimientos de créditos">
                        <thead>
                          <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                            <th scope="col" className="py-2.5 px-3">Concepto</th>
                            <th scope="col" className="py-2.5 px-3">Tipo</th>
                            <th scope="col" className="py-2.5 px-3">Fecha</th>
                            <th scope="col" className="py-2.5 px-3 text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {history.map((entry) => {
                            const isPositive = entry.amount > 0;
                            return (
                              <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-3 px-3 font-medium text-slate-900">
                                  <div className="flex items-center gap-2">
                                    {isPositive ? (
                                      <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-200/60 flex items-center justify-center shrink-0">
                                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                                      </div>
                                    ) : (
                                      <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200/60 flex items-center justify-center shrink-0">
                                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                                      </div>
                                    )}
                                    <span className="truncate max-w-[220px] sm:max-w-xs">{entry.description}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                                  <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200/60">
                                    {movementTypeLabels[entry.type] || entry.type}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                                  {formatMovementDate(entry.createdAt)}
                                </td>
                                <td className="py-3 px-3 text-right whitespace-nowrap">
                                  {isPositive ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                      +{entry.amount} cr.
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                                      {entry.amount} cr.
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View: Stacked Cards */}
                    <div className="block sm:hidden space-y-2.5" id="credits-history-mobile-list">
                      {history.map((entry) => {
                        const isPositive = entry.amount > 0;
                        return (
                          <div
                            key={entry.id}
                            className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {isPositive ? (
                                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center shrink-0">
                                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                                </div>
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/60 flex items-center justify-center shrink-0">
                                  <ArrowUpRight className="w-4 h-4 text-slate-600" aria-hidden="true" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-900 truncate">
                                  {entry.description}
                                </p>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1 flex-wrap">
                                  {(() => {
                                    const badge = movementTypeBadgeStyles[entry.type] || {
                                      label: movementTypeLabels[entry.type] || entry.type,
                                      className: 'bg-slate-100 text-slate-700 border-slate-200',
                                    };
                                    return (
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.className}`}
                                      >
                                        {badge.label}
                                      </span>
                                    );
                                  })()}
                                  <span>•</span>
                                  <span>{formatMovementDate(entry.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              {isPositive ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                  +{entry.amount} cr.
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                                  {entry.amount} cr.
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Profile Details & Quick Access Modules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle>Detalles de la Cuenta</CardTitle>
                <CardDescription className="mt-1">
                  Información de perfil y credenciales asociadas a tu cuenta.
                </CardDescription>
              </div>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] self-start sm:self-auto"
                id="edit-profile-card-btn"
              >
                <UserIcon className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                <span>Editar perfil</span>
              </Link>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <UserIcon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block font-medium">Nombre de usuario</span>
                    <span className="text-sm font-semibold text-slate-900">{user.username}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <Mail className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block font-medium">Correo electrónico</span>
                    <span className="text-sm font-semibold text-slate-900 break-all">{user.email}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <Shield className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block font-medium">Rol de usuario</span>
                    <span className="text-sm font-semibold text-slate-900">{roleInfo.label}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <Calendar className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block font-medium">Fecha de registro</span>
                    <span className="text-sm font-semibold text-slate-900">{formattedDate}</span>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-slate-400 pt-4">
              <span>ID de cuenta: {user.id}</span>
              <Link
                href="/profile"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
              >
                Seguridad y contraseña →
              </Link>
            </CardFooter>
          </Card>

          {/* Platform Modules: Flat SaaS style */}
          <Card>
            <CardHeader>
              <CardTitle>Plataforma Musical</CardTitle>
              <CardDescription>
                Acceso a módulos de catálogo y descargas.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Grupo 1: Cabina y Catálogo */}
              <div className="space-y-2">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                  CABINA Y CATÁLOGO
                </div>

                <Link
                  href="/catalog"
                  className="block p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 text-xs space-y-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  id="dashboard-catalog-card-link"
                >
                  <div className="flex items-center gap-2 text-slate-900 font-semibold">
                    <Compass className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                    <span>Catálogo de Remixes</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Explora y reproduce versiones exclusivas de la comunidad.
                  </p>
                </Link>

                <Link
                  href="/library"
                  className="block p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 hover:border-slate-300 active:bg-slate-100 border border-slate-200/80 text-xs space-y-1 cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
                  id="dashboard-library-module-link"
                >
                  <div className="flex items-center gap-2 text-slate-900 font-semibold">
                    <FolderHeart className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                    <span>Mi Biblioteca</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Accede a tus pistas descargadas y stems adquiridos sin costo.
                  </p>
                </Link>

                <Link
                  href="/requests"
                  className="block p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 hover:border-slate-300 active:bg-slate-100 border border-slate-200/80 text-xs space-y-1 cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
                  id="dashboard-requests-card-link"
                >
                  <div className="flex items-center gap-2 text-slate-900 font-semibold">
                    <Music2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                    <span>Peticiones de Remixes</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Encarga versiones exclusivas para tu repertorio con tu cupo o créditos.
                  </p>
                </Link>

                <Link
                  href="/pricing?tab=plans"
                  className="block p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 text-xs space-y-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  id="explore-plans-link"
                >
                  <div className="flex items-center gap-2 text-slate-900 font-semibold">
                    <Sparkles className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                    <span>Planes de Suscripción</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Membresías con acceso a stems exclusivos y descargas directas.
                  </p>
                </Link>
              </div>

              {/* Grupo 2: Administración (Solo Admin) */}
              {user.role === 'ADMIN' && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                    ADMINISTRACIÓN
                  </div>

                  <Link
                    href="/admin/tracks"
                    className="block p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 text-xs space-y-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer"
                    id="admin-tracks-card-link"
                  >
                    <div className="flex items-center gap-2 text-slate-900 font-semibold">
                      <Disc3 className="w-4 h-4 text-violet-600" aria-hidden="true" />
                      <span>Gestión de Tracks y Stems</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Sube, edita metadatos y publica nuevas pistas y stems multipista.
                    </p>
                  </Link>

                  <Link
                    href="/admin/plans"
                    className="block p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 text-xs space-y-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer"
                    id="admin-plans-card-link"
                  >
                    <div className="flex items-center gap-2 text-slate-900 font-semibold">
                      <Shield className="w-4 h-4 text-violet-600" aria-hidden="true" />
                      <span>Administración de Planes</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Gestiona el catálogo de membresías, precios y visibilidad.
                    </p>
                  </Link>

                  <Link
                    href="/admin/requests"
                    className="block p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 text-xs space-y-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer"
                    id="admin-requests-card-link"
                  >
                    <div className="flex items-center gap-2 text-slate-900 font-semibold">
                      <ListChecks className="w-4 h-4 text-violet-600" aria-hidden="true" />
                      <span>Gestión de Peticiones</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Supervisa, asigna productores y entrega remixes a la comunidad.
                    </p>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
