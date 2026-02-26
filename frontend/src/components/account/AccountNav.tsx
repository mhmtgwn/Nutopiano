'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  ClipboardList,
  CreditCard,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Shield,
} from 'lucide-react';

import api from '@/services/api';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/userSlice';
import { getPanelLabelByRole } from '@/lib/role-routing';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const customerItems: NavItem[] = [
  { href: '/account/profile', label: 'Hesap Bilgileri', icon: Home },
  { href: '/account/orders', label: 'Siparislerim', icon: ClipboardList },
  { href: '/account/favorites', label: 'Favoriler', icon: Heart },
  { href: '/account/addresses', label: 'Adreslerim', icon: MapPin },
  { href: '/checkout', label: 'Odeme Yontemleri', icon: CreditCard },
  { href: '/account/settings', label: 'Guvenlik', icon: Shield },
];

const backofficeItems = (role?: string | null): NavItem[] => [
  { href: '/account/profile', label: 'Hesap Bilgileri', icon: Home },
  { href: '/panel', label: getPanelLabelByRole(role), icon: LayoutDashboard },
  { href: '/account/orders', label: 'Siparislerim', icon: ClipboardList },
  { href: '/account/favorites', label: 'Favoriler', icon: Heart },
  { href: '/account/addresses', label: 'Adreslerim', icon: MapPin },
  { href: '/checkout', label: 'Odeme Yontemleri', icon: CreditCard },
  { href: '/account/settings', label: 'Guvenlik', icon: Shield },
];

const isActive = (pathname: string, href: string) =>
  href === '/account'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

export default function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.user);

  const items = useMemo(() => {
    if (!user?.role) return customerItems;
    return user.role === 'CUSTOMER' ? customerItems : backofficeItems(user.role);
  }, [user?.role]);

  const userInitial = (user?.name?.trim()?.charAt(0) ?? 'U').toUpperCase();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      dispatch(logout());
      toast.success('Cikis yapildi.');
      router.push('/');
    }
  };

  return (
    <div className="flex h-full flex-col py-2">
      <div className="border-b border-[#e5e7eb] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f4f6] text-sm font-semibold text-[#111827]">
            {userInitial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#111827]">
              {user?.name ?? 'Kullanici'}
            </p>
            <p className="truncate text-xs text-[#6b7280]">{user?.email ?? '-'}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-[#6b7280]">Rol: {user?.role ?? '-'}</p>
        {user?.businessId ? (
          <p className="mt-1 text-xs text-[#6b7280]">Business ID: {user.businessId}</p>
        ) : null}
      </div>

      <nav className="mt-4 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-[#f3f4f6] text-[#111827]'
                  : 'text-[#4b5563] hover:bg-[#f9fafb] hover:text-[#111827]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-[#4b5563] transition hover:bg-[#f9fafb] hover:text-[#111827]"
        >
          <LogOut className="h-4 w-4" />
          Cikis
        </button>
      </nav>
    </div>
  );
}
