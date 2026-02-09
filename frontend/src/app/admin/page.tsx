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
      <section className="rounded-[32px] border border-[#1A3C34]/10 bg-white/90 px-6 py-6 shadow-[0_30px_90px_rgba(26,60,52,0.12)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
              Merkez
            </p>
            <h1 className="text-3xl font-serif text-[#1A3C34] md:text-4xl">
              Genel bakış
            </h1>
            <p className="text-sm text-[#5C5C5C]">
              Sipariş, ödeme ve katalog akışını tek panelden yönetin.
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 rounded-full border border-[#1A3C34]/15 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#1A3C34]"
          >
            Raporları gör <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-[28px] border border-[#E0D7C6] bg-white/90 px-5 py-5 shadow-[0_20px_60px_rgba(26,60,52,0.08)]"
            >
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-[#C5A059]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#AC9C7A]">
                  {item.note}
                </span>
              </div>
              <p className="mt-4 text-2xl font-serif text-[#1A3C34]">{item.value}</p>
              <p className="mt-1 text-sm text-[#5C5C5C]">{item.title}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[28px] border border-[#E0D7C6] bg-white/90 px-6 py-6 shadow-[0_20px_60px_rgba(26,60,52,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
            Öncelikli işler
          </p>
          <h2 className="mt-2 text-2xl font-serif text-[#1A3C34]">Bugün odak</h2>
          <ul className="mt-4 space-y-3 text-sm text-[#5C5C5C]">
            <li className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 h-4 w-4 text-[#C5A059]" />
              En çok satan ürünlerde stok kontrolü
            </li>
            <li className="flex items-start gap-2">
              <Users className="mt-0.5 h-4 w-4 text-[#C5A059]" />
              VIP müşteri siparişleri için hızlı onay
            </li>
            <li className="flex items-start gap-2">
              <CreditCard className="mt-0.5 h-4 w-4 text-[#C5A059]" />
              Ödeme başarısız listelerini gözden geçir
            </li>
          </ul>
        </div>
        <div className="rounded-[28px] border border-[#E0D7C6] bg-white/90 px-6 py-6 shadow-[0_20px_60px_rgba(26,60,52,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
            Hızlı erişim
          </p>
          <h2 className="mt-2 text-2xl font-serif text-[#1A3C34]">Kısayollar</h2>
          <div className="mt-4 grid gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between rounded-2xl border border-[#1A3C34]/10 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#1A3C34]"
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
