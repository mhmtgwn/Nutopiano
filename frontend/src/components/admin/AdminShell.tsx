'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList,
  CreditCard,
  Home,
  Mail,
  MessageCircle,
  Package,
  Settings,
  Tags,
  Truck,
} from 'lucide-react';

interface AdminShellProps {
  children: ReactNode;
}

const navSections = [
  {
    title: 'Merkez',
    items: [{ label: 'Genel Bakış', href: '/admin', icon: Home }],
  },
  {
    title: 'Katalog',
    items: [
      { label: 'Ürünler', href: '/admin/products', icon: Package },
      { label: 'Kategoriler', href: '/admin/categories', icon: Tags },
    ],
  },
  {
    title: 'Sipariş',
    items: [
      { label: 'Siparişler', href: '/admin/orders', icon: ClipboardList },
      { label: 'Kapıya Hizmet', href: '/admin/services', icon: Truck },
      { label: 'Ödeme Ayarları', href: '/admin/payments', icon: CreditCard },
    ],
  },
  {
    title: 'Bildirim',
    items: [
      { label: 'SMTP', href: '/admin/smtp', icon: Mail },
      { label: 'SMS', href: '/admin/sms', icon: MessageCircle },
    ],
  },
  {
    title: 'Ayarlar',
    items: [{ label: 'Genel Ayarlar', href: '/admin/settings', icon: Settings }],
  },
];

export default function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/admin' ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-[#F7F4EF]">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div className="rounded-[28px] border border-[#1A3C34]/10 bg-white/90 p-5 shadow-[0_20px_60px_rgba(26,60,52,0.08)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                Nutopiano Admin
              </p>
              <h2 className="mt-2 text-xl font-serif text-[#1A3C34]">
                Yönetim Merkezi
              </h2>
              <p className="mt-2 text-xs text-[#5C5C5C]">
                Ürün, sipariş ve ödeme akışlarını tek panelden yönetin.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#1A3C34]/15 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#1A3C34] transition hover:-translate-y-0.5"
              >
                Mağazaya dön
              </Link>
            </div>

            <nav className="space-y-5">
              {navSections.map((section) => (
                <div key={section.title} className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                    {section.title}
                  </p>
                  <div className="space-y-2">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
                            active
                              ? 'bg-[#1A3C34] text-white shadow-[0_15px_40px_rgba(26,60,52,0.18)]'
                              : 'border border-transparent text-[#1A3C34]/70 hover:border-[#1A3C34]/15 hover:bg-white/80'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          <div className="space-y-6">
            <header className="rounded-[32px] border border-[#1A3C34]/10 bg-white/90 px-6 py-6 shadow-[0_30px_90px_rgba(26,60,52,0.12)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                    Admin Panel
                  </p>
                  <h1 className="text-3xl font-serif text-[#1A3C34] md:text-4xl">
                    Kontrol Paneli
                  </h1>
                  <p className="text-sm text-[#5C5C5C]">
                    Sipariş, ödeme, kapıya hizmet ve bildirim akışlarını yönetin.
                  </p>
                </div>
                <div className="rounded-full border border-[#1A3C34]/15 bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#1A3C34]">
                  Yönetici erişimi
                </div>
              </div>
            </header>

            <main className="space-y-6">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
