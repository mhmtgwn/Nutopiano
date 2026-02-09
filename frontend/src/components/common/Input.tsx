import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  className = '',
  id,
  ...rest
}: InputProps) {
  const inputId = id ?? rest.name;

  return (
    <div className="flex flex-col gap-1 text-sm">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-foreground/80">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={[
          'h-9 rounded-md border border-foreground/15 bg-background px-3 text-sm text-foreground shadow-sm outline-none',
          'placeholder:text-foreground/40 focus-visible:border-black focus-visible:ring-1 focus-visible:ring-black',
          error ? 'border-red-500 focus-visible:ring-red-500' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
