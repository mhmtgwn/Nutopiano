import Link from 'next/link';
import { ArrowUpRight, Mail, Send, Server } from 'lucide-react';

const items = [
  {
    title: 'SMTP bağlantısı',
    description: 'Host, port, güvenlik ve kullanıcı bilgilerini yönetin.',
    icon: Server,
  },
  {
    title: 'Gönderici kimliği',
    description: 'Firma adı, gönderici e-posta ve imza ayarları.',
    icon: Mail,
  },
  {
    title: 'Test maili',
    description: 'SMTP ayarlarını doğrulamak için deneme gönderimi yapın.',
    icon: Send,
  },
];

export default function AdminSmtpPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-[#1A3C34]/10 bg-white/90 px-6 py-6 shadow-[0_30px_90px_rgba(26,60,52,0.12)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
              SMTP
            </p>
            <h1 className="text-3xl font-serif text-[#1A3C34] md:text-4xl">
              Mail ayarları
            </h1>
            <p className="text-sm text-[#5C5C5C]">
              Sipariş ve bildirim mailleri için SMTP altyapısını yönetin.
            </p>
          </div>
          <Link
            href="/admin/smtp"
            className="inline-flex items-center gap-2 rounded-full border border-[#1A3C34]/15 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#1A3C34]"
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
              className="rounded-[28px] border border-[#E0D7C6] bg-white/90 px-6 py-6 shadow-[0_20px_60px_rgba(26,60,52,0.08)]"
            >
              <Icon className="h-5 w-5 text-[#C5A059]" />
              <h2 className="mt-4 text-2xl font-serif text-[#1A3C34]">
                {item.title}
              </h2>
              <p className="mt-2 text-sm text-[#5C5C5C]">{item.description}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
