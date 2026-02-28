'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, X, Filter } from 'lucide-react';

export interface FilterOption {
    label: string;
    value: string;
}

export interface FilterField {
    key: string;
    label: string;
    type: 'select' | 'date' | 'daterange' | 'text';
    options?: FilterOption[];
    placeholder?: string;
}

interface FilterPanelProps {
    fields: FilterField[];
    values: Record<string, string>;
    onChange: (values: Record<string, string>) => void;
    onReset?: () => void;
    children?: ReactNode;
}

export default function FilterPanel({ fields, values, onChange, onReset, children }: FilterPanelProps) {
    const [open, setOpen] = useState(false);

    const activeCount = Object.values(values).filter((v) => v && v.length > 0).length;

    const handleChange = (key: string, value: string) => {
        onChange({ ...values, [key]: value });
    };

    const handleReset = () => {
        const empty: Record<string, string> = {};
        fields.forEach((f) => { empty[f.key] = ''; });
        onChange(empty);
        onReset?.();
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className={`
            inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium
            transition-colors
            ${activeCount > 0
                            ? 'border-[var(--primary-200)] bg-[var(--primary-50)] text-[var(--primary-700)]'
                            : 'border-[var(--neutral-200)] text-[var(--neutral-700)] hover:bg-[var(--neutral-100)]'
                        }
          `}
                >
                    <Filter className="h-3.5 w-3.5" />
                    Filtreler
                    {activeCount > 0 && (
                        <span className="ml-0.5 rounded-full bg-[var(--primary-600)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {activeCount}
                        </span>
                    )}
                    <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {activeCount > 0 && (
                    <button
                        type="button"
                        onClick={handleReset}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--neutral-500)] hover:text-[var(--neutral-700)] transition"
                    >
                        <X className="h-3 w-3" />
                        Temizle
                    </button>
                )}

                {children}
            </div>

            {open && (
                <div className="grid grid-cols-1 gap-3 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-4 sm:grid-cols-2 lg:grid-cols-4">
                    {fields.map((field) => (
                        <div key={field.key}>
                            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[var(--neutral-500)]">
                                {field.label}
                            </label>

                            {field.type === 'select' && field.options && (
                                <select
                                    value={values[field.key] ?? ''}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                    className="w-full rounded-lg border border-[var(--neutral-200)] bg-white px-3 py-2 text-sm text-[var(--primary-800)] outline-none focus:border-[var(--primary-400)] focus:ring-1 focus:ring-[var(--primary-200)]"
                                >
                                    <option value="">{field.placeholder ?? 'Tümü'}</option>
                                    {field.options.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {field.type === 'text' && (
                                <input
                                    type="text"
                                    value={values[field.key] ?? ''}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                    placeholder={field.placeholder ?? `${field.label} ara...`}
                                    className="w-full rounded-lg border border-[var(--neutral-200)] bg-white px-3 py-2 text-sm text-[var(--primary-800)] outline-none focus:border-[var(--primary-400)] focus:ring-1 focus:ring-[var(--primary-200)]"
                                />
                            )}

                            {(field.type === 'date' || field.type === 'daterange') && (
                                <input
                                    type="date"
                                    value={values[field.key] ?? ''}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                    className="w-full rounded-lg border border-[var(--neutral-200)] bg-white px-3 py-2 text-sm text-[var(--primary-800)] outline-none focus:border-[var(--primary-400)] focus:ring-1 focus:ring-[var(--primary-200)]"
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
