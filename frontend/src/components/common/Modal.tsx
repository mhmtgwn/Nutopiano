'use client';

import type { ReactNode } from 'react';

export interface ModalProps {
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ isOpen, title, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-background p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-4">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-foreground/60 hover:text-foreground"
          >
            Kapat
          </button>
        </div>
        <div className="text-sm text-foreground/90">{children}</div>
      </div>
    </div>
  );
}
