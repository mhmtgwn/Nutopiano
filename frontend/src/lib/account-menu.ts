import {
  ClipboardList,
  CreditCard,
  Heart,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Package,
  Settings,
  ShoppingBag,
  Store,
  User,
  type LucideIcon,
} from 'lucide-react';

import { isPosRoleAllowed, normalizeRole } from '@/lib/role-routing';
import { resolveUserPanelHome } from '@/lib/profile-session';
import type { User as SessionUser } from '@/store/userSlice';

export type AccountMenuLink = {
  href: string;
  icon: LucideIcon;
  label: string;
};

export const getPanelLink = (user?: SessionUser | null): AccountMenuLink => ({
  href: resolveUserPanelHome(user),
  icon: LayoutDashboard,
  label: user?.role === 'CUSTOMER' ? 'Hesabım' : 'Panelim',
});

export const getCoreAccountLinks = (user?: SessionUser | null): AccountMenuLink[] => [
  getPanelLink(user),
  { href: '/account/profile', icon: User, label: 'Profil' },
  { href: '/account/settings', icon: Settings, label: 'Ayarlar' },
];

export const getCustomerMenuLinks = (): AccountMenuLink[] => [
  { href: '/account/orders', icon: ShoppingBag, label: 'Siparişlerim' },
  { href: '/account/favorites', icon: Heart, label: 'Favorilerim' },
  { href: '/account/reviews', icon: MessageSquare, label: 'Yorumlarım' },
  { href: '/account/addresses', icon: MapPin, label: 'Adreslerim' },
];

export const getBackofficeMenuLinks = (
  user?: SessionUser | null,
): AccountMenuLink[] => {
  const normalizedRole = normalizeRole(user?.role);

  switch (normalizedRole) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return [
        { href: '/admin/users', icon: User, label: 'Kullanıcılar' },
        { href: '/admin/sellers', icon: Store, label: 'Satıcılar' },
        { href: '/admin/plans', icon: CreditCard, label: 'Planlar' },
        { href: '/admin/orders', icon: ClipboardList, label: 'Siparişler' },
        { href: '/admin/products', icon: Package, label: 'Ürünler' },
        { href: '/admin/customers', icon: User, label: 'Müşteriler' },
        { href: '/admin/finance', icon: CreditCard, label: 'Finans' },
        ...(isPosRoleAllowed(user?.role)
          ? [{ href: '/pos', icon: LayoutDashboard, label: 'POS' }]
          : []),
      ];
    case 'SELLER':
      return [
        { href: '/pos', icon: LayoutDashboard, label: 'POS' },
        { href: '/dashboard/orders', icon: ClipboardList, label: 'Siparişler' },
        { href: '/dashboard/products', icon: Package, label: 'Ürünler' },
        { href: '/dashboard/finance', icon: CreditCard, label: 'Finans' },
        { href: '/dashboard/customers', icon: User, label: 'Müşteriler' },
      ];
    case 'SELLER_STAFF': {
      const permissionSet = new Set(
        Array.isArray(user?.permissions)
          ? user.permissions.map((permission) =>
              String(permission ?? '').trim().toLowerCase(),
            )
          : [],
      );

      const links: AccountMenuLink[] = [];

      if (
        ['pos.sales', 'pos.orders', 'pos.reports'].some((permission) =>
          permissionSet.has(permission),
        )
      ) {
        links.push({ href: '/pos', icon: LayoutDashboard, label: 'POS' });
      }

      if (
        [
          'orders.view',
          'orders.create',
          'orders.edit',
          'orders.status_update',
          'orders.cancel',
          'orders.return.process',
        ].some((permission) => permissionSet.has(permission))
      ) {
        links.push({
          href: '/dashboard/orders',
          icon: ClipboardList,
          label: 'Siparişler',
        });
      }

      return links;
    }
    default:
      return [];
  }
};
