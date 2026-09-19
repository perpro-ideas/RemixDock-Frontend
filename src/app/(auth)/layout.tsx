import React from 'react';
import Link from 'next/link';
import { Disc3 } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-slate-900 font-bold text-2xl tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl p-1"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
            <Disc3 className="w-5 h-5 animate-spin-slow" aria-hidden="true" />
          </div>
          <span>
            Remix<span className="text-emerald-600">Dock</span>
          </span>
        </Link>
      </div>

      {/* Form Container */}
      <div className="w-full sm:max-w-md">{children}</div>

      {/* Auth footer links */}
      <div className="mt-8 text-center text-xs text-slate-500">
        <Link
          href="/"
          className="text-slate-500 hover:text-slate-800 underline-offset-4 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
        >
          ← Volver a la página principal
        </Link>
      </div>
    </div>
  );
}
