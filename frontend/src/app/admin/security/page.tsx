'use client';

import { useQuery } from '@tanstack/react-query';
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Cpu,
    Database,
    HardDrive,
    Key,
    Server,
    Shield,
    ShieldAlert,
    Users,
    XCircle,
} from 'lucide-react';
import api from '@/services/api';

type HealthDashboard = {
    health: {
        status: string;
        timestamp: string;
        uptime: number;
        checks: Record<string, boolean>;
        responseTime: string;
        version: string;
    };
    stats: {
        users: number;
        sellers: number;
        orders: number;
        products: number;
        customers: number;
    };
    system: {
        nodeVersion: string;
        platform: string;
        memoryUsageMb: {
            rss: number;
            heapUsed: number;
            heapTotal: number;
        };
        uptime: number;
    };
};

const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}g ${hours}s ${mins}d`;
    if (hours > 0) return `${hours}s ${mins}d`;
    return `${mins}d`;
};

export default function SecurityDashboardPage() {
    const { data, isLoading, isError } = useQuery<HealthDashboard>({
        queryKey: ['admin-security-dashboard'],
        queryFn: async () => (await api.get('/health/admin-dashboard')).data,
        refetchInterval: 15_000,
    });

    const health = data?.health;
    const stats = data?.stats;
    const sys = data?.system;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="border-b border-[var(--neutral-200)] pb-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                        <Shield className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">
                            Güvenlik & Sistem Dashboard
                        </h1>
                        <p className="text-sm text-[var(--neutral-600)]">
                            Sistem sağlığı, kaynak kullanımı ve güvenlik istatistikleri
                        </p>
                    </div>
                </div>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-20">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary-300)] border-t-[var(--primary-800)]" />
                </div>
            )}

            {isError && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    Dashboard verileri alınamadı. Backend erişilebilir mi kontrol edin.
                </div>
            )}

            {data && (
                <>
                    {/* System Health Status */}
                    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatusCard
                            icon={<Server className="h-5 w-5" />}
                            label="Sistem Durumu"
                            value={health?.status === 'healthy' ? 'Sağlıklı' : 'Sorunlu'}
                            variant={health?.status === 'healthy' ? 'success' : 'danger'}
                        />
                        <StatusCard
                            icon={<Database className="h-5 w-5" />}
                            label="Veritabanı"
                            value={health?.checks?.database ? 'Bağlı' : 'Bağlantı Yok'}
                            variant={health?.checks?.database ? 'success' : 'danger'}
                        />
                        <StatusCard
                            icon={<Activity className="h-5 w-5" />}
                            label="Redis"
                            value={health?.checks?.redis ? 'Bağlı' : 'Bağlantı Yok'}
                            variant={health?.checks?.redis ? 'success' : 'danger'}
                        />
                        <StatusCard
                            icon={<Cpu className="h-5 w-5" />}
                            label="Uptime"
                            value={formatUptime(sys?.uptime ?? 0)}
                            variant="info"
                        />
                    </section>

                    {/* Business Stats */}
                    <section>
                        <h2 className="mb-4 text-lg font-semibold text-[var(--primary-800)]">
                            Veritabanı İstatistikleri
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                            <StatCard icon={<Users className="h-5 w-5 text-blue-600" />} label="Kullanıcılar" value={stats?.users ?? 0} />
                            <StatCard icon={<ShieldAlert className="h-5 w-5 text-emerald-600" />} label="Satıcılar" value={stats?.sellers ?? 0} />
                            <StatCard icon={<Key className="h-5 w-5 text-amber-600" />} label="Siparişler" value={stats?.orders ?? 0} />
                            <StatCard icon={<HardDrive className="h-5 w-5 text-purple-600" />} label="Ürünler" value={stats?.products ?? 0} />
                            <StatCard icon={<Users className="h-5 w-5 text-pink-600" />} label="Müşteriler" value={stats?.customers ?? 0} />
                        </div>
                    </section>

                    {/* System Resources */}
                    <section>
                        <h2 className="mb-4 text-lg font-semibold text-[var(--primary-800)]">
                            Sistem Kaynakları
                        </h2>
                        <div className="grid gap-6 lg:grid-cols-2">
                            {/* Memory */}
                            <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-6">
                                <h3 className="mb-4 text-sm font-semibold text-[var(--primary-800)]">Bellek Kullanımı</h3>
                                <div className="space-y-4">
                                    <MemoryBar label="RSS" used={sys?.memoryUsageMb?.rss ?? 0} total={Math.max(sys?.memoryUsageMb?.rss ?? 0, 512)} />
                                    <MemoryBar label="Heap Used" used={sys?.memoryUsageMb?.heapUsed ?? 0} total={sys?.memoryUsageMb?.heapTotal ?? 256} />
                                    <MemoryBar label="Heap Total" used={sys?.memoryUsageMb?.heapTotal ?? 0} total={Math.max(sys?.memoryUsageMb?.rss ?? 0, 512)} />
                                </div>
                            </div>

                            {/* System Info */}
                            <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-6">
                                <h3 className="mb-4 text-sm font-semibold text-[var(--primary-800)]">Sistem Bilgisi</h3>
                                <div className="space-y-3">
                                    <InfoRow label="Node.js" value={sys?.nodeVersion ?? '-'} />
                                    <InfoRow label="Platform" value={sys?.platform ?? '-'} />
                                    <InfoRow label="Versiyon" value={health?.version ?? '-'} />
                                    <InfoRow label="Yanıt Süresi" value={health?.responseTime ?? '-'} />
                                    <InfoRow label="Son Kontrol" value={health?.timestamp ? new Date(health.timestamp).toLocaleString('tr-TR') : '-'} />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Health Checks Detail */}
                    <section>
                        <h2 className="mb-4 text-lg font-semibold text-[var(--primary-800)]">
                            Servis Kontrolleri
                        </h2>
                        <div className="rounded-xl border border-[var(--neutral-200)] bg-white divide-y divide-[var(--neutral-100)]">
                            {Object.entries(health?.checks ?? {}).map(([key, ok]) => (
                                <div key={key} className="flex items-center justify-between px-5 py-3">
                                    <div className="flex items-center gap-3">
                                        {ok ? (
                                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-500" />
                                        )}
                                        <span className="text-sm font-medium text-[var(--primary-800)] capitalize">{key}</span>
                                    </div>
                                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                        {ok ? 'Çalışıyor' : 'Hata'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}

/* ─── Sub-components ─── */

function StatusCard({ icon, label, value, variant }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    variant: 'success' | 'danger' | 'info';
}) {
    const bg = variant === 'success' ? 'bg-emerald-50 border-emerald-200' : variant === 'danger' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200';
    const iconColor = variant === 'success' ? 'text-emerald-600' : variant === 'danger' ? 'text-red-600' : 'text-blue-600';
    const textColor = variant === 'success' ? 'text-emerald-700' : variant === 'danger' ? 'text-red-700' : 'text-blue-700';

    return (
        <div className={`rounded-xl border p-5 ${bg}`}>
            <div className={`mb-2 ${iconColor}`}>{icon}</div>
            <p className="text-xs font-medium text-[var(--neutral-600)]">{label}</p>
            <p className={`mt-1 text-lg font-bold ${textColor}`}>{value}</p>
        </div>
    );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
    return (
        <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-5">
            <div className="mb-2">{icon}</div>
            <p className="text-xs font-medium text-[var(--neutral-500)]">{label}</p>
            <p className="mt-1 text-2xl font-bold text-[var(--primary-800)]">{value.toLocaleString('tr-TR')}</p>
        </div>
    );
}

function MemoryBar({ label, used, total }: { label: string; used: number; total: number }) {
    const pct = total > 0 ? Math.min(Math.round((used / total) * 100), 100) : 0;
    const barColor = pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500';

    return (
        <div>
            <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--neutral-700)]">{label}</span>
                <span className="text-[var(--neutral-500)]">{used} MB / {total} MB ({pct}%)</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--neutral-100)]">
                <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--neutral-500)]">{label}</span>
            <span className="font-medium text-[var(--primary-800)]">{value}</span>
        </div>
    );
}
