'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  User as UserIcon,
  LayoutDashboard,
  FolderHeart,
  Disc3,
  Shield,
  LogOut,
  ChevronDown,
  Music2,
  ListChecks,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export interface UserDropdownProps {
  className?: string;
}

/**
 * Menú de Usuario Desplegable Canónico (UserDropdown)
 * Aplica Heurísticas 4 y 8 de Nielsen y el estándar WCAG 2.1 AA:
 * - Touch target >= 44px
 * - Foco visible focus-visible:ring-2 focus-visible:ring-emerald-500
 * - Cierre accesible con tecla Escape y clic exterior
 */
export function UserDropdown({ className = '' }: UserDropdownProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Cerrar accesiblemente con tecla Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setIsOpen(false);
      const isProtectedRoute =
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/admin') ||
        pathname.startsWith('/profile') ||
        pathname.startsWith('/library') ||
        pathname.startsWith('/requests');
      if (isProtectedRoute) {
        router.push('/login');
      }
    } catch {
      setIsLoggingOut(false);
    }
  }, [logout, router, pathname]);

  if (!user) return null;

  const initials = (user.username || user.email || 'D')
    .slice(0, 2)
    .toUpperCase();
  const isAdmin = user.role === 'ADMIN';

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      {/* Botón Disparador Accesible */}
      <button
        ref={triggerRef}
        type="button"
        id="user-menu-button"
        data-testid="user-menu-button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Menú de usuario para ${user.username}`}
        className="flex items-center gap-2 px-2 py-1.5 sm:px-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] min-w-[44px] text-slate-700 shadow-sm"
      >
        {/* Avatar Circular con Iniciales */}
        <div
          className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200/80 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 select-none"
          aria-hidden="true"
        >
          {initials}
        </div>

        {/* Nombre de Usuario (desktop) */}
        <span className="hidden md:inline text-xs font-semibold text-slate-900 truncate max-w-[120px]">
          {user.username}
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Menú Desplegable Flotante */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu-button"
          className="absolute right-0 mt-2 w-64 sm:w-72 rounded-2xl bg-white border border-slate-200/90 shadow-xl py-2 z-50 focus:outline-none animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Encabezado: Identidad de la Cuenta */}
          <div className="px-4 py-2.5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm"
                aria-hidden="true"
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {user.username}
                </p>
                <p className="text-xs text-slate-500 truncate" title={user.email}>
                  {user.email}
                </p>
                <div className="mt-1">
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Shield className="w-3 h-3" aria-hidden="true" />
                      <span>Administrador</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      DJ Usuario
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sección Personal: Estudio y Perfil */}
          <div className="py-1.5">
            <Link
              href="/dashboard"
              role="menuitem"
              id="landing-dashboard-link"
              data-testid="user-dropdown-dashboard-link"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:bg-slate-50 min-h-[40px]"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span>Mi Estudio / Dashboard</span>
            </Link>

            <Link
              href="/library"
              role="menuitem"
              id="user-dropdown-library-link"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:bg-slate-50 min-h-[40px]"
            >
              <FolderHeart className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span>Mi Biblioteca Musical</span>
            </Link>

            <Link
              href="/requests"
              role="menuitem"
              id="user-dropdown-requests-link"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:bg-slate-50 min-h-[40px]"
            >
              <Music2 className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span>Mis Peticiones</span>
            </Link>

            <Link
              href="/profile"
              role="menuitem"
              id="edit-profile-header-btn"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:bg-slate-50 min-h-[40px]"
            >
              <UserIcon className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span>Mi Perfil y Seguridad</span>
            </Link>
          </div>

          {/* Sección Administrativa (Solo Rol ADMIN) */}
          {isAdmin && (
            <div className="border-t border-slate-100 pt-2 pb-1.5">
              <div className="px-4 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                ADMINISTRACIÓN
              </div>
              <Link
                href="/admin/tracks"
                role="menuitem"
                id="admin-tracks-header-btn"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-violet-700 hover:bg-violet-50 transition-colors focus-visible:outline-none focus-visible:bg-violet-50 min-h-[40px]"
              >
                <Disc3 className="w-4 h-4 text-violet-600" aria-hidden="true" />
                <span>Gestión de Tracks</span>
              </Link>

              <Link
                href="/admin/plans"
                role="menuitem"
                id="admin-plans-header-btn"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-violet-700 hover:bg-violet-50 transition-colors focus-visible:outline-none focus-visible:bg-violet-50 min-h-[40px]"
              >
                <Shield className="w-4 h-4 text-violet-600" aria-hidden="true" />
                <span>Administración de Planes</span>
              </Link>

              <Link
                href="/admin/requests"
                role="menuitem"
                id="admin-requests-header-btn"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-violet-700 hover:bg-violet-50 transition-colors focus-visible:outline-none focus-visible:bg-violet-50 min-h-[40px]"
              >
                <ListChecks className="w-4 h-4 text-violet-600" aria-hidden="true" />
                <span>Gestión de Peticiones</span>
              </Link>
            </div>
          )}

          {/* Separador Inferior y Cerrar Sesión */}
          <div className="border-t border-slate-100 pt-1.5">
            <button
              type="button"
              id="landing-logout-btn"
              data-testid="user-dropdown-logout-btn"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-red-600 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:bg-red-50 min-h-[44px] text-left"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4 text-slate-500 group-hover:text-red-600" aria-hidden="true" />
              <span>{isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
