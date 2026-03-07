'use client';

import { useState } from 'react';
import {
    Check,
    ChevronDown,
    ChevronRight,
    ShieldCheck,
} from 'lucide-react';
import StatusBadge from '@/components/common/StatusBadge';
import { APP_ROLES, type AppRole } from '@/lib/role-routing';
import { ROLE_FEATURE_PRESETS } from '@/lib/panel-access';

type FeatureStatusCode = 'ACTIVE' | 'PLANNED' | 'BLOCKED';
type RoleFeatureStatus = {
    key: string;
    status: FeatureStatusCode;
    note?: string;
};

const featureStatusVariant = (status: FeatureStatusCode) => {
    if (status === 'ACTIVE') return 'success' as const;
    if (status === 'PLANNED') return 'warning' as const;
    return 'error' as const;
};

const ROLES = APP_ROLES.map((role) => {
    const preset = ROLE_FEATURE_PRESETS[role];

    return {
        key: role,
        label: preset.label,
        description: preset.description,
        variant: preset.variant,
        permissionScope: preset.permissionScope,
        features: preset.features as RoleFeatureStatus[],
    };
});

/* ── Permission Matrix ── */
const permissionMatrix: Record<AppRole, Record<string, string[]>> = {
    SUPER_ADMIN: {
        'Kullanıcı Yönetimi': ['users.view', 'users.create', 'users.edit', 'users.delete', 'users.role.assign', 'users.activate', 'users.2fa.manage', 'users.impersonate'],
        'Satıcı Yönetimi': ['sellers.view', 'sellers.create', 'sellers.edit', 'sellers.activate', 'sellers.applications.view', 'sellers.applications.approve', 'sellers.team.view', 'sellers.team.manage', 'sellers.impersonate'],
        'Ürün Yönetimi': ['products.view', 'products.create', 'products.edit', 'products.delete', 'products.publish', 'products.stock', 'products.force_publish', 'products.force_stock', 'products.import', 'products.archive'],
        'Sipariş Yönetimi': ['orders.view', 'orders.view_all', 'orders.create', 'orders.edit', 'orders.status_update', 'orders.cancel', 'orders.return.process'],
        'Finans': ['finance.view', 'finance.ledger.view', 'finance.wallets.view', 'finance.payout.view', 'finance.payout.approve', 'finance.payout.reject', 'finance.refund.process', 'finance.manual_adjustment', 'finance.commission.configure', 'finance.tax.configure', 'finance.report.export'],
        'POS': ['pos.sales', 'pos.orders', 'pos.reports', 'pos.register.open', 'pos.register.close', 'pos.return', 'pos.discount', 'pos.override_price', 'pos.cash_drawer', 'pos.refund_without_manager', 'pos.view_margin'],
        'Sistem': ['settings.view', 'settings.edit', 'settings.smtp', 'settings.sms', 'settings.plans', 'settings.feature_flags', 'settings.api_keys', 'audit.view', 'audit.export', 'outbox.view', 'outbox.retry'],
        'Destek': ['support.impersonate', 'support.pii_view'],
    },
    ADMIN: {
        'Kullanıcı Yönetimi': ['users.view', 'users.create', 'users.edit', 'users.delete', 'users.activate', 'users.2fa.manage'],
        'Satıcı Yönetimi': ['sellers.view', 'sellers.create', 'sellers.edit', 'sellers.activate', 'sellers.applications.view', 'sellers.applications.approve', 'sellers.team.view', 'sellers.team.manage', 'sellers.impersonate'],
        'Ürün & Sipariş': ['products.*', 'orders.*'],
        'Finans': ['finance.view', 'finance.ledger.view', 'finance.wallets.view', 'finance.payout.view', 'finance.payout.approve', 'finance.refund.process'],
        'POS': ['pos.*'],
        'Sistem': ['settings.view', 'settings.edit', 'settings.smtp', 'settings.sms', 'audit.view', 'audit.export'],
    },
    SELLER: {
        'Ekip': ['sellers.team.view', 'sellers.team.manage'],
        'Ürünler': ['products.view', 'products.create', 'products.edit', 'products.delete', 'products.publish', 'products.stock'],
        'Siparişler': ['orders.view', 'orders.create', 'orders.edit', 'orders.status_update', 'orders.cancel'],
        'Müşteriler': ['customers.view', 'customers.create', 'customers.edit', 'customers.credit.manage'],
        'Finans': ['finance.view', 'finance.ledger.view', 'finance.wallets.view', 'finance.payout.view'],
        'POS': ['pos.sales', 'pos.orders', 'pos.reports', 'pos.register.open', 'pos.register.close', 'pos.return', 'pos.discount'],
    },
    SELLER_STAFF: {},
    CUSTOMER: {},
};

