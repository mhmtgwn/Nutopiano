'use client';

import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
    icon?: React.ComponentType<{ className?: string }>;
    title?: string;
    description?: string;
    action?: ReactNode;
}

export default function EmptyState({
    icon: Icon = Inbox,
    title = 'Veri bulunamadı',
    description = 'Henüz bu alanda kayıt yok.',
    action,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--neutral-100)] mb-4">
                <Icon className="h-7 w-7 text-[var(--neutral-400)]" />
            </div>
            <h3 className="text-base font-semibold text-[var(--primary-800)]">{title}</h3>
            <p className="mt-1 max-w-sm text-sm text-[var(--neutral-500)]">{description}</p>
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
