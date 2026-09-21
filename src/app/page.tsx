'use client';

import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { GlobalHeader } from '@/components/layout/global-header';
import { Radio, Music, Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header Canónico Global */}
      <GlobalHeader />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-28 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700 mb-6 sm:mb-8">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            <span>Plataforma de Audio para DJs & Productores</span>
          </div>

          <h1 className="text-3xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
            Eleva tus mezclas al <br />
            <span className="text-emerald-600">
              siguiente nivel sonoro
            </span>
          </h1>

          <p className="max-w-2xl text-base sm:text-lg text-slate-600 mb-10 leading-relaxed">
            Organiza, distribuye y colabora en stems y remixes con control de versiones,
            descargas directas y alta fidelidad de reproducción.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                id="hero-dashboard-link"
                className="w-full sm:w-auto min-h-[44px] px-8 py-3 text-base font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm transition-all inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white group"
              >
                <span>Ir a mi estación de trabajo</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="w-full sm:w-auto min-h-[44px] px-8 py-3 text-base font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm transition-all inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white group"
                >
                  <span>Crear cuenta gratuita</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>

                <Link
                  href="/login"
                  className="w-full sm:w-auto min-h-[44px] px-8 py-3 text-base font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition-colors inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  Acceder a mi estudio
                </Link>
              </>
            )}
          </div>

          {/* Value pillars in clean white cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 w-full text-left">
            <div className="p-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 mb-4">
                <Music className="w-5 h-5" aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold text-slate-900 mb-1.5">Gestión de Stems</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Almacena y descarga stems multipista separados listos para tus sesiones en vivo.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 mb-4">
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold text-slate-900 mb-1.5">Seguridad y Licencias</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Acceso protegido para tus producciones y catálogo de versiones musicales autorizadas.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 mb-4">
                <Zap className="w-5 h-5" aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold text-slate-900 mb-1.5">Baja Latencia</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Navegación instantánea y reproducción ágil pensada para el ritmo de trabajo en cabina.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} RemixDock. Todos los derechos reservados.</p>
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
              <Radio className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              Catálogo Activo
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
