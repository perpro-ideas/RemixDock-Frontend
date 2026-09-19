import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export type AlertVariant = 'error' | 'warning' | 'success' | 'info';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

const variantStyles: Record<AlertVariant, { container: string; icon: typeof AlertCircle }> = {
  error: {
    container: 'border-rose-200 bg-rose-50 text-rose-800',
    icon: AlertCircle,
  },
  warning: {
    container: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: AlertTriangle,
  },
  success: {
    container: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: CheckCircle2,
  },
  info: {
    container: 'border-sky-200 bg-sky-50 text-sky-800',
    icon: Info,
  },
};

export function Alert({
  variant = 'info',
  className,
  children,
  ...props
}: AlertProps) {
  const { container, icon: IconComponent } = variantStyles[variant];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'relative w-full rounded-xl border p-4 text-sm flex gap-3 items-start',
        container,
        className
      )}
      {...props}
    >
      <IconComponent className="w-5 h-5 flex-shrink-0 mt-0.5 text-current" aria-hidden="true" />
      <div className="flex-1 space-y-1">{children}</div>
    </div>
  );
}

export function AlertTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={cn('font-semibold leading-none tracking-tight', className)}
      {...props}
    >
      {children}
    </h5>
  );
}

export function AlertDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <div
      className={cn('text-xs sm:text-sm [&_p]:leading-relaxed opacity-95', className)}
      {...props}
    >
      {children}
    </div>
  );
}
