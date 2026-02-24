'use client';

import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';

type ConflictResolutionModalProps = {
  isOpen: boolean;
  title?: string;
  message?: string;
  detail?: string;
  onRefresh: () => void;
  onClose: () => void;
};

export default function ConflictResolutionModal({
  isOpen,
  title = 'Çakışma Tespit Edildi',
  message = 'İşlem sırasında veri başka bir kullanıcı tarafından güncellendi.',
  detail,
  onRefresh,
  onClose,
}: ConflictResolutionModalProps) {
  return (
    <Modal isOpen={isOpen} title={title} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-[var(--neutral-700)]">{message}</p>
        {detail ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {detail}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onRefresh}>
            Yenile ve Tekrar Dene
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </div>
    </Modal>
  );
}
