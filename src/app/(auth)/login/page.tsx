'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ApiClientError } from '@/lib/api-client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isJustRegistered = searchParams.get('registered') === 'true';

  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Redirigir al dashboard si ya está autenticado
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrorDetails(null);

    if (!identifier.trim()) {
      setErrorMessage('Identificador requerido');
      setErrorDetails('Por favor ingresa tu nombre de usuario o correo electrónico.');
      return;
    }

    if (!password) {
      setErrorMessage('Contraseña requerida');
      setErrorDetails('Por favor ingresa tu contraseña para acceder a la cuenta.');
      return;
    }

    try {
      setIsSubmitting(true);
      await login({ identifier: identifier.trim(), password });
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 401) {
          setErrorMessage('Credenciales incorrectas');
          setErrorDetails('El usuario o la contraseña no coinciden con nuestros registros. Verifica tus datos e intenta nuevamente.');
        } else if (err.statusCode === 400) {
          setErrorMessage('Datos incompletos');
          setErrorDetails(err.message || 'Por favor completa todos los campos requeridos en el formato correcto.');
        } else {
          setErrorMessage('Error al iniciar sesión');
          setErrorDetails(err.message || 'Ocurrió un error inesperado al procesar tu solicitud. Por favor intenta de nuevo.');
        }
      } else {
        setErrorMessage('Error de conexión');
        setErrorDetails('No fue posible contactar al servidor de autenticación. Asegúrate de que el backend esté disponible.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>
          Ingresa tus credenciales para acceder a tu estudio musical en RemixDock.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {isJustRegistered && !errorMessage && (
            <Alert variant="success">
              <AlertTitle>¡Registro exitoso!</AlertTitle>
              <AlertDescription>
                Tu cuenta ha sido creada correctamente. Ingresa tus credenciales para acceder.
              </AlertDescription>
            </Alert>
          )}

          {errorMessage && (
            <Alert variant="error">
              <AlertTitle>{errorMessage}</AlertTitle>
              {errorDetails && <AlertDescription>{errorDetails}</AlertDescription>}
            </Alert>
          )}

          <Input
            id="identifier"
            name="identifier"
            type="text"
            label="Usuario o Correo electrónico"
            placeholder="dj_example o correo@remixdock.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
            disabled={isSubmitting}
          />

          <Input
            id="password"
            name="password"
            type="password"
            label="Contraseña"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={isSubmitting}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2"
            isLoading={isSubmitting}
            loadingText="Iniciando sesión..."
          >
            Iniciar sesión
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center border-t border-slate-100 mt-2 pt-6">
        <p className="text-xs sm:text-sm text-slate-600">
          ¿No tienes una cuenta aún?{' '}
          <Link
            href="/register"
            className="font-semibold text-emerald-600 hover:text-emerald-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
          >
            Crear cuenta
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
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
      <LoginForm />
    </Suspense>
  );
}
