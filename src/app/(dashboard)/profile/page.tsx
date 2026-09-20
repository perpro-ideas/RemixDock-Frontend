'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ApiClientError, apiFetch } from '@/lib/api-client';
import { Role, User, ChangePasswordResponse } from '@/types/auth.types';
import {
  Disc3,
  ArrowLeft,
  User as UserIcon,
  Mail,
  Shield,
  KeyRound,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { CreditsBadge } from '@/components/credits/credits-badge';


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

export default function ProfilePage() {
  const router = useRouter();
  const { user, accessToken, isLoading, isAuthenticated, updateUser, logout } = useAuth();

  // Estados Formulario 1: Datos de la Cuenta (REM-42)
  const [username, setUsername] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState<string | null>(null);
  const [profileErrorMessage, setProfileErrorMessage] = useState<string | null>(null);

  // Estados Formulario 2: Seguridad y Contraseña (REM-48)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<string | null>(null);
  const [passwordValidationErrors, setPasswordValidationErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const isRedirectingRef = useRef(false);

  // Proteger ruta privada y prellenar datos
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isRedirectingRef.current) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user?.username) {
      setUsername(user.username);
    }
  }, [user?.username]);

  // Manejo de guardado de perfil (REM-42)
  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileSuccessMessage(null);
    setProfileErrorMessage(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setProfileErrorMessage('El nombre de usuario no puede estar vacío.');
      return;
    }

    if (trimmedUsername === user?.username) {
      setProfileErrorMessage('El nombre ingresado es idéntico a tu nombre actual.');
      return;
    }

    try {
      setIsSavingProfile(true);
      const updatedUser = await apiFetch<User>('/users/profile', {
        method: 'PATCH',
        body: JSON.stringify({ username: trimmedUsername }),
        token: accessToken,
      });

      // Actualizar inmediatamente en memoria para reflejarlo en toda la aplicación
      updateUser({ username: updatedUser.username || trimmedUsername });
      setProfileSuccessMessage('Tu nombre de usuario se actualizó correctamente.');
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 409) {
          setProfileErrorMessage('Este nombre de usuario ya está en uso. Elige uno diferente.');
        } else if (err.statusCode === 400) {
          setProfileErrorMessage(err.message || 'El formato del nombre de usuario no es válido.');
        } else {
          setProfileErrorMessage(err.message || 'No fue posible actualizar tu perfil. Inténtalo nuevamente.');
        }
      } else {
        setProfileErrorMessage('No fue posible contactar al servidor. Revisa tu conexión.');
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Manejo de cambio seguro de contraseña (REM-48)
  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordSuccessMessage(null);
    setPasswordErrorMessage(null);
    setPasswordValidationErrors({});

    const errors: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (!currentPassword) {
      errors.currentPassword = 'Por favor ingresa tu contraseña actual.';
    }

    if (!newPassword) {
      errors.newPassword = 'Por favor ingresa una nueva contraseña.';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'La nueva contraseña debe tener al menos 8 caracteres.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Por favor confirma la nueva contraseña.';
    } else if (newPassword && newPassword !== confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden. Verifica que ambas sean iguales.';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordValidationErrors(errors);
      return;
    }

    try {
      setIsChangingPassword(true);
      await apiFetch<ChangePasswordResponse>('/users/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
        token: accessToken,
      });

      setPasswordSuccessMessage('Tu contraseña se actualizó correctamente. Por seguridad, ingresa nuevamente.');

      // Limpiar campos
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Esperar un breve instante para que el usuario aprecie la notificación y redirigir
      setTimeout(async () => {
        isRedirectingRef.current = true;
        try {
          await logout();
        } finally {
          router.replace('/login?passwordChanged=true');
        }
      }, 500);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 401) {
          setPasswordErrorMessage('La contraseña actual no es correcta. Inténtalo nuevamente.');
        } else if (err.statusCode === 400) {
          setPasswordErrorMessage(err.message || 'La nueva contraseña no cumple con los requisitos mínimos de seguridad.');
        } else {
          setPasswordErrorMessage(err.message || 'No fue posible actualizar tu contraseña. Inténtalo nuevamente.');
        }
      } else {
        setPasswordErrorMessage('No fue posible contactar al servidor. Revisa tu conexión.');
      }
    } finally {
      setIsChangingPassword(false);
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
            Cargando perfil...
          </p>
        </div>
      </div>
    );
  }

  const roleInfo = roleBadgeStyles[user.role] || {
    label: user.role,
    className: 'bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-3 py-1 font-medium text-xs',
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
              aria-label="Volver al panel principal"
              id="back-to-dashboard-btn"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Volver al estudio</span>
              <span className="sm:hidden">Volver</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <CreditsBadge />
            <span className={`hidden sm:inline-flex ${roleInfo.className}`}>
              {roleInfo.label}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Page Title & Intro */}
        <section className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Perfil y Seguridad
          </h1>
          <p className="text-sm text-slate-600">
            Administra tu identidad en la plataforma y mantén segura tu cuenta.
          </p>
        </section>

        {/* Formulario 1: Datos de la Cuenta (REM-42) */}
        <Card id="account-details-card">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                <UserIcon className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle>Datos de la Cuenta</CardTitle>
                <CardDescription>
                  Actualiza tu nombre artístico o nombre de usuario visible en RemixDock.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4" noValidate>
              {profileSuccessMessage && (
                <Alert variant="success" id="profile-success-alert">
                  <AlertTitle>Cambios guardados</AlertTitle>
                  <AlertDescription>{profileSuccessMessage}</AlertDescription>
                </Alert>
              )}

              {profileErrorMessage && (
                <Alert variant="error" id="profile-error-alert">
                  <AlertTitle>No fue posible guardar los cambios</AlertTitle>
                  <AlertDescription>{profileErrorMessage}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="profile-email"
                  name="email"
                  type="email"
                  label="Correo electrónico"
                  value={user.email}
                  disabled
                  hint="El correo electrónico está vinculado a tu cuenta y no puede modificarse directamente."
                  readOnly
                />

                <Input
                  id="profile-username"
                  name="username"
                  type="text"
                  label="Nombre artístico o usuario"
                  placeholder="dj_tu_nombre"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  disabled={isSavingProfile}
                  hint="Este nombre identifica tus descargas y actividad en el catálogo."
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSavingProfile}
                  loadingText="Guardando cambios..."
                  id="save-profile-btn"
                  className="w-full sm:w-auto"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" aria-hidden="true" />
                  <span>Guardar cambios</span>
                </Button>
              </div>
            </form>
          </CardContent>

          <CardFooter className="border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" aria-hidden="true" />
              Cuenta verificada
            </span>
            <span>ID: {user.id}</span>
          </CardFooter>
        </Card>

        {/* Formulario 2: Seguridad y Contraseña (REM-48) */}
        <Card id="security-password-card">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/80">
                <KeyRound className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle>Seguridad y Contraseña</CardTitle>
                <CardDescription>
                  Protege tu cuenta actualizando periódicamente tu clave de acceso.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
              {passwordSuccessMessage && (
                <Alert variant="success" id="password-success-alert">
                  <AlertTitle>Contraseña actualizada</AlertTitle>
                  <AlertDescription>{passwordSuccessMessage}</AlertDescription>
                </Alert>
              )}

              {passwordErrorMessage && (
                <Alert variant="error" id="password-error-alert">
                  <AlertTitle>No fue posible actualizar la contraseña</AlertTitle>
                  <AlertDescription>{passwordErrorMessage}</AlertDescription>
                </Alert>
              )}

              <Input
                id="current-password"
                name="currentPassword"
                type="password"
                label="Contraseña actual"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                error={passwordValidationErrors.currentPassword}
                required
                autoComplete="current-password"
                disabled={isChangingPassword}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="new-password"
                  name="newPassword"
                  type="password"
                  label="Nueva contraseña"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  error={passwordValidationErrors.newPassword}
                  hint="Mínimo 8 caracteres."
                  required
                  autoComplete="new-password"
                  disabled={isChangingPassword}
                />

                <Input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  label="Confirmar nueva contraseña"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={passwordValidationErrors.confirmPassword}
                  required
                  autoComplete="new-password"
                  disabled={isChangingPassword}
                />
              </div>

              <div className="flex items-center justify-between pt-2 flex-col sm:flex-row gap-3">
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0" aria-hidden="true" />
                  <span>Por seguridad, deberás ingresar nuevamente con tu nueva contraseña.</span>
                </p>

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isChangingPassword}
                  loadingText="Actualizando contraseña..."
                  id="change-password-btn"
                  className="w-full sm:w-auto"
                >
                  <Lock className="w-4 h-4 mr-2" aria-hidden="true" />
                  <span>Actualizar contraseña</span>
                </Button>
              </div>
            </form>
          </CardContent>

          <CardFooter className="border-t border-slate-100 text-xs text-slate-400">
            <span>Última actualización de seguridad registrada en tu perfil.</span>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
