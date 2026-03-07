'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { LogOut } from 'lucide-react';

import {
  createPanelAccessManifest,
  getAccountCommerceLinks,
  getAccountCoreLinks,
  getBackofficePanelEntries,
} from '@/lib/panel-access';
import api from '@/services/api';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/userSlice';

type NavSectionProps = {
  title: string;
  items: Array<{
    href: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
  }>;
  pathname: string;
};

const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

function NavSection({ title, items, pathname }: NavSectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="mt-4 first:mt-0">
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7280]">
        {title}
      </p>
      <div className="space-y-1">
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
      </div>
    </div>
  );
}

export default function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.user);
  const manifest = createPanelAccessManifest(user);
  const coreLinks = getAccountCoreLinks(manifest);
  const commerceLinks = getAccountCommerceLinks(manifest);
  const panelLinks = manifest.hasMultiplePanels
    ? getBackofficePanelEntries(manifest).map((entry) => ({
        href: entry.href,
        label: entry.label,
        icon: entry.icon,
      }))
    : [];
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

      <nav className="mt-4">
        <NavSection title="Hesap" items={coreLinks} pathname={pathname} />
        <NavSection title="Alisveris" items={commerceLinks} pathname={pathname} />
        <NavSection title="Paneller" items={panelLinks} pathname={pathname} />
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="mt-4 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-[#4b5563] transition hover:bg-[#f9fafb] hover:text-[#111827]"
        >
          <LogOut className="h-4 w-4" />
          Cikis
        </button>
      </nav>
    </div>
  );
}
