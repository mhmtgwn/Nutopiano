'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowRightLeft, Building2, LogOut } from 'lucide-react';

import {
  createPanelAccessManifest,
  getAccountCommerceLinks,
  getAccountCoreLinks,
  getBackofficePanelEntries,
} from '@/lib/panel-access';
import { getPanelLabelByRole } from '@/lib/role-routing';
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
    <div className="mt-5 first:mt-0">
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--neutral-500)]">
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
              className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? 'border-[var(--primary-200)] bg-[var(--primary-100)] text-[var(--primary-900)] shadow-[var(--shadow-xs)]'
                  : 'border-transparent text-[var(--neutral-700)] hover:border-[var(--neutral-200)] hover:bg-[var(--neutral-50)] hover:text-[var(--primary-800)]'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  active
                    ? 'bg-white text-[var(--primary-800)]'
                    : 'bg-[var(--neutral-100)] text-[var(--neutral-600)]'
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1">{item.label}</span>
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
  const panelLabel = getPanelLabelByRole(user?.role);
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
    <div className="flex h-full flex-col">
      <div className="overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,#14352F_0%,#215646_62%,#D6A06E_100%)] p-4 text-white shadow-[var(--shadow-md)]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-semibold text-white">
            {userInitial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {user?.name ?? 'Kullanici'}
            </p>
            <p className="truncate text-xs text-white/72">{user?.email ?? '-'}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
          <span className="rounded-full border border-white/12 bg-white/12 px-3 py-1.5 text-white/90">
            {panelLabel}
          </span>
          {user?.businessId ? (
            <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-white/75">
              Business #{user.businessId}
            </span>
          ) : null}
        </div>

        {manifest.hasBackofficePanels ? (
          <Link
            href={manifest.panelSwitcherHref}
            className="mt-4 flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/16"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Panel gecisini ac
          </Link>
        ) : null}
      </div>

      <div className="mt-4 rounded-[24px] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-3 text-sm text-[var(--neutral-700)]">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[var(--primary-700)]" />
          <p className="font-medium text-[var(--primary-900)]">Calisma alani ozeti</p>
        </div>
        <p className="mt-2 text-[13px] leading-6 text-[var(--neutral-600)]">
          Bu menu hesap cekirdegi, alisveris akislariniz ve yetkiniz olan operasyon panellerini tek yerden toplar.
        </p>
      </div>

      <nav className="mt-5">
        <NavSection title="Hesap" items={coreLinks} pathname={pathname} />
        <NavSection title="Alisveris" items={commerceLinks} pathname={pathname} />
        <NavSection title="Paneller" items={panelLinks} pathname={pathname} />
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sm font-medium text-[var(--neutral-700)] transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--neutral-100)] text-[var(--neutral-600)]">
            <LogOut className="h-4 w-4" />
          </span>
          Cikis
        </button>
      </nav>
    </div>
  );
}
