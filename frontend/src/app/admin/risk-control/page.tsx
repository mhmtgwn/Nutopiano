'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowUpRight,
  DatabaseZap,
  Download,
  Mail,
  MessageSquareWarning,
  Shield,
} from 'lucide-react';

import Spinner from '@/components/common/Spinner';
import RiskScoreBadge from '@/components/common/RiskScoreBadge';
import { useCapabilities } from '@/hooks/useCapabilities';
import api from '@/services/api';

type OutboxMetrics = {
  totalCount: number;
  processedCount: number;
  pendingCount: number;
  retryCount: number;
  failedCount: number;
  deadLetterCount: number;
};

type OutboxEventRow = {
  id: number;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  attemptCount: number;
  lastError?: string | null;
  deadLetteredAt?: string | null;
  processedAt?: string | null;
  createdAt: string;
};

type PaginatedOutbox = {
  data: OutboxEventRow[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
};

type AuditLogRow = {
  id: number;
  actorRole: string;
  actorUserId: number;
  actionType: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  actorUser?: { id: number; name?: string | null; phone?: string | null } | null;
};

type PaginatedAuditLogs = {
  data: AuditLogRow[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
};

type WebhookEventRow = {
  id: number;
  provider: string;
  status: string;
  receivedAt?: string | null;
  processedAt?: string | null;
};

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('tr-TR') : '-';

const normalizeStatus = (value?: string | null) =>
  String(value ?? '').trim().toUpperCase();

const normalizeAction = (value?: string | null) =>
  String(value ?? '').trim().toUpperCase();

export default function RiskControlPage() {
  const { canAny } = useCapabilities();
  const pathname = usePathname();
  const isPlatformPath = pathname.startsWith('/platform');
  const [tab, setTab] = useState<'overview' | 'audit' | 'outbox' | 'governance'>(
    'overview',
  );
  const basePath = isPlatformPath ? '/platform' : '/admin';
  const canViewRiskHub = canAny(['VIEW_AUDIT', 'VIEW_OUTBOX']);

  if (!canViewRiskHub) {
    return (
      <section className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50 px-6 py-6">
        <p className="text-sm text-red-700">
          Risk & Control ekranini goruntulemek icin yetkiniz yok.
        </p>
      </section>
    );
  }

  const metricsQuery = useQuery<OutboxMetrics>({
    queryKey: ['risk-control-outbox-metrics'],
    queryFn: async () => {
      const res = await api.get<OutboxMetrics>('/platform/outbox/metrics');
      return res.data;
    },
  });

  const outboxEventsQuery = useQuery<PaginatedOutbox>({
    queryKey: ['risk-control-outbox-events'],
    queryFn: async () => {
      const res = await api.get<PaginatedOutbox>(
        '/platform/outbox/events?page=1&pageSize=20',
      );
      return res.data;
    },
  });

  const auditQuery = useQuery<PaginatedAuditLogs>({
    queryKey: ['risk-control-audit'],
    queryFn: async () => {
      const res = await api.get<PaginatedAuditLogs>(
        '/platform/audit/logs?page=1&pageSize=20',
      );
      return res.data;
    },
  });

  const webhookQuery = useQuery<WebhookEventRow[]>({
    queryKey: ['risk-control-webhooks'],
    queryFn: async () => {
      const res = await api.get<WebhookEventRow[]>(
        '/payments/admin/webhook-events?provider=IYZICO',
      );
      return res.data;
    },
  });

  const isLoading =
    metricsQuery.isLoading ||
    outboxEventsQuery.isLoading ||
    auditQuery.isLoading ||
    webhookQuery.isLoading;

  const outboxMetrics = metricsQuery.data;
  const outboxEvents = outboxEventsQuery.data?.data ?? [];
  const auditLogs = auditQuery.data?.data ?? [];
  const webhookRows = webhookQuery.data ?? [];

  const riskScore = useMemo(() => {
    if (!outboxMetrics) return 0;
    const total = Math.max(outboxMetrics.totalCount, 1);
    const failedRatio =
      ((outboxMetrics.failedCount + outboxMetrics.deadLetterCount) / total) * 100;
    const retryRatio = (outboxMetrics.retryCount / total) * 100;
    const overrideCount = auditLogs.filter((row) => {
      const action = normalizeAction(row.actionType);
      return (
        action.includes('FORCE') ||
        action.includes('OVERRIDE') ||
        action.includes('ROLE_CHANGE')
      );
    }).length;
    const webhookFailed = webhookRows.filter(
      (row) => normalizeStatus(row.status) === 'FAILED',
    ).length;
    const webhookRatio =
      webhookRows.length > 0 ? (webhookFailed / webhookRows.length) * 100 : 0;
    const score = failedRatio * 0.45 + retryRatio * 0.2 + overrideCount * 2 + webhookRatio * 0.35;
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [auditLogs, outboxMetrics, webhookRows]);

  const criticalAuditRows = useMemo(
    () =>
      auditLogs.filter((row) => {
        const action = normalizeAction(row.actionType);
        return (
          action.includes('FORCE') ||
          action.includes('OVERRIDE') ||
          action.includes('ROLE_CHANGE')
        );
      }),
    [auditLogs],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-gradient-to-br from-[#FFF8EB] via-white to-[#EEF7FF] px-6 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--neutral-500)]">
              Risk & Control
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)]">
              Operasyon Güvenliği Merkezi
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Audit, outbox, concurrency ve export governance sinyallerini tek panelde izleyin.
            </p>
          </div>
          <RiskScoreBadge score={riskScore} label="Risk Score" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {([
            { key: 'overview', label: 'Overview' },
            { key: 'audit', label: 'Audit Feed' },
            { key: 'outbox', label: 'Outbox' },
            { key: 'governance', label: 'Governance' },
          ] as const).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
                tab === item.key
                  ? 'border-[var(--primary-800)] bg-[var(--primary-800)] text-white'
                  : 'border-[var(--neutral-200)] bg-white text-[var(--primary-800)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-10">
          <Spinner label="Risk verileri yükleniyor..." />
        </section>
      ) : null}

      {!isLoading && tab === 'overview' ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Outbox backlog
            </p>
            <p className="mt-2 text-3xl font-serif text-[var(--primary-800)]">
              {outboxMetrics?.pendingCount ?? 0}
            </p>
            <p className="mt-1 text-sm text-[var(--neutral-600)]">
              Retry: {outboxMetrics?.retryCount ?? 0} · Dead-letter: {outboxMetrics?.deadLetterCount ?? 0}
            </p>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Payment webhook health
            </p>
            <p className="mt-2 text-3xl font-serif text-[var(--primary-800)]">
              {webhookRows.filter((row) => normalizeStatus(row.status) === 'FAILED').length}
            </p>
            <p className="mt-1 text-sm text-[var(--neutral-600)]">Failed event</p>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Override yoğunluğu
            </p>
            <p className="mt-2 text-3xl font-serif text-[var(--primary-800)]">
              {criticalAuditRows.length}
            </p>
            <p className="mt-1 text-sm text-[var(--neutral-600)]">
              Son 20 audit kaydı içindeki kritik işlem
            </p>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              SMTP/SMS health
            </p>
            <p className="mt-2 text-lg font-semibold text-amber-700">Endpoint gerekli</p>
            <p className="mt-1 text-sm text-[var(--neutral-600)]">Aggregate delivery health bekleniyor.</p>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              POS offline ratio
            </p>
            <p className="mt-2 text-lg font-semibold text-amber-700">Telemetry gerekli</p>
            <p className="mt-1 text-sm text-[var(--neutral-600)]">Offline/online sipariş oranı için pipeline gerekli.</p>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Support mode
            </p>
            {isPlatformPath ? (
              <Link
                href={`${basePath}/support`}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary-800)]"
              >
                Destek moduna git <ArrowUpRight className="h-4 w-4" />
              </Link>
            ) : (
              <p className="mt-3 text-sm text-[var(--neutral-600)]">
                Support Mode yalnizca platform panelinde acik.
              </p>
            )}
          </div>
        </section>
      ) : null}

      {!isLoading && tab === 'audit' ? (
        <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <h2 className="text-xl font-serif text-[var(--primary-800)]">Audit Feed</h2>
          <div className="mt-4 space-y-2">
            {auditLogs.length === 0 ? (
              <p className="text-sm text-[var(--neutral-600)]">Audit kaydı bulunamadı.</p>
            ) : (
              auditLogs.map((row) => (
                <div
                  key={row.id}
                  className="rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-3 text-sm"
                >
                  <p className="font-semibold text-[var(--primary-800)]">
                    {row.actionType} · {row.targetType}#{row.targetId}
                  </p>
                  <p className="text-[var(--neutral-600)]">
                    {row.actorUser?.name || `User#${row.actorUserId}`} ({row.actorRole}) ·{' '}
                    {formatDateTime(row.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      {!isLoading && tab === 'outbox' ? (
        <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <h2 className="text-xl font-serif text-[var(--primary-800)]">Outbox Monitor</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--neutral-200)] text-[10px] uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  <th className="py-3 pr-3">Event</th>
                  <th className="py-3 pr-3">Aggregate</th>
                  <th className="py-3 pr-3">Attempt</th>
                  <th className="py-3 pr-3">Status</th>
                  <th className="py-3 pr-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {outboxEvents.map((row) => {
                  const status = row.deadLetteredAt
                    ? 'DEAD_LETTER'
                    : row.processedAt
                      ? 'PROCESSED'
                      : row.attemptCount > 0
                        ? 'RETRY'
                        : 'PENDING';
                  return (
                    <tr key={row.id} className="border-b border-[var(--neutral-100)]">
                      <td className="py-3 pr-3 font-semibold text-[var(--primary-800)]">
                        {row.eventType}
                      </td>
                      <td className="py-3 pr-3 text-[var(--neutral-600)]">
                        {row.aggregateType}#{row.aggregateId}
                      </td>
                      <td className="py-3 pr-3 text-[var(--neutral-700)]">{row.attemptCount}</td>
                      <td className="py-3 pr-3 text-[var(--neutral-700)]">{status}</td>
                      <td className="py-3 pr-3 text-[var(--neutral-600)]">
                        {formatDateTime(row.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {!isLoading && tab === 'governance' ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
            <h2 className="text-xl font-serif text-[var(--primary-800)]">Export Governance</h2>
            <ul className="mt-4 space-y-2 text-sm text-[var(--neutral-700)]">
              <li className="flex items-start gap-2">
                <Download className="mt-0.5 h-4 w-4 text-[var(--primary-800)]" />
                Export audit log: kim/ne zaman/hangi filtre ile export aldı.
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-[var(--primary-800)]" />
                Rate limit ve kota yönetimi.
              </li>
              <li className="flex items-start gap-2">
                <DatabaseZap className="mt-0.5 h-4 w-4 text-[var(--primary-800)]" />
                Büyük export için async job + signed URL.
              </li>
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 text-[var(--primary-800)]" />
                E-posta ile link teslimi.
              </li>
            </ul>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
            <h2 className="text-xl font-serif text-[var(--primary-800)]">Concurrency Playbook</h2>
            <ul className="mt-4 space-y-2 text-sm text-[var(--neutral-700)]">
              <li className="flex items-start gap-2">
                <Shield className="mt-0.5 h-4 w-4 text-[var(--primary-800)]" />
                Order optimistic lock + 409 conflict çözüm modalı.
              </li>
              <li className="flex items-start gap-2">
                <MessageSquareWarning className="mt-0.5 h-4 w-4 text-[var(--primary-800)]" />
                Register close server authority + soft-lock badge.
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-[var(--primary-800)]" />
                Payout processing lock + timeout fallback.
              </li>
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
