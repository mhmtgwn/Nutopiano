'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Download, ChevronsUpDown } from 'lucide-react';

/* ─── Types ─── */
export interface DataTableColumn<T> {
    key: string;
    label: string;
    sortable?: boolean;
    className?: string;
    render?: (row: T, index: number) => ReactNode;
}

export interface DataTableProps<T> {
    columns: DataTableColumn<T>[];
    data: T[];
    keyExtractor: (row: T) => string | number;
    /** Satır seçimi etkinleştirilsin mi */
    selectable?: boolean;
    /** Seçili satır key'leri */
    selectedKeys?: Set<string | number>;
    /** Seçim değişikliği */
    onSelectionChange?: (keys: Set<string | number>) => void;
    /** Satır tıklama */
    onRowClick?: (row: T) => void;
    /** Dışa aktarma fonksiyonu */
    onExport?: () => void;
    /** Boş durum */
    emptyMessage?: string;
    /** Yükleniyor durumu */
    loading?: boolean;
    /** Aksiyonlar (satır sonu) */
    rowActions?: (row: T) => ReactNode;
    /** Tablo üst kısmına ekstra bileşen */
    toolbar?: ReactNode;
}

type SortDirection = 'asc' | 'desc';

export default function DataTable<T extends Record<string, any>>({
    columns,
    data,
    keyExtractor,
    selectable = false,
    selectedKeys = new Set(),
    onSelectionChange,
    onRowClick,
    onExport,
    emptyMessage = 'Henüz veri bulunamadı.',
    loading = false,
    rowActions,
    toolbar,
}: DataTableProps<T>) {
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };

    const sortedData = useMemo(() => {
        if (!sortKey) return data;
        return [...data].sort((a, b) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            if (av == null && bv == null) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            const cmp = String(av).localeCompare(String(bv), 'tr', { numeric: true });
            return sortDirection === 'asc' ? cmp : -cmp;
        });
    }, [data, sortKey, sortDirection]);

    const allSelected = data.length > 0 && data.every((row) => selectedKeys.has(keyExtractor(row)));

    const toggleAll = () => {
        if (!onSelectionChange) return;
        if (allSelected) {
            onSelectionChange(new Set());
        } else {
            onSelectionChange(new Set(data.map(keyExtractor)));
        }
    };

    const toggleRow = (key: string | number) => {
        if (!onSelectionChange) return;
        const next = new Set(selectedKeys);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        onSelectionChange(next);
    };

    const SortIcon = ({ col }: { col: string }) => {
        if (sortKey !== col) return <ChevronsUpDown className="ml-0.5 h-3 w-3 opacity-30" />;
        return sortDirection === 'asc'
            ? <ChevronUp className="ml-0.5 h-3 w-3 text-[var(--primary-700)]" />
            : <ChevronDown className="ml-0.5 h-3 w-3 text-[var(--primary-700)]" />;
    };

    return (
        <div className="overflow-hidden rounded-xl border border-[var(--neutral-200)] bg-white">
            {/* Toolbar */}
            {(toolbar || onExport) && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--neutral-200)] px-4 py-3">
                    <div className="flex-1">{toolbar}</div>
                    {onExport && (
                        <button
                            type="button"
                            onClick={onExport}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--neutral-200)] px-3 py-1.5 text-xs font-medium text-[var(--neutral-700)] transition hover:bg-[var(--neutral-100)]"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Dışa Aktar
                        </button>
                    )}
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-[var(--neutral-200)] bg-[var(--neutral-50)]">
                            {selectable && (
                                <th className="w-10 px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={toggleAll}
                                        className="h-4 w-4 rounded border-[var(--neutral-300)] accent-[var(--primary-600)]"
                                    />
                                </th>
                            )}
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--neutral-500)] ${col.className ?? ''}`}
                                >
                                    {col.sortable ? (
                                        <button
                                            type="button"
                                            onClick={() => handleSort(col.key)}
                                            className="inline-flex items-center gap-0.5 hover:text-[var(--primary-700)] transition"
                                        >
                                            {col.label}
                                            <SortIcon col={col.key} />
                                        </button>
                                    ) : (
                                        col.label
                                    )}
                                </th>
                            ))}
                            {rowActions && <th className="w-12 px-4 py-3" />}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-[var(--neutral-100)]">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={`skeleton-${i}`}>
                                    {selectable && <td className="px-4 py-3"><div className="h-4 w-4 animate-pulse rounded bg-[var(--neutral-200)]" /></td>}
                                    {columns.map((col) => (
                                        <td key={col.key} className="px-4 py-3">
                                            <div className="h-4 w-24 animate-pulse rounded bg-[var(--neutral-200)]" />
                                        </td>
                                    ))}
                                    {rowActions && <td className="px-4 py-3" />}
                                </tr>
                            ))
                        ) : sortedData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
                                    className="px-4 py-12 text-center text-sm text-[var(--neutral-500)]"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((row, idx) => {
                                const key = keyExtractor(row);
                                const isSelected = selectedKeys.has(key);
                                return (
                                    <tr
                                        key={key}
                                        onClick={() => onRowClick?.(row)}
                                        className={`
                      transition-colors duration-100
                      ${onRowClick ? 'cursor-pointer' : ''}
                      ${isSelected ? 'bg-blue-50/50' : 'hover:bg-[var(--neutral-50)]'}
                    `}
                                    >
                                        {selectable && (
                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleRow(key)}
                                                    className="h-4 w-4 rounded border-[var(--neutral-300)] accent-[var(--primary-600)]"
                                                />
                                            </td>
                                        )}
                                        {columns.map((col) => (
                                            <td key={col.key} className={`px-4 py-3 text-[13px] ${col.className ?? ''}`}>
                                                {col.render ? col.render(row, idx) : (row[col.key] as ReactNode) ?? '—'}
                                            </td>
                                        ))}
                                        {rowActions && (
                                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                {rowActions(row)}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
