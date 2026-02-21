/**
 * Seller account status enumeration
 * Defines the lifecycle states of a seller business account
 */

export enum SellerStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
  CLOSED = 'CLOSED',
}

export const SELLER_STATUS_DESCRIPTIONS: Record<SellerStatus, string> = {
  [SellerStatus.PENDING_APPROVAL]: 'Onay bekleniyor',
  [SellerStatus.APPROVED]: 'Onaylandı',
  [SellerStatus.ACTIVE]: 'Aktif',
  [SellerStatus.SUSPENDED]: 'Askıya alındı',
  [SellerStatus.DEACTIVATED]: 'Deaktif',
  [SellerStatus.CLOSED]: 'Kapatıldı',
};

export const ACTIVE_SELLER_STATUSES = [
  SellerStatus.APPROVED,
  SellerStatus.ACTIVE,
] as const;

export const INACTIVE_SELLER_STATUSES = [
  SellerStatus.SUSPENDED,
  SellerStatus.DEACTIVATED,
  SellerStatus.CLOSED,
] as const;
