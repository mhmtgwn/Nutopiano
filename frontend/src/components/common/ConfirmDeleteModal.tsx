'use client';

import { AlertTriangle } from 'lucide-react';

interface ConfirmDeleteModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
    confirmText?: string;
    loading?: boolean;
}

export default function ConfirmDeleteModal({
    open,
    onClose,
    onConfirm,
    title = 'Silme Onayı',
    description = 'Bu işlem geri alınamaz. Devam etmek istediğinize emin misiniz?',
    confirmText = 'Sil',
    loading = false,
}: ConfirmDeleteModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <button
                type="button"
                aria-label="Kapat"
                onClick={onClose}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--neutral-200)] bg-white p-6 shadow-xl">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-50">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-[var(--primary-800)]">{title}</h3>
                        <p className="mt-1 text-sm text-[var(--neutral-600)]">{description}</p>
                    </div>
                </div>
                <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-lg border border-[var(--neutral-200)] px-4 py-2 text-sm font-medium text-[var(--neutral-700)] transition hover:bg-[var(--neutral-100)]"
                    >
                        İptal
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                        {loading ? 'İşleniyor...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
