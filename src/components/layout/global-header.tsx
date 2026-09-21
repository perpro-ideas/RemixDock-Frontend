'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Disc3, Sparkles, FolderHeart, Compass } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { CreditsBadge } from '@/components/credits/credits-badge';
import { UserDropdown } from './user-dropdown';

export interface GlobalHeaderProps {
  className?: string;
  maxWidth?: '7xl' | '6xl' | '4xl' | 'full';
}

/**
 * Header Global Canónico de RemixDock
 * Diseñado según Heurísticas 4 y 8 de Nielsen y WCAG 2.1 AA:
 * - Logo a la izquierda
 * - Navegación directa y concisa: Catálogo, Mi Biblioteca, Planes
 * - Zona derecha: CreditsBadge + UserDropdown (o Iniciar sesión)
 * - Cero saturación visual ni botones dispersos
 */
export function GlobalHeader({ className = '', maxWidth = '7xl' }: GlobalHeaderProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();

  const maxWidthClass =
    maxWidth === '6xl'
      ? 'max-w-6xl'
      : maxWidth === '4xl'
      ? 'max-w-4xl'
      : maxWidth === 'full'
      ? 'max-w-full'
      : 'max-w-7xl';

  const isCatalog = pathname.startsWith('/catalog');
  const isLibrary = pathname.startsWith('/library');
  const isPlans = pathname.startsWith('/plans');

  return (
    <header className={`border-b border-slate-200/80 bg-white sticky top-0 z-40 ${className}`}>
      <div className={`${maxWidthClass} mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2`}>
        {/* Marca / Logotipo */}
        <Link
          href="/"
          id="global-header-logo-link"
          aria-label="Ir a la página de inicio"
          className="flex items-center gap-1.5 sm:gap-2 text-slate-900 font-bold text-base sm:text-lg tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg p-1 transition-opacity hover:opacity-95 shrink-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Disc3 className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </div>
          <span className="font-extrabold tracking-tight hidden min-[500px]:inline">
            Remix<span className="text-emerald-600">Dock</span>
          </span>
        </Link>

        {/* Navegación Principal Limpia */}
        <nav aria-label="Navegación principal" className="flex items-center gap-0.5 sm:gap-1.5">
          <Link
            href="/catalog"
            id="nav-catalog-link"
            aria-label="Ir al Catálogo de Remixes"
            className={`min-h-[44px] px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-xl transition-colors inline-flex items-center gap-1 sm:gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              isCatalog
                ? 'bg-slate-100 text-slate-900 font-semibold border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Compass className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span className="hidden min-[480px]:inline">Catálogo</span>
          </Link>

          <Link
            href="/library"
            id="nav-library-link"
            aria-label="Ir a Mi Biblioteca"
            className={`min-h-[44px] px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-xl transition-colors inline-flex items-center gap-1 sm:gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              isLibrary
                ? 'bg-slate-100 text-slate-900 font-semibold border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FolderHeart className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span className="hidden md:inline">Mi Biblioteca</span>
          </Link>

          <Link
            href="/plans"
            id="nav-plans-link"
            aria-label="Ver Planes de Suscripción"
            className={`min-h-[44px] px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-xl transition-colors inline-flex items-center gap-1 sm:gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              isPlans
                ? 'bg-slate-100 text-slate-900 font-semibold border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>Planes</span>
          </Link>
        </nav>

        {/* Zona de Estado y Cuenta */}
        <div className="flex items-center gap-1.5 sm:gap-3 justify-end shrink-0">
          {isLoading ? (
            <div className="h-9 w-20 sm:w-24 bg-slate-100 animate-pulse rounded-xl" />
          ) : isAuthenticated ? (
            <>
              <CreditsBadge />
              <UserDropdown />
            </>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/login"
                id="landing-login-link"
                className="min-h-[44px] px-2.5 sm:px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                id="landing-register-link"
                className="min-h-[44px] px-2.5 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm transition-all inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                Crear cuenta
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