export default function RolesPage() {
    const [expandedRole, setExpandedRole] = useState<string | null>(null);

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div>
                <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">Roller & Yetkiler</h1>
                <p className="mt-1 text-sm text-[var(--neutral-600)]">
                    Sistem rolleri ve her rolün varsayılan yetkilerini görüntüleyin.
                </p>
            </div>

            {/* ── Roles List ── */}
            <div className="space-y-3">
                {ROLES.map((role) => {
                    const isExpanded = expandedRole === role.key;
                    const matrix = permissionMatrix[role.key] ?? {};
                    const totalPerms = Object.values(matrix).flat().length;

                    return (
                        <div
                            key={role.key}
                            className="rounded-xl border border-[var(--neutral-200)] bg-white overflow-hidden transition-shadow hover:shadow-sm"
                        >
                            <button
                                type="button"
                                onClick={() => setExpandedRole(isExpanded ? null : role.key)}
                                className="flex w-full items-center gap-4 px-5 py-4 text-left"
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--neutral-100)]">
                                    <ShieldCheck className="h-5 w-5 text-[var(--neutral-500)]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-[var(--primary-800)]">{role.label}</span>
                                        <StatusBadge variant={role.variant} dot={false}>{role.key}</StatusBadge>
                                    </div>
                                    <p className="mt-0.5 text-xs text-[var(--neutral-500)] truncate">{role.description}</p>
                                </div>
                                <div className="hidden sm:flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-xs text-[var(--neutral-500)]">Yetkiler</p>
                                        <p className="text-sm font-semibold text-[var(--primary-800)]">
                                            {role.key === 'SUPER_ADMIN' ? 'Tümü' : totalPerms > 0 ? totalPerms : 'Yetki Gruplarına göre'}
                                        </p>
                                    </div>
                                </div>
                                {isExpanded
                                    ? <ChevronDown className="h-4 w-4 text-[var(--neutral-400)]" />
                                    : <ChevronRight className="h-4 w-4 text-[var(--neutral-400)]" />
                                }
                            </button>

                            {isExpanded && (
                                <div className="border-t border-[var(--neutral-100)] px-5 py-4">
                                    <p className="text-xs font-medium text-[var(--neutral-500)] mb-3">
                                        {role.permissionScope}
                                    </p>

                                    <div className="mb-4 space-y-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--neutral-500)]">
                                            Ozellik Durumu
                                        </p>
                                        {role.features.map((feature) => (
                                            <div
                                                key={`${role.key}-${feature.key}`}
                                                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-2"
                                            >
                                                <div>
                                                    <p className="text-xs font-semibold text-[var(--primary-800)]">
                                                        {feature.key}
                                                    </p>
                                                    {feature.note ? (
                                                        <p className="text-[11px] text-[var(--neutral-500)] mt-0.5">
                                                            {feature.note}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                <StatusBadge variant={featureStatusVariant(feature.status)}>
                                                    {feature.status}
                                                </StatusBadge>
                                            </div>
                                        ))}
                                    </div>

                                    {Object.keys(matrix).length > 0 ? (
                                        <div className="space-y-3">
                                            {Object.entries(matrix).map(([category, perms]) => (
                                                <div key={category}>
                                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--neutral-500)] mb-1.5">
                                                        {category}
                                                    </p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {perms.map((p) => (
                                                            <span
                                                                key={p}
                                                                className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
                                                            >
                                                                <Check className="h-2.5 w-2.5" />
                                                                {p}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                                            <p className="font-semibold">Bu rolde varsayılan yetki tanımlanmamıştır.</p>
                                            <p className="mt-1">
                                                {role.key === 'SELLER_STAFF'
                                                    ? 'Bu role sahip kullanıcılar, atanmış Yetki Gruplarına göre yetkilendirilir.'
                                                    : 'Müşteriler sadece mağaza frontend işlemlerine erişebilir.'
                                                }
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
