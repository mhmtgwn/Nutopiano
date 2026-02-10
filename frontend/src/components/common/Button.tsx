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
  'inline-flex items-center justify-center gap-1 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a00] disabled:cursor-not-allowed disabled:opacity-60';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#ff6a00] text-white hover:bg-[#e45f00] transition-colors duration-200',
  secondary:
    'border border-[#ff6a00] bg-white text-[#222222] hover:bg-[#ff6a00] hover:text-white transition-colors duration-200',
  ghost: 'text-[#222222] hover:bg-[#222222]/5',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-5 text-sm',
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
