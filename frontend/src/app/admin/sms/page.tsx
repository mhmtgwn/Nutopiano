import Link from 'next/link';
import { ArrowUpRight, Bell, MessageCircle, Send } from 'lucide-react';

const items = [
  {
    title: 'SMS sağlayıcı',
    description: 'API anahtarları ve sağlayıcı bilgilerini yönetin.',
    icon: MessageCircle,
  },
  {
    title: 'Manuel SMS',
    description: 'Admin panel üzerinden tekil SMS gönderimi yapın.',
    icon: Send,
  },
  {
    title: 'Otomatik tetikler',
    description: 'Sipariş durumuna göre SMS otomasyonu tanımlayın.',
    icon: Bell,
  },
];

export default function AdminSmsPage() {
  return (
    <div className="space-y-6">
      <section className="border-b border-[var(--neutral-200)] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              SMS
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              SMS yönetimi
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              SMS entegrasyonunu kurun, manuel veya otomatik mesaj gönderin.
            </p>
          </div>
          <Link
            href="/admin/sms"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
          >
            Ayarları güncelle <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6"
            >
              <Icon className="h-5 w-5 text-[var(--primary-800)]/70" />
              <h2 className="mt-4 text-2xl font-serif text-[var(--primary-800)]">
                {item.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--neutral-600)]">{item.description}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
