'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Role } from '@/types/auth.types';
import {
  Disc3,
  LogOut,
  User as UserIcon,
  Mail,
  Shield,
  Calendar,
  Compass,
  FolderHeart,
  Settings,
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

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.push('/login');
    } catch {
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
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
      {/* Navigation Header */}
      <header className="border-b border-slate-200/80 bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <Disc3 className="w-5 h-5" aria-hidden="true" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">
              Remix<span className="text-emerald-600">Dock</span>{' '}
              <span className="text-xs text-slate-400 font-normal ml-1 border-l border-slate-200 pl-2">
                Studio
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className={roleInfo.className}>
              {roleInfo.label}
            </span>

            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
              id="edit-profile-header-btn"
            >
              <Settings className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span>Editar perfil</span>
            </Link>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              isLoading={isLoggingOut}
              loadingText="Cerrando sesión..."
              className="gap-2"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>Cerrar sesión</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Welcome Banner: Minimalist Flat SaaS */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            ¡Hola de nuevo, {user.username}!
          </h1>
          <p className="text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">
            Administra tu cuenta, revisa tus remixes y accede a tu biblioteca musical.
          </p>
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

            <CardContent className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                <div className="flex items-center gap-2 text-slate-900 font-semibold">
                  <Compass className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                  <span>Catálogo de Remixes</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Explora y reproduce versiones exclusivas de la comunidad.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                <div className="flex items-center gap-2 text-slate-900 font-semibold">
                  <FolderHeart className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                  <span>Mi Biblioteca</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Accede a tus pistas descargadas y solicitudes activas.
                </p>
              </div>
            </CardContent>

            <CardFooter className="border-t border-slate-100">
              <Button
                variant="secondary"
                onClick={handleLogout}
                isLoading={isLoggingOut}
                loadingText="Cerrando sesión..."
                className="w-full"
              >
                Cerrar sesión
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
