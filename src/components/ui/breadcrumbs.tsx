import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Componente canónico de migas de pan (Breadcrumbs)
 * Cumple con Heurísticas 1, 3 y 4 de Nielsen y estándar WCAG 2.1 AA.
 */
export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={`w-full py-1 ${className}`}>
      <ol className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight
                  className="w-3.5 h-3.5 text-slate-400 shrink-0"
                  aria-hidden="true"
                />
              )}
              {isLast ? (
                <span
                  aria-current="page"
                  className="font-semibold text-slate-900 truncate max-w-[200px] sm:max-w-md"
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-slate-900 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded py-0.5"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-slate-500">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
