import Link from 'next/link';
import {
  ArrowUpRight,
  ClipboardList,
  CreditCard,
  Package,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';

const stats = [
  {
    title: 'Günlük sipariş',
    value: '24',
    note: 'Son 24 saat',
    icon: ClipboardList,
  },
  {
    title: 'Hazırlanan paket',
    value: '8',
    note: 'Kargoya hazır',
    icon: Truck,
  },
  {
    title: 'Ödeme bekleyen',
    value: '5',
    note: 'Onay bekliyor',
    icon: CreditCard,
  },
  {
    title: 'Aktif koleksiyon',
    value: '12',
    note: 'Yayında',
    icon: Package,
  },
];

const quickLinks = [
  { label: 'Ürünleri yönet', href: '/admin/products' },
  { label: 'Sipariş takibi', href: '/admin/orders' },
  { label: 'Ödeme ayarları', href: '/admin/payments' },
  { label: 'SMTP yapılandır', href: '/admin/smtp' },
];

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <section className="border-b border-[var(--neutral-200)] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Merkez
            </p>
            <h1 className="mt-2 text-2xl font-serif text-[var(--primary-800)] md:text-3xl lg:text-4xl">
              Genel bakış
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Sipariş, ödeme ve katalog akışını tek panelden yönetin.
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
          >
            Raporları gör <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 py-4 md:rounded-[var(--radius-xl)] md:px-5 md:py-5"
            >
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-[var(--primary-800)]/70" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                  {item.note}
                </span>
              </div>
              <p className="mt-3 text-lg font-serif text-[var(--primary-800)] md:mt-4 md:text-2xl">{item.value}</p>
              <p className="mt-1 text-sm text-[var(--neutral-600)]">{item.title}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
            Öncelikli işler
          </p>
          <h2 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">Bugün odak</h2>
          <ul className="mt-4 space-y-3 text-sm text-[var(--neutral-600)]">
            <li className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 h-4 w-4 text-[var(--primary-800)]/70" />
              En çok satan ürünlerde stok kontrolü
            </li>
            <li className="flex items-start gap-2">
              <Users className="mt-0.5 h-4 w-4 text-[var(--primary-800)]/70" />
              VIP müşteri siparişleri için hızlı onay
            </li>
            <li className="flex items-start gap-2">
              <CreditCard className="mt-0.5 h-4 w-4 text-[var(--primary-800)]/70" />
              Ödeme başarısız listelerini gözden geçir
            </li>
          </ul>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
            Hızlı erişim
          </p>
          <h2 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">Kısayollar</h2>
          <div className="mt-4 grid gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
              >
                {link.label}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
