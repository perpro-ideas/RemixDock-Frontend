'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plan } from '@/types/plan.types';
import { PayPalButtonWrapper } from './paypal-button-wrapper';
import {
  X,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Disc3,
  CreditCard,
} from 'lucide-react';

interface CheckoutModalProps {
  plan: Plan | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (creditsAdded: number) => void;
}

export function CheckoutModal({
  plan,
  isOpen,
  onClose,
  onSuccess,
}: CheckoutModalProps) {
  const [isSuccess, setIsSuccess] = useState(false);
  const [creditsAdded, setCreditsAdded] = useState(0);

  // Reiniciar estado interno cuando se abre o cambia el plan
  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setCreditsAdded(0);
    }
  }, [isOpen, plan?.id]);

  // Manejo accesible de la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !plan) {
    return null;
  }

  const handlePaymentSuccess = (added: number) => {
    const count = added > 0 ? added : (plan.creditsIncluded ?? 0);
    setCreditsAdded(count);
    setIsSuccess(true);
    onSuccess(count);
  };

  const periodLabel =
    plan.type === 'MONTHLY'
      ? '/ mes'
      : plan.type === 'YEARLY'
      ? '/ año'
      : 'pago único';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      id="checkout-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200"
        id="checkout-modal-content"
      >
        {/* Encabezado del Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700">
              <Disc3 className="w-4 h-4" aria-hidden="true" />
            </div>
            <span className="font-bold text-sm text-slate-900 tracking-tight">
              Remix<span className="text-emerald-600">Dock</span>{' '}
              <span className="text-xs text-slate-400 font-normal ml-1 border-l border-slate-200 pl-2">
                Checkout
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label="Cerrar ventana de compra"
            id="close-checkout-modal-btn"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Vista 1: Resumen y Pasarela de Pago */}
        {!isSuccess ? (
          <div className="p-6 space-y-6" id="checkout-summary-view">
            <div className="space-y-1">
              <h2
                id="checkout-modal-title"
                className="text-xl font-bold text-slate-900 tracking-tight"
              >
                Resumen de suscripción
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Confirma los detalles de tu plan y completa tu membresía de manera segura.
              </p>
            </div>

            {/* Tarjeta del Plan Seleccionado */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Plan seleccionado
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                    {plan.name}
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    ${plan.price.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium block">
                    USD {periodLabel}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                  <span>+{plan.creditsIncluded} créditos incluidos</span>
                </div>
                <span className="text-slate-500">Descargas inmediatas</span>
              </div>
            </div>

            {/* Beneficios Principales */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider block">
                Tu membresía incluye:
              </span>
              <ul className="space-y-2 text-xs text-slate-600">
                {plan.benefits.slice(0, 3).map((benefit, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pasarela PayPal */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  Método de pago
                </span>
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  Conexión segura
                </span>
              </div>

              <PayPalButtonWrapper
                planId={plan.id}
                amount={plan.price}
                onSuccess={handlePaymentSuccess}
              />

              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                id="cancel-checkout-btn"
              >
                Cancelar y volver
              </button>
            </div>
          </div>
        ) : (
          /* Vista 2: Confirmación de Pago Exitoso */
          <div className="p-8 text-center space-y-6" id="checkout-success-view">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-sm animate-in zoom-in-50 duration-300">
              <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <h2
                id="checkout-modal-title"
                className="text-2xl font-bold text-slate-900 tracking-tight"
              >
                ¡Pago completado con éxito!
              </h2>
              <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                Se han acreditado <strong className="text-emerald-700 font-bold">{creditsAdded} créditos</strong> a tu cuenta de estudio.
              </p>
            </div>

            {/* Recibo sintético Flat SaaS */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-left text-xs space-y-2 max-w-sm mx-auto">
              <div className="flex justify-between text-slate-600">
                <span>Plan adquirido:</span>
                <span className="font-semibold text-slate-900">{plan.name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Monto abonado:</span>
                <span className="font-semibold text-slate-900">${plan.price.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-200/60">
                <span>Estado de la cuenta:</span>
                <span className="font-semibold text-emerald-700">Membresía activa</span>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="space-y-2 pt-2 max-w-sm mx-auto">
              <Link
                href="/dashboard"
                id="checkout-go-to-dashboard-btn"
                className="w-full min-h-[44px] px-4 py-3 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-sm flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <span>Ir al Dashboard</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>

              <button
                type="button"
                onClick={onClose}
                id="checkout-continue-browsing-btn"
                className="w-full min-h-[44px] px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Seguir explorando
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
