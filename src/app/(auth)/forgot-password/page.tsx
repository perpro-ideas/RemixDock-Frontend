'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { ForgotPasswordResponse } from '@/types/auth.types';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setEmailError(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError('Por favor ingresa tu correo electrónico.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError('Por favor ingresa un correo electrónico válido.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiFetch<ForgotPasswordResponse>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: trimmedEmail }),
      });

      setIsSubmitted(true);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 400) {
          setEmailError(err.message || 'El correo electrónico ingresado no tiene un formato válido.');
        } else {
          setErrorMessage(err.message || 'No fue posible procesar tu solicitud. Inténtalo de nuevo.');
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
            <Mail className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>
              {isSubmitted ? 'Revisa tu correo electrónico' : 'Recuperar acceso a tu cuenta'}
            </CardTitle>
            <CardDescription className="mt-0.5">
              {isSubmitted
                ? 'Hemos enviado las indicaciones para tu cuenta.'
                : 'Ingresa tu correo electrónico y te enviaremos las instrucciones para restablecer tu contraseña.'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isSubmitted ? (
          <div className="space-y-5">
            <Alert variant="success" id="forgot-success-alert">
              <AlertTitle>Instrucciones enviadas</AlertTitle>
              <AlertDescription>
                Si el correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada o carpeta de spam.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 pt-1">
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                id="back-to-login-success-btn"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" aria-hidden="true" />
                <span>Volver a iniciar sesión</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail('');
                }}
                className="w-full inline-flex items-center justify-center min-h-[44px] px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                Probar con otro correo electrónico
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {errorMessage && (
              <Alert variant="error" id="forgot-error-alert">
                <AlertTitle>No fue posible enviar las instrucciones</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <Input
              id="email"
              name="email"
              type="email"
              label="Correo electrónico"
              placeholder="dj@remixdock.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError || undefined}
              required
              autoComplete="email"
              disabled={isSubmitting}
              hint="Te enviaremos un enlace seguro para que elijas una nueva contraseña."
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isSubmitting}
              loadingText="Enviando instrucciones..."
              id="submit-forgot-password-btn"
            >
              <span>Enviar instrucciones</span>
            </Button>
          </form>
        )}
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
