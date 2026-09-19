'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ApiClientError } from '@/lib/api-client';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();

    if (!trimmedEmail) {
      setErrorMessage('Correo electrónico requerido');
      setErrorDetails('Por favor ingresa una dirección de correo válida para crear tu cuenta.');
      return;
    }

    if (!trimmedUsername || trimmedUsername.length < 3) {
      setErrorMessage('Nombre de usuario demasiado corto');
      setErrorDetails('El nombre de usuario debe tener al menos 3 caracteres alfanuméricos.');
      return;
    }

    if (!password || password.length < 8) {
      setErrorMessage('Contraseña no segura');
      setErrorDetails('La contraseña debe tener un mínimo de 8 caracteres.');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Registro del usuario
      await register({
        email: trimmedEmail,
        username: trimmedUsername,
        password,
      });

      // 2. Redirección al formulario de login
      router.push('/login?registered=true');
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 409) {
          setErrorMessage('Conflicto de registro');
          if (err.message.toLowerCase().includes('usuario') || err.message.toLowerCase().includes('username')) {
            setErrorDetails('Este nombre de usuario ya está en uso. Por favor elige otro para continuar.');
          } else {
            setErrorDetails('Este correo electrónico ya está en uso. Intenta iniciar sesión o utiliza otra dirección.');
          }
        } else if (err.statusCode === 400) {
          setErrorMessage('Datos de registro no válidos');
          setErrorDetails(err.message || 'Verifica que el correo tenga formato válido y que la contraseña cumpla los requisitos de seguridad.');
        } else {
          setErrorMessage('Error al crear la cuenta');
          setErrorDetails(err.message || 'Ocurrió un problema durante el registro. Por favor intenta nuevamente.');
        }
      } else {
        setErrorMessage('Error de conexión');
        setErrorDetails('No fue posible contactar con el servicio de registro. Verifica tu conexión a internet.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>
          Regístrate como DJ o remixer y accede a nuestro catálogo y herramientas de estudio.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {errorMessage && (
            <Alert variant="error">
              <AlertTitle>{errorMessage}</AlertTitle>
              {errorDetails && <AlertDescription>{errorDetails}</AlertDescription>}
            </Alert>
          )}

          {successMessage && (
            <Alert variant="success">
              <AlertTitle>Registro completado</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <Input
            id="email"
            name="email"
            type="email"
            label="Correo electrónico"
            placeholder="tu_nombre@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={isSubmitting}
            hint="Te enviaremos las notificaciones y accesos de sesión."
          />

          <Input
            id="username"
            name="username"
            type="text"
            label="Nombre de usuario"
            placeholder="dj_nombre"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            disabled={isSubmitting}
            hint="Mínimo 3 caracteres alfanuméricos, guiones o subguiones."
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
            autoComplete="new-password"
            disabled={isSubmitting}
            hint="Mínimo 8 caracteres."
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2"
            isLoading={isSubmitting}
            loadingText="Creando cuenta..."
          >
            Crear cuenta
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center border-t border-slate-100 mt-2 pt-6">
        <p className="text-xs sm:text-sm text-slate-600">
          ¿Ya tienes una cuenta creada?{' '}
          <Link
            href="/login"
            className="font-semibold text-emerald-600 hover:text-emerald-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
          >
            Iniciar sesión
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
