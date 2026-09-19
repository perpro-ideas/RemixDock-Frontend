'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { ResetPasswordResponse } from '@/types/auth.types';
import { Lock, ArrowLeft, KeyRound, AlertTriangle } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTokenExpired, setIsTokenExpired] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  // Caso: enlace sin token
  if (!token) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle>Enlace no válido</CardTitle>
              <CardDescription className="mt-0.5">
                No fue posible verificar la solicitud de restablecimiento.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant="warning" id="invalid-token-alert">
            <AlertTitle>Falta el enlace de seguridad</AlertTitle>
            <AlertDescription>
              El enlace que abriste no contiene el identificador de acceso necesario para restablecer tu contraseña. Por favor solicita uno nuevo.
            </AlertDescription>
          </Alert>

          <Link
            href="/forgot-password"
            className="w-full inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            id="request-new-link-btn"
          >
            <span>Solicitar nuevo enlace</span>
          </Link>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-slate-100 mt-2 pt-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded p-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Volver al inicio de sesión</span>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setValidationErrors({});
    setIsTokenExpired(false);

    const errors: { newPassword?: string; confirmPassword?: string } = {};

    if (!newPassword) {
      errors.newPassword = 'Por favor ingresa tu nueva contraseña.';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'La nueva contraseña debe tener al menos 8 caracteres.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Por favor confirma la nueva contraseña.';
    } else if (newPassword && newPassword !== confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden. Verifica que ambas sean iguales.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      await apiFetch<ResetPasswordResponse>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      // Redirección fluida a login con confirmación de éxito
      router.push('/login?resetSuccess=true');
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 400 || err.statusCode === 401 || err.statusCode === 404) {
          setIsTokenExpired(true);
          setErrorMessage('El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.');
        } else {
          setErrorMessage(err.message || 'No fue posible restablecer tu contraseña. Inténtalo de nuevo.');
        }
      } else {
        setErrorMessage('Error de conexión con el servidor. Revisa tu acceso a internet.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80">
            <KeyRound className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>Restablecer contraseña</CardTitle>
            <CardDescription className="mt-0.5">
              Crea una nueva contraseña segura para acceder a tu estudio musical.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {errorMessage && (
            <Alert variant="error" id="reset-error-alert">
              <AlertTitle>No fue posible restablecer la contraseña</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {isTokenExpired && (
            <div className="pt-1">
              <Link
                href="/forgot-password"
                className="w-full inline-flex items-center justify-center min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                id="request-new-token-link"
              >
                Solicitar nuevo enlace de recuperación
              </Link>
            </div>
          )}

          <Input
            id="new-password"
            name="newPassword"
            type="password"
            label="Nueva contraseña"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={validationErrors.newPassword}
            hint="Mínimo 8 caracteres."
            required
            autoComplete="new-password"
            disabled={isSubmitting}
          />

          <Input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            label="Confirmar nueva contraseña"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={validationErrors.confirmPassword}
            required
            autoComplete="new-password"
            disabled={isSubmitting}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2"
            isLoading={isSubmitting}
            loadingText="Restableciendo contraseña..."
            id="submit-reset-password-btn"
          >
            <Lock className="w-4 h-4 mr-2" aria-hidden="true" />
            <span>Restablecer contraseña</span>
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center border-t border-slate-100 mt-2 pt-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded p-1"
          id="back-to-login-link"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Volver al inicio de sesión</span>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            Cargando formulario...
          </CardContent>
        </Card>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
