import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
}

const baseClasses =
  'inline-flex items-center justify-center gap-1 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] disabled:cursor-not-allowed disabled:opacity-60';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-[#163d34] to-[#245244] text-white shadow-[0_8px_18px_rgba(22,61,52,0.22)] hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(22,61,52,0.28)]',
  secondary:
    'border border-[#bca06f] bg-white text-[#1A3C34] shadow-[var(--shadow-xs)] hover:border-[#9f8048] hover:bg-[#f8f3e8]',
  ghost: 'text-[#1A3C34] hover:bg-[#1A3C34]/5 hover:text-[#0f2d27]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  leftIcon,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  const computedClassName = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={computedClassName}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading && (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
      )}
      {!isLoading && leftIcon}
      <span>{children}</span>
    </button>
  );
}
