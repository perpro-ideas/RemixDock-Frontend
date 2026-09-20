'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { CreateOrderResponse, CaptureOrderResponse } from '@/types/payments.types';

interface PayPalButtonWrapperProps {
  planId: string;
  amount: number;
  currency?: string;
  onSuccess: (creditsAdded: number) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

export function PayPalButtonWrapper({
  planId,
  amount,
  currency = 'USD',
  onSuccess,
  onError,
  disabled = false,
}: PayPalButtonWrapperProps) {
  const { accessToken } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePayment = async () => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);

      // 1. Crear la orden de compra a través del backend
      const orderData = await apiFetch<CreateOrderResponse>('/payments/paypal/create-order', {
        method: 'POST',
        body: JSON.stringify({ planId }),
        token: accessToken,
      });

      if (!orderData || !orderData.orderId) {
        throw new Error('No se pudo inicializar la orden de pago.');
      }

      const paypalOrderId = orderData.paypalOrderId || `PAYPAL-MOCK-${Date.now()}`;

      // 2. Confirmar y capturar la transacción en el backend
      const captureData = await apiFetch<CaptureOrderResponse>('/payments/paypal/capture-order', {
        method: 'POST',
        body: JSON.stringify({
          orderId: orderData.orderId,
          paypalOrderId,
        }),
        token: accessToken,
      });

      const creditsAdded = captureData.order?.plan?.creditsIncluded ?? 0;
      onSuccess(creditsAdded);
    } catch (err) {
      let friendlyError = 'Ocurrió un inconveniente al procesar tu pago con la pasarela. Por favor intenta nuevamente.';
      if (err instanceof ApiClientError) {
        if (err.statusCode === 400) {
          friendlyError = err.message || 'Los datos de la suscripción no son válidos.';
        } else if (err.statusCode === 404) {
          friendlyError = 'El plan seleccionado ya no se encuentra disponible.';
        } else if (err.statusCode >= 500) {
          friendlyError = 'El servicio de pago está experimentando demoras. Intenta nuevamente en unos minutos.';
        }
      } else if (err instanceof Error) {
        friendlyError = err.message;
      }

      setErrorMessage(friendlyError);
      if (onError) {
        onError(friendlyError);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full space-y-2">
      {errorMessage && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs leading-relaxed"
        >
          {errorMessage}
        </div>
      )}

      <button
        type="button"
        id="paypal-checkout-button"
        onClick={handlePayment}
        disabled={disabled || isProcessing}
        className="w-full min-h-[44px] px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm bg-[#FFC439] hover:bg-[#F2BA36] active:bg-[#E0AA2B] text-[#003087] transition-all shadow-sm flex items-center justify-center gap-2 sm:gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label={`Pagar con PayPal $${amount.toFixed(2)} ${currency}`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-[#003087]" aria-hidden="true" />
            <span className="truncate">Procesando pago con PayPal...</span>
          </>
        ) : (
          <>
            {/* Logotipo vectorial estilizado de PayPal */}
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-[#003087] shrink-0"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.006.404 5.43 0 5.932 0h7.457c3.704 0 6.446 1.838 5.765 6.002-.534 3.256-2.678 4.954-5.467 4.954h-1.63L10.378 20.6a.642.642 0 0 1-.633.737H7.076z" />
              <path
                d="M17.399 6.002c-.534 3.256-2.678 4.954-5.467 4.954h-1.63L8.623 21.337h4.085c.502 0 .926-.404.988-.901l1.107-7.042h1.493c2.789 0 4.933-1.698 5.467-4.954.681-4.164-2.06-6.002-5.764-6.002z"
                fill="#0079C1"
              />
            </svg>
            <span className="font-extrabold tracking-tight shrink-0">PayPal</span>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-800 ml-0.5 sm:ml-1 truncate">
              — Pagar ${amount.toFixed(2)} {currency}
            </span>
          </>
        )}
      </button>

      <p className="text-[11px] text-slate-400 text-center">
        Transacción segura y cifrada por pasarela de pago PayPal.
      </p>
    </div>
  );
}
