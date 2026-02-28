'use client';

import type { ReactNode } from 'react';

export type StatusVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'purple';

const VARIANT_CLASSES: Record<StatusVariant, string> = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    neutral: 'bg-[var(--neutral-100)] text-[var(--neutral-600)] border-[var(--neutral-200)]',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
};

const DOT_CLASSES: Record<StatusVariant, string> = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
    neutral: 'bg-[var(--neutral-500)]',
    purple: 'bg-purple-500',
};

interface StatusBadgeProps {
    variant: StatusVariant;
    children: ReactNode;
    dot?: boolean;
    className?: string;
}

export default function StatusBadge({ variant, children, dot = true, className = '' }: StatusBadgeProps) {
    return (
        <span
            className={`
        inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5
        text-[11px] font-semibold leading-tight
        ${VARIANT_CLASSES[variant]}
        ${className}
      `}
        >
            {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[variant]}`} />}
            {children}
        </span>
    );
}
