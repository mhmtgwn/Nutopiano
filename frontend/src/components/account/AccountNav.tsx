'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Shield,
  Star,
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
  const membershipLabel = user?.role === 'SELLER' ? 'Satici' : 'Uye';

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
    <div className="flex h-full flex-col p-4">
      <div className="rounded-[24px] border border-[#e6ddcf] bg-[linear-gradient(180deg,#fbf5e8_0%,#fefbf6_100%)] p-4 shadow-[0_8px_24px_rgba(26,60,52,0.06)]">
        <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-md">
          <Image
            src="/hero/IMG_3959.JPG"
            alt="Profil"
            fill
            className="object-cover"
            sizes="112px"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a3c34]/30">
            <span className="text-2xl font-bold text-white">{userInitial}</span>
          </div>
        </div>
        <p className="mt-4 text-center text-[34px] font-serif leading-none text-[#21443b]">
          {user?.name ?? 'Kullanici'}
        </p>
        <p className="mt-2 text-center text-sm font-semibold text-[#9f8352]">{membershipLabel}</p>
        <p className="mt-1 text-center text-xs text-[#8a7d6a]">Uyelik durumu: Aktif</p>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 rounded-xl border border-[#e4d4b6] bg-[#fff5df] px-3 py-2 text-sm font-semibold text-[#70541f]">
            <CheckCircle2 className="h-4 w-4" />
            Dogrulanmis Hesap
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#eadfcf] bg-[#fffdf8] px-3 py-2 text-sm font-semibold text-[#6f624f]">
            <Star className="h-4 w-4" />
            Premium Uye
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#eadfcf] bg-[#fffdf8] px-3 py-2 text-sm font-semibold text-[#6f624f]">
            <ClipboardList className="h-4 w-4" />
            Siparis Takibi Aktif
          </div>
        </div>
      </div>

      <nav className="mt-4 space-y-1 rounded-[20px] border border-[#e6ddcf] bg-white/80 p-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? 'bg-[#f0ece3] text-[#21443b]'
                  : 'text-[#6f6a60] hover:bg-[#f7f3ec] hover:text-[#21443b]'
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
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#7f6f5a] transition hover:bg-[#f7f3ec] hover:text-[#21443b]"
        >
          <LogOut className="h-4 w-4" />
          Cikis
        </button>
      </nav>
    </div>
  );
}
