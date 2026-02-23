'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import { getPanelLabelByRole } from '@/lib/role-routing';
import { useAppSelector } from '@/store';

type NavItem = {
  href: string;
  label: string;
};

const customerItems: NavItem[] = [
  { href: '/account', label: 'Özet' },
  { href: '/account/orders', label: 'Siparişler' },
  { href: '/account/addresses', label: 'Adresler' },
  { href: '/account/favorites', label: 'Favoriler' },
  { href: '/account/reviews', label: 'Yorumlar' },
  { href: '/account/profile', label: 'Profil' },
  { href: '/account/settings', label: 'Ayarlar' },
];

const backofficeItems = (role?: string | null): NavItem[] => [
  { href: '/account', label: 'Özet' },
  { href: '/panel', label: getPanelLabelByRole(role) },
  { href: '/account/profile', label: 'Profil' },
  { href: '/account/settings', label: 'Ayarlar' },
];

const isActive = (pathname: string, href: string) =>
  href === '/account' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

export default function AccountNav() {
  const pathname = usePathname();
  const user = useAppSelector((state) => state.user.user);

  const items = useMemo(() => {
    if (!user?.role) return customerItems;
    return user.role === 'CUSTOMER' ? customerItems : backofficeItems(user.role);
  }, [user?.role]);

  return (
    <nav className="flex flex-col p-2">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-[var(--radius-lg)] px-3 py-2 text-sm font-medium transition ${
              active
                ? 'bg-[var(--primary-800)] text-white'
                : 'text-[var(--primary-800)] hover:bg-[var(--neutral-50)]'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
