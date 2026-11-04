import React from 'react';

const VARIANTS = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700',
  secondary: 'bg-white text-ink-900 border border-line hover:bg-surface-hover',
  ghost: 'text-ink-600 hover:bg-black/[0.04]',
  danger: 'bg-[#C0504D] text-white hover:bg-[#A84441]',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs rounded-lg',
  md: 'h-10 px-4 text-sm rounded-xl',
  lg: 'h-11 px-5 text-sm rounded-xl',
};

const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}) => (
  <button
    type="button"
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center gap-2 font-medium transition-colors
      disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    {...rest}
  >
    {loading && (
      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    )}
    {children}
  </button>
);

export default Button;
