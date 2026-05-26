import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', children, variant = 'primary', isLoading, disabled, ...props }, ref) => {
    let variantStyles = '';
    if (variant === 'primary') {
      variantStyles = 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]';
    } else if (variant === 'secondary') {
      variantStyles = 'border border-white/10 bg-white/5 hover:bg-white/10 text-white hover:text-white';
    } else {
      variantStyles = 'bg-transparent text-slate-300 hover:text-white hover:bg-white/5';
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center gap-2 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 ${variantStyles} ${className}`}
        {...props}
      >
        {isLoading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
