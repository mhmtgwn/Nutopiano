'use client';

import { Archive, Bell, Flag, FileKey, Key, Mail, MessageSquare, Settings, Shield } from 'lucide-react';
import Link from 'next/link';

const settingsCards = [
    {
        title: 'Feature Flags',
        description: 'Kademeli rollout ve özellik yönetimi.',
        href: '/admin/settings/feature-flags',
        icon: Flag,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
    },
    {
        title: 'API Key Yönetimi',
        description: 'Satıcı API anahtarları, scope yönetimi.',
        href: '/admin/settings/api-keys',
        icon: FileKey,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
    },
    {
        title: 'Config Snapshots',
        description: 'Konfigürasyon versiyonlama ve geri yükleme.',
        href: '/admin/settings/config-snapshots',
        icon: Archive,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
    },
    {
        title: 'SMTP Ayarları',
        description: 'Mail sunucu bağlantı ayarları.',
        href: '/admin/smtp',
        icon: Mail,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
    },
    {
        title: 'E-posta Şablonları',
        description: 'E-posta şablon yönetimi ve düzenleyici.',
        href: '/admin/smtp/templates',
        icon: Mail,
        color: 'text-teal-600',
        bg: 'bg-teal-50',
    },
    {
        title: 'SMS Ayarları',
        description: 'SMS sağlayıcı ayarları ve test.',
        href: '/admin/sms',
        icon: MessageSquare,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
    },
    {
        title: 'SMS Şablonları',
        description: 'SMS şablon düzenleme, karakter sayacı.',
        href: '/admin/sms/templates',
        icon: MessageSquare,
        color: 'text-sky-600',
        bg: 'bg-sky-50',
    },
    {
        title: 'Bildirimler',
        description: 'Bildirim yönetimi ve gönderim.',
        href: '/admin/notifications',
        icon: Bell,
        color: 'text-rose-600',
        bg: 'bg-rose-50',
    },
    {
        title: 'Roller & Yetkiler',
        description: 'Rol tanımları ve yetki matrisi.',
        href: '/admin/roles',
        icon: Shield,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
    },
    {
        title: 'Yetki Grupları',
        description: 'Özel yetki grupları oluşturma.',
        href: '/admin/permission-groups',
        icon: Key,
        color: 'text-cyan-600',
        bg: 'bg-cyan-50',
    },
    {
        title: 'Risk Kontrol',
        description: 'Risk izleme ve otomatik kurallar.',
        href: '/admin/risk-control',
        icon: Shield,
        color: 'text-red-600',
        bg: 'bg-red-50',
    },
    {
        title: 'Planlar',
        description: 'Abonelik planları yönetimi.',
        href: '/admin/plans',
        icon: Settings,
        color: 'text-violet-600',
        bg: 'bg-violet-50',
    },
];

export default function AdminSettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">Ayarlar</h1>
                <p className="mt-1 text-sm text-[var(--neutral-600)]">Platform yönetimi, iletişim ve güvenlik ayarları.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {settingsCards.map((card) => (
                    <Link key={card.href} href={card.href}
                        className="group rounded-xl border border-[var(--neutral-200)] bg-white p-5 transition hover:border-[var(--primary-300)] hover:shadow-md">
                        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${card.bg} mb-3`}>
                            <card.icon className={`h-5 w-5 ${card.color}`} />
                        </div>
                        <h3 className="text-sm font-semibold text-[var(--primary-800)] group-hover:text-[var(--primary-600)]">
                            {card.title}
                        </h3>
                        <p className="mt-1 text-[11px] text-[var(--neutral-500)]">{card.description}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
