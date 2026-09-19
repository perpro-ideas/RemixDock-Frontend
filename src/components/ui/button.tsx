import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500',
  secondary:
    'bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 active:bg-slate-300 border border-slate-200/80 focus-visible:ring-slate-400',
  outline:
    'bg-white text-slate-700 font-medium border border-slate-200 hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-emerald-500',
  ghost:
    'bg-transparent text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 focus-visible:ring-slate-400',
  danger:
    'bg-rose-600 text-white font-semibold shadow-sm shadow-rose-600/20 hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-500',
};

const sizeStyles: Record<ButtonSize, string> = {
  default: 'min-h-[44px] min-w-[44px] px-4 py-2.5 text-sm rounded-xl',
  sm: 'min-h-[44px] min-w-[44px] px-3.5 py-1.5 text-xs rounded-lg',
  lg: 'min-h-[48px] min-w-[48px] px-6 py-3 text-base rounded-xl',
  icon: 'min-h-[44px] min-w-[44px] p-2.5 rounded-xl justify-center',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'default',
      isLoading = false,
      loadingText,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isInteractionDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isInteractionDisabled}
        aria-busy={isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 transition-all select-none text-center',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-current" aria-hidden="true" />
            <span className="sr-only">Cargando...</span>
            {loadingText ? <span>{loadingText}</span> : children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
