'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Wifi, WifiOff, Briefcase, RefreshCw, Maximize, Minimize, AlertCircle, CheckCircle2 } from 'lucide-react';
import Button from '@/components/common/Button';
import ConflictResolutionModal from '@/components/common/ConflictResolutionModal';
import {
  isConflictError,
  isNetworkError,
  isRateLimitError,
  resolveApiErrorMessage,
} from '@/lib/api-errors';
import { useAppDispatch, useAppSelector } from '@/store';
import api from '@/services/api';
import { logout, setAuthError, setCredentials, startAuth } from '@/store/userSlice';
import { isPosRoleAllowed } from '@/lib/role-routing';
import {
  enqueuePosOrder,
  findCachedPosCustomers,
  findCachedPosProductByBarcode,
  hasReceiptBeenPrinted,
  isPosOrderRetryable,
  listCachedPosProducts,
  listQueuedPosOrders,
  listReadyQueuedPosOrders,
  listRetryableQueuedPosOrders,
  markQueuedPosOrderFailed,
  markReceiptPrinted,
  markQueuedPosOrderAttempt,
  purgeOldReceiptPrintLogs,
  removeQueuedPosOrder,
  upsertCachedPosCustomers,
  upsertCachedPosProducts,
  type PosOrderQueueItem,
  type PosOrderQueuePayload,
} from '@/lib/offline/pos-order-queue';

type ProfileResponse = {
  userId: string;
  name?: string;
  phone?: string;
  email?: string;
  role: string;
  businessId?: string | null;
};

type ReceiptSettings = {
  businessName: string;
  footerNote: string;
};

type ReceiptLine = {
  productId: number;
  quantity: number;
  unitPriceCents?: number;
};

type ReceiptRecord = {
  saleId: string;
  createdAt: string;
  customerId?: number;
  lines: ReceiptLine[];
  totalAmountCents?: number;
  note?: string;
  isOfflineQueued: boolean;
};

const RECEIPT_SETTINGS_KEY = 'pos_receipt_settings_v1';
type BarcodeLookupResponse = {
  ok: boolean;
  productId: number;
  name: string;
  priceCents: number;
  variantId?: number | null;
};
type PosCustomerSummary = {
  id: number;
  name: string;
  phone: string;
  balance: number;
};
type PosProductSearchRow = {
  type: 'PRODUCT' | 'VARIANT';
  productId: number;
  variantId: number | null;
  name: string;
  sku?: string | null;
  priceCents: number;
  stock?: number | null;
};
type PosCartDraftItem = {
  key: string;
  productId: number;
  variantId: number | null;
  name: string;
  quantity: number;
  expectedUnitPriceCents?: number;
  discountAmountCents?: number;
};
type PosQuickPaymentMethod = 'NONE' | 'CASH' | 'CARD' | 'CREDIT';
type PosCustomerMode = 'GUEST' | 'CUSTOMER';
type PosPaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
type PosSplitPaymentDraft = {
  method: PosPaymentMethod;
  amountCents: string;
  reference: string;
};
type PosSplitPaymentLinePayload = {
  method: PosPaymentMethod;
  amountCents: number;
  reference?: string;
};
type PosShiftRow = {
  id: number;
  registerCode: string;
  openingCashCents: number;
  closingCashCents: number | null;
  openNote?: string | null;
  closeNote?: string | null;
  openedAt: string;
  closedAt: string | null;
  openedByUserId: number;
  closedByUserId: number | null;
  durationMinutes: number | null;
  varianceCents: number | null;
  openedBy?: { id: number; name: string } | null;
  closedBy?: { id: number; name: string } | null;
};
type PosStaffSalesRow = {
  userId: number;
  userName: string;
  role: string | null;
  orderCount: number;
  salesTotalCents: number;
  avgTicketCents: number;
  paymentsTotalCents: number;
  shiftCount: number;
  openingCashCents: number;
  closingCashCents: number;
};
type PosStaffSalesReport = {
  range: { startAt: string; endAt: string };
  rows: PosStaffSalesRow[];
  totals: {
    orderCount: number;
    salesTotalCents: number;
    paymentsTotalCents: number;
  };
};
type PosSalesTrendRow = {
  bucketStart: string;
  orderCount: number;
  salesTotalCents: number;
  paymentsTotalCents: number;
};
type PosTopProductRow = {
  productId: number;
  productName: string;
  quantity: number;
  salesTotalCents: number;
  orderCount: number;
};
type PosSalesReport = {
  range: { startAt: string; endAt: string; period: 'day' | 'week' | 'month' };
  summary: {
    orderCount: number;
    salesTotalCents: number;
    paymentsTotalCents: number;
    avgTicketCents: number;
  };
  trend: PosSalesTrendRow[];
  topProducts: PosTopProductRow[];
  paymentsByMethod: Array<{
    method: string;
    count: number;
    amountCents: number;
  }>;
};
type PosInvoicePayload = {
  invoiceNo: string;
  issueDate: string;
  currency: string;
  order: {
    id: number;
    statusKey: string;
    source: string;
    createdAt: string;
    notes?: string | null;
    createdBy?: { id: number; name: string } | null;
  };
  business: {
    id: number;
    name: string;
    legalName?: string | null;
    taxOffice?: string | null;
    taxNumber?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    footerNote?: string | null;
  };
  customer: {
    id: number;
    name: string;
    phone: string;
    billingAddress?: {
      title?: string;
      fullName?: string;
      phone?: string;
      line1?: string;
      line2?: string | null;
      city?: string;
      district?: string;
      postalCode?: string | null;
      country?: string;
    } | null;
  };
  lines: Array<{
    lineNo: number;
    id: number;
    productId: number;
    variantId?: number | null;
    productName: string;
    quantity: number;
    unitPriceCents: number;
    subtotalAmountCents: number;
    taxRateBps: number;
    taxAmountCents: number;
    totalAmountCents: number;
  }>;
  taxBreakdown: Array<{
    taxRateBps: number;
    baseAmountCents: number;
    taxAmountCents: number;
    totalAmountCents: number;
  }>;
  payments: Array<{
    id: number;
    method: string;
    amountCents: number;
    reference?: string | null;
    createdAt: string;
  }>;
  totals: {
    subtotalAmountCents: number;
    taxAmountCents: number;
    discountAmountCents: number;
    totalAmountCents: number;
    paidAmountCents: number;
    remainingAmountCents: number;
  };
};

type PosMismatchDecision = 'continue' | 'cancel';

type PosMismatchModalState = {
  expectedCents?: number;
  actualCents: number;
};

const MAX_QUEUE_RETRY_ATTEMPTS = 8;
const NON_RETRYABLE_QUEUE_ERROR_STATUS = new Set([400, 401, 403, 404, 422]);

const extractHttpStatus = (error: unknown) => {
  if (!error || typeof error !== 'object') return null;
  const maybeError = error as {
    response?: {
      status?: number;
    };
  };
  const status = maybeError.response?.status;
  if (!Number.isFinite(status)) return null;
  return Math.trunc(status ?? 0);
};

const extractNestedMetaValue = (payload: unknown, keyPath: string) => {
  if (!payload || typeof payload !== 'object') return undefined;
  const parts = keyPath.split('.');
  let cursor: unknown = payload;
  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
};

const extractMetaNumber = (payload: unknown, candidates: string[]) => {
  for (const candidate of candidates) {
    const raw = extractNestedMetaValue(payload, candidate);
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
};

const createIdempotencyKey = (prefix: string) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const formatMoney = (amountCents?: number) => {
  if (typeof amountCents !== 'number') return '-';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
};

const defaultReceiptSettings: ReceiptSettings = {
  businessName: 'Nutopiano POS',
  footerNote: 'Bizi tercih ettiginiz icin tesekkur ederiz.',
};
const defaultSplitPaymentRows: PosSplitPaymentDraft[] = [
  { method: 'CASH', amountCents: '', reference: '' },
  { method: 'CARD', amountCents: '', reference: '' },
];

const buildReceiptHtml = (
  settings: ReceiptSettings,
  receipt: ReceiptRecord,
) => {
  const createdAtText = new Date(receipt.createdAt).toLocaleString('tr-TR');
  const rows = receipt.lines
    .map((line) => {
      const lineTotal =
        typeof line.unitPriceCents === 'number'
          ? formatMoney(line.unitPriceCents * line.quantity)
          : '-';
      return `
        <tr>
          <td>Urun #${line.productId}</td>
          <td>${line.quantity}</td>
          <td style="text-align:right;">${lineTotal}</td>
        </tr>
      `;
    })
    .join('');

  return `
<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <title>Fis ${receipt.saleId}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 16px; color: #111; }
      .wrap { max-width: 360px; margin: 0 auto; }
      .title { text-align: center; font-size: 18px; margin: 0 0 4px; }
      .sub { text-align: center; font-size: 12px; color: #555; margin: 0 0 12px; }
      .meta { font-size: 12px; margin: 2px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
      th, td { border-bottom: 1px dashed #ccc; padding: 6px 0; }
      th { text-align: left; }
      .total { margin-top: 10px; font-size: 14px; font-weight: 700; display:flex; justify-content:space-between; }
      .badge { margin-top: 8px; font-size: 11px; color: ${receipt.isOfflineQueued ? '#9a4a1b' : '#1a3c34'}; }
      .footer { margin-top: 14px; text-align:center; font-size: 11px; color:#555; }
      @media print { body { padding: 0; } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1 class="title">${settings.businessName}</h1>
      <p class="sub">POS Satis Fisi</p>
      <p class="meta">Fis No: ${receipt.saleId}</p>
      <p class="meta">Tarih: ${createdAtText}</p>
      <p class="meta">Musteri ID: ${typeof receipt.customerId === 'number' ? receipt.customerId : 'Misafir'}</p>
      <table>
        <thead>
          <tr>
            <th>Urun</th>
            <th>Adet</th>
            <th style="text-align:right;">Tutar</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div class="total">
        <span>Toplam</span>
        <span>${formatMoney(receipt.totalAmountCents)}</span>
      </div>
      <div class="badge">
        ${receipt.isOfflineQueued ? 'Offline kayit (senkron bekliyor)' : 'Online satis'}
      </div>
      ${receipt.note ? `<p class="meta">Not: ${receipt.note}</p>` : ''}
      <p class="footer">${settings.footerNote}</p>
    </div>
  </body>
</html>
  `;
};

const buildSalesReportPrintHtml = (report: PosSalesReport) => {
  const trendRows = report.trend
    .map(
      (row) => `
      <tr>
        <td>${new Date(row.bucketStart).toLocaleDateString('tr-TR')}</td>
        <td>${row.orderCount}</td>
        <td>${formatMoney(row.salesTotalCents)}</td>
        <td>${formatMoney(row.paymentsTotalCents)}</td>
      </tr>
    `,
    )
    .join('');
  const topRows = report.topProducts
    .map(
      (row) => `
      <tr>
        <td>#${row.productId}</td>
        <td>${row.productName}</td>
        <td>${row.quantity}</td>
        <td>${formatMoney(row.salesTotalCents)}</td>
      </tr>
    `,
    )
    .join('');

  return `
<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <title>POS Satis Raporu</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 18px; color: #111; }
      h1 { margin: 0 0 8px; font-size: 20px; }
      .meta { margin: 0 0 14px; font-size: 12px; color: #555; }
      .summary { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; margin-bottom: 14px; }
      .card { border: 1px solid #ddd; border-radius: 10px; padding: 8px; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
      th, td { border-bottom: 1px solid #eee; padding: 6px 4px; text-align: left; }
      section { margin-top: 14px; }
      @media print { body { padding: 0; } }
    </style>
  </head>
  <body>
    <h1>POS Satis Raporu</h1>
    <p class="meta">
      Periyot: ${report.range.period} |
      Baslangic: ${new Date(report.range.startAt).toLocaleString('tr-TR')} |
      Bitis: ${new Date(report.range.endAt).toLocaleString('tr-TR')}
    </p>
    <div class="summary">
      <div class="card">Siparis: <strong>${report.summary.orderCount}</strong></div>
      <div class="card">Ciro: <strong>${formatMoney(report.summary.salesTotalCents)}</strong></div>
      <div class="card">Tahsilat: <strong>${formatMoney(report.summary.paymentsTotalCents)}</strong></div>
      <div class="card">Ortalama Fis: <strong>${formatMoney(report.summary.avgTicketCents)}</strong></div>
    </div>

    <section>
      <h2>Trend</h2>
      <table>
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Siparis</th>
            <th>Ciro</th>
            <th>Tahsilat</th>
          </tr>
        </thead>
        <tbody>${trendRows}</tbody>
      </table>
    </section>

    <section>
      <h2>Top Urunler</h2>
      <table>
        <thead>
          <tr>
            <th>Urun</th>
            <th>Ad</th>
            <th>Adet</th>
            <th>Ciro</th>
          </tr>
        </thead>
        <tbody>${topRows}</tbody>
      </table>
    </section>
  </body>
</html>
  `;
};

const buildA4InvoiceHtml = (invoice: PosInvoicePayload) => {
  const lineRows = invoice.lines
    .map(
      (line) => `
      <tr>
        <td>${line.lineNo}</td>
        <td>${line.productName}</td>
        <td>${line.quantity}</td>
        <td>${formatMoney(line.unitPriceCents)}</td>
        <td>${formatMoney(line.subtotalAmountCents)}</td>
        <td>%${(line.taxRateBps / 100).toFixed(2)}</td>
        <td>${formatMoney(line.taxAmountCents)}</td>
        <td>${formatMoney(line.totalAmountCents)}</td>
      </tr>
    `,
    )
    .join('');

  const taxRows = invoice.taxBreakdown
    .map(
      (row) => `
      <tr>
        <td>%${(row.taxRateBps / 100).toFixed(2)}</td>
        <td>${formatMoney(row.baseAmountCents)}</td>
        <td>${formatMoney(row.taxAmountCents)}</td>
        <td>${formatMoney(row.totalAmountCents)}</td>
      </tr>
    `,
    )
    .join('');

  const paymentRows = invoice.payments
    .map(
      (row) => `
      <tr>
        <td>${row.method}</td>
        <td>${new Date(row.createdAt).toLocaleString('tr-TR')}</td>
        <td>${formatMoney(row.amountCents)}</td>
      </tr>
    `,
    )
    .join('');

  const address = invoice.customer.billingAddress;
  const customerAddress = address
    ? [address.line1, address.line2, `${address.district ?? ''} / ${address.city ?? ''}`, address.postalCode, address.country]
      .filter(Boolean)
      .join(', ')
    : '-';

  return `
<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <title>A4 Fatura ${invoice.invoiceNo}</title>
    <style>
      @page { size: A4; margin: 14mm; }
      body { font-family: Arial, sans-serif; color: #101010; margin: 0; }
      h1, h2, h3 { margin: 0; }
      .top { display: flex; justify-content: space-between; gap: 18px; margin-bottom: 12px; }
      .box { border: 1px solid #d8d8d8; border-radius: 8px; padding: 10px; }
      .w50 { width: 50%; }
      .meta { font-size: 12px; line-height: 1.4; color: #333; }
      .title { font-size: 20px; margin-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
      th, td { border: 1px solid #e2e2e2; padding: 5px 6px; text-align: left; vertical-align: top; }
      th { background: #f7f7f7; }
      .totals { margin-top: 10px; width: 340px; margin-left: auto; }
      .totals td { font-size: 12px; }
      .footer { margin-top: 14px; font-size: 11px; color: #555; text-align: center; }
      .section { margin-top: 12px; }
    </style>
  </head>
  <body>
    <div class="top">
      <div class="box w50">
        <h2>${invoice.business.name}</h2>
        <p class="meta">Vergi Dairesi: ${invoice.business.taxOffice ?? '-'}</p>
        <p class="meta">Vergi No: ${invoice.business.taxNumber ?? '-'}</p>
        <p class="meta">Adres: ${invoice.business.address ?? '-'}</p>
        <p class="meta">Tel: ${invoice.business.phone ?? '-'}</p>
        <p class="meta">E-posta: ${invoice.business.email ?? '-'}</p>
      </div>
      <div class="box w50">
        <h1 class="title">SATIS FATURASI</h1>
        <p class="meta">Fatura No: ${invoice.invoiceNo}</p>
        <p class="meta">Siparis No: #${invoice.order.id}</p>
        <p class="meta">Tarih: ${new Date(invoice.issueDate).toLocaleString('tr-TR')}</p>
        <p class="meta">Durum: ${invoice.order.statusKey}</p>
      </div>
    </div>

    <div class="top">
      <div class="box w50">
        <h3>Musteri</h3>
        <p class="meta">${invoice.customer.name} (#${invoice.customer.id})</p>
        <p class="meta">Tel: ${invoice.customer.phone}</p>
      </div>
      <div class="box w50">
        <h3>Fatura Adresi</h3>
        <p class="meta">${customerAddress}</p>
      </div>
    </div>

    <div class="section">
      <h3>Kalemler</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Urun</th>
            <th>Adet</th>
            <th>Birim</th>
            <th>Ara Toplam</th>
            <th>KDV%</th>
            <th>KDV</th>
            <th>Tutar</th>
          </tr>
        </thead>
        <tbody>${lineRows}</tbody>
      </table>
    </div>

    <div class="section">
      <h3>KDV Ozeti</h3>
      <table>
        <thead>
          <tr>
            <th>Oran</th>
            <th>Matrah</th>
            <th>KDV</th>
            <th>Toplam</th>
          </tr>
        </thead>
        <tbody>${taxRows}</tbody>
      </table>
    </div>

    <table class="totals">
      <tbody>
        <tr><td>Ara Toplam</td><td>${formatMoney(invoice.totals.subtotalAmountCents)}</td></tr>
        <tr><td>Toplam KDV</td><td>${formatMoney(invoice.totals.taxAmountCents)}</td></tr>
        <tr><td>Indirim</td><td>${formatMoney(invoice.totals.discountAmountCents)}</td></tr>
        <tr><td>Genel Toplam</td><td><strong>${formatMoney(invoice.totals.totalAmountCents)}</strong></td></tr>
        <tr><td>Odenen</td><td>${formatMoney(invoice.totals.paidAmountCents)}</td></tr>
        <tr><td>Kalan</td><td>${formatMoney(invoice.totals.remainingAmountCents)}</td></tr>
      </tbody>
    </table>

    <div class="section">
      <h3>Odeme Hareketleri</h3>
      <table>
        <thead>
          <tr>
            <th>Yontem</th>
            <th>Tarih</th>
            <th>Tutar</th>
          </tr>
        </thead>
        <tbody>${paymentRows}</tbody>
      </table>
    </div>

    <p class="footer">${invoice.business.footerNote ?? ''}</p>
  </body>
</html>
  `;
};

export default function PosPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, status } = useAppSelector((state) => state.user);
  const isAuthed = !!user;
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const isCheckingAccess = isLoadingProfile || status === 'authenticating';

  useEffect(() => {
    if (user) {
      if (!isPosRoleAllowed(user.role)) {
        router.replace('/');
        toast.error('Bu sayfaya erişim için POS yetkisi gerekli.');
      }
      return;
    }

    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true);
        dispatch(startAuth());

        const response = await api.get<ProfileResponse>('/auth/profile');
        const profile = response.data;

        dispatch(
          setCredentials({
            user: {
              id: profile.userId,
              name: profile.name,
              phone: profile.phone,
              email: profile.email,
              role: profile.role,
              businessId: profile.businessId,
            },
            token: null,
          }),
        );

        if (!isPosRoleAllowed(profile.role)) {
          router.replace('/');
          toast.error('Bu sayfaya erişim için POS yetkisi gerekli.');
        }
      } catch (error: unknown) {
        const message = resolveApiErrorMessage(error, 'Yetkilendirme başarısız.');
        dispatch(setAuthError(message));
        dispatch(logout());

        const loginUrl = new URL('/login', window.location.origin);
        loginUrl.searchParams.set('next', '/pos');
        router.replace(loginUrl.pathname + loginUrl.search);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [user, dispatch, router]);

  const [activeTab, setActiveTab] = useState<'home' | 'categories' | 'customers' | 'finance' | 'orders' | 'settings'>('home');
  const [customerId, setCustomerId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');
  const [unitPriceCents, setUnitPriceCents] = useState('');
  const [itemDiscountCents, setItemDiscountCents] = useState('');
  const [cartDiscountCents, setCartDiscountCents] = useState('');
  const [splitPayments, setSplitPayments] = useState<PosSplitPaymentDraft[]>(
    defaultSplitPaymentRows,
  );
  const [variantId, setVariantId] = useState<number | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [resolvedProductName, setResolvedProductName] = useState('');
  const scannerBufferRef = useRef('');
  const syncInFlightRef = useRef(false);
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<PosProductSearchRow[]>([]);
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);
  const [isProductSearchModalOpen, setIsProductSearchModalOpen] = useState(false);
  const [cartItems, setCartItems] = useState<PosCartDraftItem[]>([]);
  const [quickPaymentMethod, setQuickPaymentMethod] = useState<PosQuickPaymentMethod>('NONE');
  const [customerMode, setCustomerMode] = useState<PosCustomerMode>('GUEST');
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<PosCustomerSummary[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<PosCustomerSummary | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [isCustomerSearchModalOpen, setIsCustomerSearchModalOpen] = useState(false);
  const [isCustomerCreateModalOpen, setIsCustomerCreateModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [balanceApplyAmount, setBalanceApplyAmount] = useState('');
  const [isApplyingBalance, setIsApplyingBalance] = useState(false);
  const [lastOnlineOrderId, setLastOnlineOrderId] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [recentSyncedCount, setRecentSyncedCount] = useState<number | null>(null);
  const [showSyncSuccessBanner, setShowSyncSuccessBanner] = useState(false);
  const [queueItems, setQueueItems] = useState<PosOrderQueueItem[]>([]);
  const [queueActionItemId, setQueueActionItemId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [registerCode, setRegisterCode] = useState('MAIN');
  const [openingCashCents, setOpeningCashCents] = useState('0');
  const [closingCashCents, setClosingCashCents] = useState('');
  const [shiftNote, setShiftNote] = useState('');
  const [shiftRows, setShiftRows] = useState<PosShiftRow[]>([]);
  const [activeShift, setActiveShift] = useState<PosShiftRow | null>(null);
  const [isShiftBusy, setIsShiftBusy] = useState(false);
  const [reportDateFrom, setReportDateFrom] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [reportDateTo, setReportDateTo] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [staffSalesReport, setStaffSalesReport] = useState<PosStaffSalesReport | null>(null);
  const [isSalesReportBusy, setIsSalesReportBusy] = useState(false);
  const [salesPeriod, setSalesPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [salesTopLimit, setSalesTopLimit] = useState('10');
  const [salesReport, setSalesReport] = useState<PosSalesReport | null>(null);
  const [isSalesAnalyticsBusy, setIsSalesAnalyticsBusy] = useState(false);
  const [invoiceOrderId, setInvoiceOrderId] = useState('');
  const [invoicePayload, setInvoicePayload] = useState<PosInvoicePayload | null>(null);
  const [isInvoiceBusy, setIsInvoiceBusy] = useState(false);
  const [conflictDetail, setConflictDetail] = useState<string | null>(null);
  const [mismatchModal, setMismatchModal] = useState<PosMismatchModalState | null>(null);
  const mismatchDecisionResolverRef = useRef<
    ((decision: PosMismatchDecision) => void) | null
  >(null);

  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>(
    defaultReceiptSettings,
  );
  const [lastReceipt, setLastReceipt] = useState<ReceiptRecord | null>(null);

  const refreshQueue = useCallback(async () => {
    try {
      const items = await listQueuedPosOrders();
      setQueueItems(items);
    } catch {
      setQueueItems([]);
    }
  }, []);

  const syncQueuedSales = useCallback(async (options?: { force?: boolean; queueIds?: string[] }) => {
    if (!isAuthed) return;
    if (syncInFlightRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const force = Boolean(options?.force);
    const queueIds = (options?.queueIds ?? []).filter(Boolean);
    const queueIdSet = queueIds.length > 0 ? new Set(queueIds) : null;

    syncInFlightRef.current = true;
    setIsSyncing(true);
    try {
      let items: PosOrderQueueItem[] = [];
      if (queueIdSet) {
        const allItems = await listQueuedPosOrders();
        items = allItems.filter((item) => queueIdSet.has(item.id));
      } else if (force) {
        items = await listRetryableQueuedPosOrders();
      } else {
        items = await listReadyQueuedPosOrders();
      }

      let successCount = 0;

      for (const item of items) {
        try {
          const queueIdempotencyKey =
            item.payload.idempotencyKey ?? `pos-queue-${item.id}`;

          // idempotencyKey is frontend-only — strip it from the body before sending
          const { idempotencyKey: _ik, ...bodyWithoutKey } = item.payload;
          await api.post('/orders', bodyWithoutKey, {
            headers: {
              'Idempotency-Key': queueIdempotencyKey,
            },
          });
          await removeQueuedPosOrder(item.id);
          successCount += 1;
        } catch (error) {
          if (isConflictError(error)) {
            // Item is stale; drop from queue to avoid endless conflict retries.
            await removeQueuedPosOrder(item.id);
            continue;
          }

          const message = resolveApiErrorMessage(error, 'Senkronizasyon basarisiz.');
          const status = extractHttpStatus(error);

          if (status !== null && NON_RETRYABLE_QUEUE_ERROR_STATUS.has(status)) {
            await markQueuedPosOrderFailed(item.id, message);
            continue;
          }

          await markQueuedPosOrderAttempt(item.id, message);
          if (isNetworkError(error)) break;
        }
      }

      await refreshQueue();
      if (successCount > 0) {
        setRecentSyncedCount(successCount);
        setShowSyncSuccessBanner(true);
        toast.success(`${successCount} bekleyen satis senkronize edildi.`);
      }
    } finally {
      syncInFlightRef.current = false;
      setIsSyncing(false);
    }
  }, [isAuthed, refreshQueue]);

  const retrySingleQueueItem = useCallback(
    async (item: PosOrderQueueItem) => {
      if (!isAuthed) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        toast.error('Cihaz offline. Yeniden deneme icin baglanti gerekli.');
        return;
      }

      setQueueActionItemId(item.id);
      try {
        await syncQueuedSales({ force: true, queueIds: [item.id] });
      } finally {
        setQueueActionItemId((current) => (current === item.id ? null : current));
      }
    },
    [isAuthed, syncQueuedSales],
  );

  const removeSingleQueueItem = useCallback(
    async (item: PosOrderQueueItem) => {
      if (!isAuthed) return;
      setQueueActionItemId(item.id);
      try {
        await removeQueuedPosOrder(item.id);
        await refreshQueue();
        toast.success('Kuyruk kaydi kaldirildi.');
      } finally {
        setQueueActionItemId((current) => (current === item.id ? null : current));
      }
    },
    [isAuthed, refreshQueue],
  );

  const loadShiftRows = useCallback(async () => {
    if (!isAuthed) return;
    const normalizedRegisterCode = registerCode.trim().toUpperCase() || 'MAIN';
    setIsShiftBusy(true);
    try {
      const res = await api.get<PosShiftRow[]>(
        `/pos/reports/shifts?registerCode=${encodeURIComponent(normalizedRegisterCode)}&limit=12`,
      );
      setShiftRows(res.data);
      setActiveShift(res.data.find((row) => !row.closedAt) ?? null);
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, 'Vardiyalar alinamadi.'));
    } finally {
      setIsShiftBusy(false);
    }
  }, [isAuthed, registerCode]);

  const loadStaffSalesReport = useCallback(async () => {
    if (!isAuthed) return;
    setIsSalesReportBusy(true);
    try {
      const params = new URLSearchParams();
      if (reportDateFrom) params.set('dateFrom', reportDateFrom);
      if (reportDateTo) params.set('dateTo', reportDateTo);
      const query = params.toString();
      const res = await api.get<PosStaffSalesReport>(
        `/pos/reports/staff-sales${query ? `?${query}` : ''}`,
      );
      setStaffSalesReport(res.data);
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, 'Personel satis raporu alinamadi.'));
    } finally {
      setIsSalesReportBusy(false);
    }
  }, [isAuthed, reportDateFrom, reportDateTo]);

  const loadSalesReport = useCallback(async () => {
    if (!isAuthed) return;
    setIsSalesAnalyticsBusy(true);
    try {
      const params = new URLSearchParams();
      params.set('period', salesPeriod);
      if (reportDateFrom) params.set('dateFrom', reportDateFrom);
      if (reportDateTo) params.set('dateTo', reportDateTo);
      const parsedTopLimit = Number(salesTopLimit);
      if (Number.isFinite(parsedTopLimit) && parsedTopLimit > 0) {
        params.set('topLimit', String(parsedTopLimit));
      }
      const res = await api.get<PosSalesReport>(
        `/pos/reports/sales?${params.toString()}`,
      );
      setSalesReport(res.data);
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, 'Satis analitigi alinamadi.'));
    } finally {
      setIsSalesAnalyticsBusy(false);
    }
  }, [isAuthed, reportDateFrom, reportDateTo, salesPeriod, salesTopLimit]);

  const downloadSalesCsv = useCallback(async () => {
    if (!isAuthed) return;
    try {
      const params = new URLSearchParams();
      params.set('period', salesPeriod);
      if (reportDateFrom) params.set('dateFrom', reportDateFrom);
      if (reportDateTo) params.set('dateTo', reportDateTo);
      const parsedTopLimit = Number(salesTopLimit);
      if (Number.isFinite(parsedTopLimit) && parsedTopLimit > 0) {
        params.set('topLimit', String(parsedTopLimit));
      }
      const res = await api.get<string>(`/pos/reports/sales/export?${params.toString()}`, {
        responseType: 'text',
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pos-sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV raporu indirildi.');
    } catch (error) {
      if (isRateLimitError(error)) {
        toast.error('Export limiti asildi. Biraz sonra tekrar deneyin.');
        return;
      }
      toast.error(resolveApiErrorMessage(error, 'CSV export basarisiz.'));
    }
  }, [isAuthed, reportDateFrom, reportDateTo, salesPeriod, salesTopLimit]);

  const printSalesReportPdf = useCallback(() => {
    if (!salesReport) {
      toast.error('Yazdirilacak satis raporu yok.');
      return;
    }
    const html = buildSalesReportPrintHtml(salesReport);
    const printWindow = window.open('', '_blank', 'width=960,height=900');
    if (!printWindow) {
      toast.error('Yazdirma penceresi acilamadi.');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [salesReport]);

  const loadInvoicePayload = useCallback(
    async (forcedOrderId?: number) => {
      if (!isAuthed) return;
      const targetOrderId =
        forcedOrderId ??
        (invoiceOrderId.trim() ? Number(invoiceOrderId.trim()) : lastOnlineOrderId);

      if (!targetOrderId || !Number.isFinite(targetOrderId) || targetOrderId <= 0) {
        toast.error('Fatura icin gecerli siparis no girin.');
        return;
      }

      setIsInvoiceBusy(true);
      try {
        const res = await api.get<PosInvoicePayload>(
          `/pos/orders/${targetOrderId}/invoice`,
        );
        setInvoicePayload(res.data);
        setInvoiceOrderId(String(targetOrderId));
        toast.success(`Fatura verisi yuklendi (#${targetOrderId}).`);
      } catch (error) {
        toast.error(resolveApiErrorMessage(error, 'Fatura verisi alinamadi.'));
      } finally {
        setIsInvoiceBusy(false);
      }
    },
    [invoiceOrderId, isAuthed, lastOnlineOrderId],
  );

  const printA4Invoice = useCallback(() => {
    if (!invoicePayload) {
      toast.error('Yazdirilacak fatura yok.');
      return;
    }
    const html = buildA4InvoiceHtml(invoicePayload);
    const printWindow = window.open('', '_blank', 'width=1024,height=900');
    if (!printWindow) {
      toast.error('Yazdirma penceresi acilamadi.');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [invoicePayload]);

  const openShift = useCallback(async () => {
    if (!isAuthed) return;
    const normalizedRegisterCode = registerCode.trim().toUpperCase() || 'MAIN';
    const parsedOpening = Number(openingCashCents);
    if (!Number.isFinite(parsedOpening) || parsedOpening < 0) {
      toast.error('Gecerli acilis nakit tutari girin.');
      return;
    }

    setIsShiftBusy(true);
    try {
      await api.post('/pos/register-session/open', {
        registerCode: normalizedRegisterCode,
        openingCashCents: parsedOpening,
        note: shiftNote.trim() || undefined,
      });
      toast.success(`${normalizedRegisterCode} vardiyasi acildi.`);
      await loadShiftRows();
      await loadStaffSalesReport();
      await loadSalesReport();
    } catch (error) {
      if (isConflictError(error)) {
        setConflictDetail(
          resolveApiErrorMessage(
            error,
            'Bu register icin baska terminalde acik vardiya var.',
          ),
        );
        return;
      }
      toast.error(resolveApiErrorMessage(error, 'Vardiya acilamadi.'));
    } finally {
      setIsShiftBusy(false);
    }
  }, [
    isAuthed,
    loadShiftRows,
    loadStaffSalesReport,
    loadSalesReport,
    openingCashCents,
    registerCode,
    shiftNote,
  ]);

  const closeShift = useCallback(async () => {
    if (!isAuthed) return;
    if (!activeShift) {
      toast.error('Secili kasada acik vardiya yok.');
      return;
    }

    const parsedClosing = Number(closingCashCents);
    if (!Number.isFinite(parsedClosing) || parsedClosing < 0) {
      toast.error('Gecerli kapanis nakit tutari girin.');
      return;
    }

    setIsShiftBusy(true);
    try {
      await api.post('/pos/register-session/close', {
        sessionId: activeShift.id,
        registerCode: activeShift.registerCode,
        closingCashCents: parsedClosing,
        note: shiftNote.trim() || undefined,
      });
      toast.success(`${activeShift.registerCode} vardiyasi kapatildi.`);
      setClosingCashCents('');
      await loadShiftRows();
      await loadStaffSalesReport();
      await loadSalesReport();
    } catch (error) {
      if (isConflictError(error)) {
        setConflictDetail(
          resolveApiErrorMessage(
            error,
            'Vardiya kapanisi baska terminalde degistigi icin tamamlanamadi.',
          ),
        );
        return;
      }
      toast.error(resolveApiErrorMessage(error, 'Vardiya kapatilamadi.'));
    } finally {
      setIsShiftBusy(false);
    }
  }, [
    activeShift,
    closingCashCents,
    isAuthed,
    loadShiftRows,
    loadStaffSalesReport,
    loadSalesReport,
    shiftNote,
  ]);

  const ensureShiftSession = useCallback(async () => {
    if (!isAuthed) return false;
    try {
      const currentRes = await api.get<PosShiftRow | null>('/pos/register-session/current');
      const current = currentRes.data;
      if (current && !current.closedAt) {
        setActiveShift(current);
        if (!registerCode.trim()) {
          setRegisterCode(current.registerCode);
        }
        return true;
      }
      setActiveShift(null);
      await loadShiftRows();
      return false;
    } catch {
      await loadShiftRows();
      return false;
    }
  }, [isAuthed, loadShiftRows, registerCode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(RECEIPT_SETTINGS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<ReceiptSettings>;
      setReceiptSettings({
        businessName: parsed.businessName || defaultReceiptSettings.businessName,
        footerNote: parsed.footerNote || defaultReceiptSettings.footerNote,
      });
    } catch {
      setReceiptSettings(defaultReceiptSettings);
    }
  }, []);

  useEffect(() => {
    void purgeOldReceiptPrintLogs(7);
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const updateOnlineState = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) void syncQueuedSales();
    };
    updateOnlineState();
    window.addEventListener('online', updateOnlineState);
    window.addEventListener('offline', updateOnlineState);
    void refreshQueue();
    return () => {
      window.removeEventListener('online', updateOnlineState);
      window.removeEventListener('offline', updateOnlineState);
    };
  }, [refreshQueue, syncQueuedSales]);

  useEffect(() => {
    if (!isAuthed) return;
    if (!isOnline) return;

    const interval = window.setInterval(() => {
      void syncQueuedSales();
    }, 20_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isAuthed, isOnline, syncQueuedSales]);

  useEffect(() => {
    if (!showSyncSuccessBanner) return;
    const timeout = window.setTimeout(() => {
      setShowSyncSuccessBanner(false);
    }, 5000);
    return () => window.clearTimeout(timeout);
  }, [showSyncSuccessBanner]);

  useEffect(() => {
    if (!isAuthed) return;
    void ensureShiftSession();
  }, [ensureShiftSession, isAuthed]);

  useEffect(() => {
    if (!isAuthed) return;
    if (user?.role === 'USER') return;
    void loadStaffSalesReport();
  }, [isAuthed, loadStaffSalesReport, user?.role]);

  useEffect(() => {
    if (!isAuthed) return;
    if (user?.role === 'USER') return;
    void loadSalesReport();
  }, [isAuthed, loadSalesReport, user?.role]);


  const queueCount = queueItems.length;
  const hasQueue = queueCount > 0;
  const splitTotalCents = useMemo(
    () =>
      splitPayments.reduce((acc, line) => {
        const amount = Number(line.amountCents);
        if (!Number.isFinite(amount) || amount <= 0) return acc;
        return acc + Math.trunc(amount);
      }, 0),
    [splitPayments],
  );
  const maxTrendSales = useMemo(() => {
    if (!salesReport?.trend?.length) return 0;
    return salesReport.trend.reduce(
      (max, row) => Math.max(max, row.salesTotalCents),
      0,
    );
  }, [salesReport]);
  const queueSeverityClass = useMemo(() => {
    if (queueCount >= 20) return 'border-red-200 bg-red-50 text-red-800';
    if (queueCount >= 8) return 'border-amber-200 bg-amber-50 text-amber-800';
    return 'border-[#D8DED8] bg-white text-[#1A3C34]';
  }, [queueCount]);

  const isCheckingAccessView = isCheckingAccess && !user;
  const isUnauthorizedView = !isCheckingAccessView && (!user || !isPosRoleAllowed(user.role));
  const parsedQuantityInput = Number(quantity);
  const parsedUnitPriceInput = Number(unitPriceCents);
  const parsedItemDiscountInput = Number(itemDiscountCents);
  const parsedCartDiscountInput = Number(cartDiscountCents);
  const cartSubtotalCents = cartItems.reduce((acc, row) => {
    if (
      !Number.isFinite(row.quantity) ||
      row.quantity <= 0 ||
      !Number.isFinite(row.expectedUnitPriceCents) ||
      (row.expectedUnitPriceCents ?? 0) <= 0
    ) {
      return acc;
    }
    return acc + Math.trunc(row.quantity) * Math.trunc(row.expectedUnitPriceCents ?? 0);
  }, 0);
  const cartLineDiscountCents = cartItems.reduce((acc, row) => {
    if (!Number.isFinite(row.discountAmountCents) || (row.discountAmountCents ?? 0) <= 0) {
      return acc;
    }
    return acc + Math.trunc(row.discountAmountCents ?? 0);
  }, 0);
  const draftLineSubtotalCents =
    Number.isFinite(parsedQuantityInput) &&
      Number.isFinite(parsedUnitPriceInput) &&
      parsedQuantityInput > 0 &&
      parsedUnitPriceInput > 0
      ? Math.trunc(parsedQuantityInput) * Math.trunc(parsedUnitPriceInput)
      : undefined;
  const draftLineDiscountCents =
    Number.isFinite(parsedItemDiscountInput) && parsedItemDiscountInput > 0
      ? Math.trunc(parsedItemDiscountInput)
      : 0;
  const usesCartEstimate = cartItems.length > 0;
  const estimatedSubtotalCents = usesCartEstimate ? cartSubtotalCents : draftLineSubtotalCents;
  const estimatedDiscountCents =
    (usesCartEstimate ? cartLineDiscountCents : draftLineDiscountCents) +
    (Number.isFinite(parsedCartDiscountInput) && parsedCartDiscountInput > 0
      ? Math.trunc(parsedCartDiscountInput)
      : 0);
  const estimatedPayableCents =
    typeof estimatedSubtotalCents === 'number'
      ? Math.max(estimatedSubtotalCents - estimatedDiscountCents, 0)
      : undefined;
  const estimatedRemainingCents =
    typeof estimatedPayableCents === 'number'
      ? Math.max(estimatedPayableCents - splitTotalCents, 0)
      : undefined;

  const resolveQueueStatus = (item: PosOrderQueueItem) => {
    const attempts = Math.max(0, Math.trunc(item.attempts ?? 0));
    if (attempts >= MAX_QUEUE_RETRY_ATTEMPTS) return 'FAILED';
    if (attempts > 0) {
      if (item.nextRetryAt && new Date(item.nextRetryAt).getTime() > Date.now()) {
        return 'BACKOFF';
      }
      return 'RETRYING';
    }
    if (!isPosOrderRetryable(item)) return 'FAILED';
    return 'QUEUED';
  };

  const formatQueueDate = (value?: string) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) return '-';
    return parsed.toLocaleString('tr-TR');
  };

  const waitForMismatchDecision = useCallback(
    (payload: PosMismatchModalState) =>
      new Promise<PosMismatchDecision>((resolve) => {
        mismatchDecisionResolverRef.current = resolve;
        setMismatchModal(payload);
      }),
    [],
  );

  const resolveMismatchDecision = useCallback((decision: PosMismatchDecision) => {
    const resolver = mismatchDecisionResolverRef.current;
    mismatchDecisionResolverRef.current = null;
    setMismatchModal(null);
    if (resolver) {
      resolver(decision);
    }
  }, []);

  useEffect(() => {
    return () => {
      const resolver = mismatchDecisionResolverRef.current;
      mismatchDecisionResolverRef.current = null;
      if (resolver) {
        resolver('cancel');
      }
    };
  }, []);

  const saveReceiptSettings = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      RECEIPT_SETTINGS_KEY,
      JSON.stringify(receiptSettings),
    );
    toast.success('Fis ayarlari kaydedildi.');
  };

  const printReceiptRecord = useCallback(
    async (receipt: ReceiptRecord, options?: { force?: boolean }) => {
      if (!options?.force) {
        try {
          const isAlreadyPrinted = await hasReceiptBeenPrinted(receipt.saleId);
          if (isAlreadyPrinted) {
            toast('Bu fis daha once yazdirildi.');
            return false;
          }
        } catch {
          // Offline print idempotency is best-effort.
        }
      }

      const html = buildReceiptHtml(receiptSettings, receipt);
      const printWindow = window.open('', '_blank', 'width=420,height=760');
      if (!printWindow) {
        toast.error('Yazdirma penceresi acilamadi.');
        return false;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      try {
        await markReceiptPrinted(receipt.saleId);
      } catch {
        // Ignore receipt print log write errors.
      }
      return true;
    },
    [receiptSettings],
  );

  const printReceipt = async () => {
    if (!lastReceipt) {
      toast.error('Yazdirilacak fis yok.');
      return;
    }
    const printed = await printReceiptRecord(lastReceipt, { force: true });
    if (!printed) {
      toast.error('Fis yazdirilamadi.');
    }
  };

  const addProductToCart = useCallback(
    (payload: {
      productId: number;
      variantId?: number | null;
      name: string;
      priceCents?: number;
      sku?: string | null;
      quantity?: number;
    }) => {
      const nextQuantity =
        Number.isFinite(payload.quantity) && (payload.quantity ?? 0) > 0
          ? Math.trunc(payload.quantity ?? 1)
          : 1;
      const nextItem: PosCartDraftItem = {
        key: createIdempotencyKey('pos-item'),
        productId: payload.productId,
        variantId:
          typeof payload.variantId === 'number' && payload.variantId > 0
            ? payload.variantId
            : null,
        name: payload.name,
        quantity: nextQuantity,
        expectedUnitPriceCents:
          Number.isFinite(payload.priceCents) && (payload.priceCents ?? 0) > 0
            ? Math.trunc(payload.priceCents ?? 0)
            : undefined,
      };

      setCartItems((prev) => {
        const idx = prev.findIndex(
          (row) =>
            row.productId === nextItem.productId &&
            row.variantId === nextItem.variantId &&
            (row.expectedUnitPriceCents ?? null) ===
            (nextItem.expectedUnitPriceCents ?? null) &&
            (row.discountAmountCents ?? null) ===
            (nextItem.discountAmountCents ?? null),
        );
        if (idx < 0) return [...prev, nextItem];
        return prev.map((row, i) =>
          i === idx ? { ...row, quantity: row.quantity + nextItem.quantity } : row,
        );
      });

      setProductId(String(payload.productId));
      setVariantId(nextItem.variantId);
      if (typeof nextItem.expectedUnitPriceCents === 'number') {
        setUnitPriceCents(String(nextItem.expectedUnitPriceCents));
      }
      setResolvedProductName(payload.name);
      if (payload.sku) {
        setBarcodeInput(payload.sku);
      }
    },
    [],
  );

  const lookupBarcode = useCallback(
    async (rawCode: string) => {
      const code = rawCode.trim();
      if (!code || !isAuthed) return;
      try {
        const res = await api.get<BarcodeLookupResponse>(
          `/pos/products/barcode/${encodeURIComponent(code)}`,
        );
        const data = res.data;
        addProductToCart({
          productId: data.productId,
          variantId: data.variantId ?? null,
          name: data.name,
          priceCents: data.priceCents,
          sku: code,
          quantity: 1,
        });
        void upsertCachedPosProducts([
          {
            productId: data.productId,
            variantId: data.variantId ?? null,
            name: data.name,
            priceCents: data.priceCents,
            sku: code,
          },
        ]);
        toast.success(`Urun sepete eklendi: ${data.name}`);
      } catch (error) {
        if (isNetworkError(error)) {
          const cached = await findCachedPosProductByBarcode(code);
          if (cached) {
            addProductToCart({
              productId: cached.productId,
              variantId: cached.variantId,
              name: cached.name,
              priceCents: cached.priceCents,
              sku: cached.sku,
              quantity: 1,
            });
            toast('Offline urun cache kullanildi.');
            return;
          }
        }
        toast.error(resolveApiErrorMessage(error, 'Barkod eslesmedi.'));
      }
    },
    [addProductToCart, isAuthed],
  );

  const searchProducts = useCallback(async () => {
    if (!isAuthed) return;
    setIsSearchingProduct(true);
    try {
      const q = productQuery.trim();
      const endpoint = `/pos/products/search?limit=20${q ? `&q=${encodeURIComponent(q)}` : ''}`;
      const res = await api.get<PosProductSearchRow[]>(endpoint);
      setProductResults(res.data);
      void upsertCachedPosProducts(
        res.data.map((row) => ({
          productId: row.productId,
          variantId: row.variantId,
          name: row.name,
          sku: row.sku,
          priceCents: row.priceCents,
          stock: row.stock,
        })),
      );
    } catch (error) {
      if (isNetworkError(error)) {
        const normalizedQuery = productQuery.trim().toLowerCase();
        const cached = await listCachedPosProducts(100);
        const rows = cached
          .filter((row) => {
            if (!normalizedQuery) return true;
            return (
              row.name.toLowerCase().includes(normalizedQuery) ||
              String(row.sku ?? '').toLowerCase().includes(normalizedQuery) ||
              String(row.productId).includes(normalizedQuery) ||
              String(row.variantId ?? '').includes(normalizedQuery)
            );
          })
          .slice(0, 20)
          .map((row) => ({
            type: row.variantId ? 'VARIANT' : 'PRODUCT',
            productId: row.productId,
            variantId: row.variantId,
            name: row.name,
            sku: row.sku,
            priceCents: row.priceCents,
            stock: row.stock ?? null,
          } satisfies PosProductSearchRow));

        setProductResults(rows);
        if (rows.length > 0) {
          toast('Offline urun cache sonuclari gosterildi.');
          return;
        }
      }
      toast.error(resolveApiErrorMessage(error, 'Urun aranirken hata olustu.'));
    } finally {
      setIsSearchingProduct(false);
    }
  }, [isAuthed, productQuery]);

  const selectProduct = useCallback(
    (product: PosProductSearchRow) => {
      addProductToCart({
        productId: product.productId,
        variantId: product.variantId ?? null,
        name: product.name,
        priceCents: product.priceCents,
        sku: product.sku,
        quantity: 1,
      });
    },
    [addProductToCart],
  );

  const removeCartItem = useCallback((key: string) => {
    setCartItems((prev) => prev.filter((row) => row.key !== key));
  }, []);

  const updateCartItemQuantity = useCallback((key: string, nextQuantity: number) => {
    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
      setCartItems((prev) => prev.filter((row) => row.key !== key));
      return;
    }
    setCartItems((prev) =>
      prev.map((row) =>
        row.key === key ? { ...row, quantity: Math.max(1, Math.trunc(nextQuantity)) } : row,
      ),
    );
  }, []);

  const searchCustomers = useCallback(async () => {
    if (!isAuthed) return;
    setIsSearchingCustomer(true);
    try {
      const res = await api.get<PosCustomerSummary[]>(
        `/pos/customers/search?q=${encodeURIComponent(customerQuery.trim())}&limit=10`,
      );
      setCustomerResults(res.data);
      void upsertCachedPosCustomers(
        res.data.map((row) => ({
          customerId: row.id,
          name: row.name,
          phone: row.phone,
          balance: row.balance,
        })),
      );
    } catch (error) {
      if (isNetworkError(error)) {
        const cachedRows = await findCachedPosCustomers(customerQuery.trim(), 10);
        const mapped = cachedRows.map((row) => ({
          id: row.customerId,
          name: row.name,
          phone: row.phone,
          balance: row.balance,
        }));
        setCustomerResults(mapped);
        if (mapped.length > 0) {
          toast('Offline musteri cache sonuclari gosterildi.');
          return;
        }
      }
      toast.error(resolveApiErrorMessage(error, 'Musteri aranirken hata olustu.'));
    } finally {
      setIsSearchingCustomer(false);
    }
  }, [customerQuery, isAuthed]);

  const selectCustomer = useCallback((customer: PosCustomerSummary) => {
    setSelectedCustomer(customer);
    setCustomerId(String(customer.id));
    setCustomerMode('CUSTOMER');
  }, []);

  useEffect(() => {
    if (!isAuthed || !isProductSearchModalOpen) return;
    void searchProducts();
  }, [isAuthed, isProductSearchModalOpen, searchProducts]);

  useEffect(() => {
    if (!isAuthed || !isCustomerSearchModalOpen) return;
    void searchCustomers();
  }, [isAuthed, isCustomerSearchModalOpen, searchCustomers]);

  const createPosCustomer = useCallback(async () => {
    if (!isAuthed) return;
    const normalizedName = newCustomerName.trim();
    const normalizedPhone = newCustomerPhone.trim();
    if (!normalizedName) {
      toast.error('Musteri adi zorunlu.');
      return;
    }
    if (!normalizedPhone) {
      toast.error('Telefon zorunlu.');
      return;
    }

    setIsCreatingCustomer(true);
    try {
      const res = await api.post<PosCustomerSummary>('/pos/customers', {
        name: normalizedName,
        phone: normalizedPhone,
      });
      setSelectedCustomer(res.data);
      setCustomerId(String(res.data.id));
      setCustomerMode('CUSTOMER');
      setIsCustomerCreateModalOpen(false);
      setIsCustomerSearchModalOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      void upsertCachedPosCustomers([
        {
          customerId: res.data.id,
          name: res.data.name,
          phone: res.data.phone,
          balance: res.data.balance,
        },
      ]);
      toast.success(`Musteri secildi: #${res.data.id} ${res.data.name}`);
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, 'Musteri olusturulamadi.'));
    } finally {
      setIsCreatingCustomer(false);
    }
  }, [isAuthed, newCustomerName, newCustomerPhone]);

  const applyCustomerBalance = useCallback(async () => {
    if (!lastOnlineOrderId) {
      toast.error('Bakiyeyi uygulamak icin online olusan siparis gerekli.');
      return;
    }
    if (!selectedCustomer) {
      toast.error('Lutfen once musteri secin.');
      return;
    }

    const parsedAmount = Number(balanceApplyAmount);
    const payload =
      Number.isFinite(parsedAmount) && parsedAmount > 0
        ? { amountCents: parsedAmount }
        : {};

    setIsApplyingBalance(true);
    try {
      const res = await api.post<{
        appliedAmountCents: number;
        remainingDueCents: number;
        customerBalanceCents: number;
      }>(`/pos/orders/${lastOnlineOrderId}/apply-balance`, payload);

      setSelectedCustomer((prev) =>
        prev
          ? {
            ...prev,
            balance: res.data.customerBalanceCents,
          }
          : prev,
      );
      toast.success(
        `Bakiye uygulandi: ${formatMoney(res.data.appliedAmountCents)} (kalan borc: ${formatMoney(res.data.remainingDueCents)})`,
      );
    } catch (error) {
      if (isConflictError(error)) {
        setConflictDetail(
          resolveApiErrorMessage(
            error,
            'Siparis bakiyesi baska terminalde guncellendi.',
          ),
        );
        return;
      }
      toast.error(resolveApiErrorMessage(error, 'Bakiye uygulanamadi.'));
    } finally {
      setIsApplyingBalance(false);
    }
  }, [balanceApplyAmount, lastOnlineOrderId, selectedCustomer]);

  const updateSplitPaymentLine = useCallback(
    (
      index: number,
      field: keyof PosSplitPaymentDraft,
      value: PosSplitPaymentDraft[keyof PosSplitPaymentDraft],
    ) => {
      setSplitPayments((prev) =>
        prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
      );
    },
    [],
  );

  const addSplitPaymentLine = useCallback(() => {
    setSplitPayments((prev) => [...prev, { method: 'OTHER', amountCents: '', reference: '' }]);
  }, []);

  const removeSplitPaymentLine = useCallback((index: number) => {
    setSplitPayments((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const parseSplitPaymentPayload = useCallback(() => {
    const lines: PosSplitPaymentLinePayload[] = [];

    for (const line of splitPayments) {
      const raw = line.amountCents.trim();
      if (!raw) continue;

      const amount = Number(raw);
      if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
        throw new Error('Split odeme tutarlari pozitif tam sayi (kurus) olmali.');
      }

      const entry: PosSplitPaymentLinePayload = {
        method: line.method,
        amountCents: amount,
      };
      const reference = line.reference.trim();
      if (reference.length > 0) {
        entry.reference = reference;
      }
      lines.push(entry);
    }

    const total = lines.reduce((acc, line) => acc + line.amountCents, 0);
    return { lines, total };
  }, [splitPayments]);

  useEffect(() => {
    if (!isAuthed) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTypingInInput =
        tag === 'input' || tag === 'textarea' || tag === 'select';
      if (isTypingInInput) return;

      if (event.key === 'Enter') {
        const captured = scannerBufferRef.current;
        if (captured.length >= 4) {
          void lookupBarcode(captured);
        }
        scannerBufferRef.current = '';
        return;
      }

      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        scannerBufferRef.current = `${scannerBufferRef.current}${event.key}`;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAuthed, lookupBarcode]);

  const handleCreateSale = async () => {
    if (!isAuthed) return;
    const hasActiveShift = await ensureShiftSession();
    if (!hasActiveShift) {
      toast.error('Vardiya baslatmadan satis yapilamaz.');
      return;
    }

    const parsedCustomerId =
      customerMode === 'CUSTOMER' ? selectedCustomer?.id ?? Number(customerId) : undefined;
    const normalizedCustomerId =
      customerMode === 'CUSTOMER' &&
        typeof parsedCustomerId === 'number' &&
        Number.isFinite(parsedCustomerId) &&
        parsedCustomerId > 0
        ? Math.trunc(parsedCustomerId)
        : undefined;
    const parsedCartDiscountCents = Number(cartDiscountCents);
    const saleDraftItems: PosCartDraftItem[] =
      cartItems.length > 0 ? [...cartItems] : [];

    if (customerMode === 'CUSTOMER' && typeof normalizedCustomerId !== 'number') {
      toast.error('Musteri secin veya yeni musteri ekleyin.');
      return;
    }
    if (quickPaymentMethod === 'CREDIT' && typeof normalizedCustomerId !== 'number') {
      toast.error('Veresiye satis icin musteri secimi zorunlu.');
      return;
    }

    if (saleDraftItems.length === 0) {
      const parsedProductId = Number(productId);
      const parsedQuantity = Number(quantity);
      const parsedUnitPriceCents = Number(unitPriceCents);
      const parsedItemDiscountCents = Number(itemDiscountCents);

      if (!Number.isFinite(parsedProductId) || parsedProductId <= 0) {
        toast.error('Gecerli productId girin veya urunu sepete ekleyin.');
        return;
      }
      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        toast.error('Gecerli quantity girin.');
        return;
      }

      saleDraftItems.push({
        key: createIdempotencyKey('pos-item'),
        productId: Math.trunc(parsedProductId),
        variantId: typeof variantId === 'number' && variantId > 0 ? variantId : null,
        name: resolvedProductName || `Urun #${Math.trunc(parsedProductId)}`,
        quantity: Math.max(1, Math.trunc(parsedQuantity)),
        expectedUnitPriceCents:
          Number.isFinite(parsedUnitPriceCents) && parsedUnitPriceCents > 0
            ? Math.trunc(parsedUnitPriceCents)
            : undefined,
        discountAmountCents:
          Number.isFinite(parsedItemDiscountCents) && parsedItemDiscountCents > 0
            ? Math.trunc(parsedItemDiscountCents)
            : undefined,
      });
    }

    let splitPaymentPayload: {
      lines: PosSplitPaymentLinePayload[];
      total: number;
    };
    try {
      splitPaymentPayload = parseSplitPaymentPayload();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Split odeme satirlari gecersiz.',
      );
      return;
    }

    if (quickPaymentMethod !== 'NONE' && splitPaymentPayload.lines.length > 0) {
      toast.error('Hizli odeme ile split odeme ayni anda kullanilamaz.');
      return;
    }

    const payloadItems: PosOrderQueuePayload['items'] = saleDraftItems.map((row) => {
      const line: PosOrderQueuePayload['items'][number] = {
        productId: row.productId,
        quantity: Math.max(1, Math.trunc(row.quantity)),
      };
      if (typeof row.variantId === 'number' && row.variantId > 0) {
        line.variantId = row.variantId;
      }
      if (
        Number.isFinite(row.expectedUnitPriceCents) &&
        (row.expectedUnitPriceCents ?? 0) > 0
      ) {
        line.expectedUnitPriceCents = Math.trunc(row.expectedUnitPriceCents ?? 0);
      }
      if (Number.isFinite(row.discountAmountCents) && (row.discountAmountCents ?? 0) > 0) {
        line.discountAmountCents = Math.trunc(row.discountAmountCents ?? 0);
      }
      return line;
    });

    const payload: PosOrderQueuePayload = {
      idempotencyKey: createIdempotencyKey('pos-sale'),
      source: 'POS',
      notes: note.trim() || undefined,
      items: payloadItems,
    };
    if (splitPaymentPayload.lines.length > 0) {
      payload.paymentMode = 'SPLIT';
    } else if (quickPaymentMethod !== 'NONE') {
      payload.paymentMode = quickPaymentMethod;
    }
    if (typeof normalizedCustomerId === 'number') {
      payload.customerId = normalizedCustomerId;
    }
    if (Number.isFinite(parsedCartDiscountCents) && parsedCartDiscountCents > 0) {
      payload.cartDiscountAmountCents = Math.trunc(parsedCartDiscountCents);
    }

    if (
      typeof navigator !== 'undefined' &&
      !navigator.onLine &&
      splitPaymentPayload.lines.length > 0
    ) {
      toast.error(
        'Offline modda split odeme desteklenmiyor. Baglanti gelince tekrar deneyin.',
      );
      return;
    }
    if (
      typeof navigator !== 'undefined' &&
      !navigator.onLine &&
      (quickPaymentMethod === 'CASH' || quickPaymentMethod === 'CARD')
    ) {
      toast.error(
        'Offline modda nakit/kart odeme kaydi anlik islenemez. Baglanti ile tekrar deneyin.',
      );
      return;
    }

    const payloadSubtotalCents = payload.items.reduce((acc, line) => {
      if (
        !Number.isFinite(line.expectedUnitPriceCents) ||
        (line.expectedUnitPriceCents ?? 0) <= 0
      ) {
        return acc;
      }
      return acc + Math.trunc(line.expectedUnitPriceCents ?? 0) * Math.trunc(line.quantity);
    }, 0);
    const payloadLineDiscountCents = payload.items.reduce((acc, line) => {
      if (!Number.isFinite(line.discountAmountCents) || (line.discountAmountCents ?? 0) <= 0) {
        return acc;
      }
      return acc + Math.trunc(line.discountAmountCents ?? 0);
    }, 0);
    const estimatedPayloadTotalCents =
      payloadSubtotalCents > 0
        ? Math.max(
          payloadSubtotalCents -
          payloadLineDiscountCents -
          (payload.cartDiscountAmountCents ?? 0),
          0,
        )
        : undefined;

    setIsSubmitting(true);
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const queued = await enqueuePosOrder(payload);
        await refreshQueue();
        const queuedReceipt: ReceiptRecord = {
          saleId: `Q-${queued.id.slice(0, 8)}`,
          createdAt: queued.createdAt,
          customerId: payload.customerId,
          lines: payload.items.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPriceCents: line.expectedUnitPriceCents,
          })),
          totalAmountCents: estimatedPayloadTotalCents,
          note: payload.notes,
          isOfflineQueued: true,
        };
        setLastReceipt(queuedReceipt);
        if (autoPrintReceipt) {
          void printReceiptRecord(queuedReceipt);
        }
        toast.success('Internet yok. Satis lokal kuyruga alindi.');
        return;
      }

      // idempotencyKey is frontend-only — strip it from the body before sending
      const { idempotencyKey: _idk, ...orderBody } = payload;
      const res = await api.post<{
        id: number;
        customerId?: number;
        totalAmountCents: number;
        createdAt: string;
        creditLimitWarned?: boolean;
        priceMismatch?: boolean;
        priceMismatchMetaJson?: unknown;
        items?: Array<{
          productId: number;
          quantity: number;
          unitPriceCents: number;
        }>;
      }>('/orders', orderBody, {
        headers: {
          'Idempotency-Key': payload.idempotencyKey,
        },
      });

      const data = res.data;
      setLastOnlineOrderId(data.id);
      setInvoiceOrderId(String(data.id));

      let continueWithPayment = true;
      if (data.priceMismatch) {
        const expectedCents = extractMetaNumber(data.priceMismatchMetaJson, [
          'expectedTotalAmountCents',
          'expectedTotalCents',
          'expectedPriceCents',
          'pricing.expectedTotalAmountCents',
          'pricing.expectedPriceCents',
        ]);
        const actualCents =
          extractMetaNumber(data.priceMismatchMetaJson, [
            'actualTotalAmountCents',
            'actualTotalCents',
            'actualPriceCents',
            'pricing.actualTotalAmountCents',
            'pricing.actualPriceCents',
          ]) ?? data.totalAmountCents;

        const decision = await waitForMismatchDecision({
          expectedCents,
          actualCents,
        });
        continueWithPayment = decision === 'continue';
      }

      let splitApplied:
        | { appliedAmountCents: number; remainingDueCents: number }
        | undefined;
      let quickPaymentApplied:
        | { amountCents: number; method: string }
        | undefined;
      let creditSaleApplied = false;
      if (continueWithPayment && splitPaymentPayload.lines.length > 0) {
        const splitRes = await api.post<{
          appliedAmountCents: number;
          remainingDueCents: number;
        }>(`/pos/orders/${data.id}/split-payment`, {
          payments: splitPaymentPayload.lines,
        });
        splitApplied = {
          appliedAmountCents: splitRes.data.appliedAmountCents,
          remainingDueCents: splitRes.data.remainingDueCents,
        };
      } else if (
        continueWithPayment &&
        (quickPaymentMethod === 'CASH' || quickPaymentMethod === 'CARD') &&
        data.totalAmountCents > 0
      ) {
        const paymentRes = await api.post<{
          amountCents: number;
          method: string;
        }>(`/orders/${data.id}/payments`, {
          amount: String(data.totalAmountCents),
          method: quickPaymentMethod,
        });
        quickPaymentApplied = {
          amountCents: paymentRes.data.amountCents,
          method: paymentRes.data.method,
        };
      } else if (continueWithPayment && quickPaymentMethod === 'CREDIT') {
        creditSaleApplied = true;
      }

      const nextReceipt: ReceiptRecord = {
        saleId: String(data.id),
        createdAt: data.createdAt || new Date().toISOString(),
        customerId: data.customerId ?? payload.customerId,
        lines:
          data.items?.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
          })) ??
          payload.items.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPriceCents: line.expectedUnitPriceCents,
          })),
        totalAmountCents: data.totalAmountCents,
        note: payload.notes,
        isOfflineQueued: false,
      };
      setLastReceipt(nextReceipt);
      if (autoPrintReceipt) {
        void printReceiptRecord(nextReceipt);
      }

      setCartItems([]);
      setProductId('');
      setQuantity('1');
      setUnitPriceCents('');
      setItemDiscountCents('');
      setCartDiscountCents('');
      setVariantId(null);
      setResolvedProductName('');
      setBarcodeInput('');
      if (customerMode === 'GUEST') {
        setSelectedCustomer(null);
        setCustomerId('');
      }
      setCustomerResults([]);
      setSplitPayments(defaultSplitPaymentRows.map((line) => ({ ...line })));
      void loadInvoicePayload(data.id);
      if (splitApplied) {
        toast.success(
          `Satis olusturuldu. Split odeme: ${formatMoney(splitApplied.appliedAmountCents)} (kalan: ${formatMoney(splitApplied.remainingDueCents)})`,
        );
      } else if (quickPaymentApplied) {
        toast.success(
          `Satis olusturuldu. ${quickPaymentApplied.method} tahsilat: ${formatMoney(quickPaymentApplied.amountCents)}`,
        );
      } else if (creditSaleApplied) {
        toast.success('Veresiye satis olusturuldu.');
      } else if (!continueWithPayment) {
        toast('Fiyat degisikligi nedeniyle odeme adimi iptal edildi. Siparis risk paneline kaydedildi.');
      } else {
        toast.success('Satis olusturuldu.');
      }
      if (data.creditLimitWarned) {
        toast('Veresiye limiti asildi, satis WARN politikasiyla devam etti.');
      }
    } catch (error) {
      if (isConflictError(error)) {
        setConflictDetail(
          resolveApiErrorMessage(
            error,
            'Siparis baska terminalde degistigi icin islem tamamlanamadi.',
          ),
        );
        return;
      }
      if (isNetworkError(error)) {
        if (splitPaymentPayload.lines.length > 0) {
          toast.error(
            'Baglanti kesildi. Split odeme satirlari varken offline kuyruga alinmaz.',
          );
          return;
        }
        if (quickPaymentMethod === 'CASH' || quickPaymentMethod === 'CARD') {
          toast.error(
            'Baglanti kesildi. Hizli nakit/kart seciliyken satis offline kuyruga alinmaz.',
          );
          return;
        }
        const queued = await enqueuePosOrder(payload);
        await refreshQueue();
        const queuedReceipt: ReceiptRecord = {
          saleId: `Q-${queued.id.slice(0, 8)}`,
          createdAt: queued.createdAt,
          customerId: payload.customerId,
          lines: payload.items.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPriceCents: line.expectedUnitPriceCents,
          })),
          totalAmountCents: estimatedPayloadTotalCents,
          note: payload.notes,
          isOfflineQueued: true,
        };
        setLastReceipt(queuedReceipt);
        if (autoPrintReceipt) {
          void printReceiptRecord(queuedReceipt);
        }
        toast.success('Baglanti kesildi. Satis lokal kuyruga alindi.');
      } else {
        toast.error(resolveApiErrorMessage(error, 'Satis olusturulamadi.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingAccessView) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F7F3]">
        <span className="text-sm text-[#1A3C34]/60">Yetki kontrol ediliyor...</span>
      </div>
    );
  }

  if (isUnauthorizedView) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F7F3]">
        <span className="text-sm text-[#1A3C34]/60">Yönlendiriliyor...</span>
      </div>
    );
  }

  return (
    <div className="pos-redesign flex w-full flex-col gap-0 bg-transparent">
      {/* ── Sticky POS Topbar ── */}
      <header className="sticky top-0 z-40 border-b border-[#E5E5E0] bg-white px-4 py-2 text-[#1A3C34] shadow-xs md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A3C34]/10 text-[#1A3C34]">
              <span className="text-[10px] font-bold uppercase tracking-widest">POS</span>
            </div>
            {/* Status badges */}
            <span className="hidden h-5 w-px bg-[#E5E5E0] sm:block" />
            <div title={isOnline ? 'Online' : 'Offline'} className={`flex h-8 w-8 items-center justify-center rounded-full ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            </div>
            <div title={activeShift ? `Kasa: ${activeShift.registerCode}` : 'Vardiya kapalı'} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1A3C34]/5 text-[#1A3C34]/70">
              <Briefcase className="h-4 w-4" />
            </div>
            {hasQueue ? (
              <div title={`Bekleyen İşlem: ${queueCount}`} className={`flex h-8 items-center justify-center gap-1.5 rounded-full px-3 ${queueSeverityClass}`}>
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs font-bold">{queueCount}</span>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isOnline ? null : (
              <Button
                title="Kuyruğu Senkronize Et"
                variant="secondary"
                className="flex h-8 w-8 items-center justify-center rounded-full border-transparent bg-[#1A3C34]/5 p-0 text-[#1A3C34] hover:bg-[#1A3C34]/15"
                onClick={() => void syncQueuedSales({ force: true })}
                disabled={!isAuthed || !hasQueue || !isOnline || isSyncing}
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              </Button>
            )}
            <Button
              title={isFocusMode ? 'Odak Modunu Kapat' : 'Odak Modunu Aç'}
              variant="secondary"
              className="flex h-8 w-8 items-center justify-center rounded-full border-transparent bg-[#1A3C34]/5 p-0 text-[#1A3C34] hover:bg-[#1A3C34]/15"
              onClick={() => setIsFocusMode((prev) => !prev)}
            >
              {isFocusMode ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        {!isOnline ? (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
            <AlertCircle className="h-3.5 w-3.5" />
            Offline — {queueCount} işlem kuyruğa alındı.
          </div>
        ) : null}
        {isOnline && showSyncSuccessBanner && recentSyncedCount ? (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {recentSyncedCount} işlem başarıyla senkronize edildi.
          </div>
        ) : null}
      </header>

      {/* ── Tabs Navigation ── */}
      <div className="w-full overflow-x-auto border-b border-[#163D34]/10 bg-white px-4 md:px-6">
        <nav className="mx-auto flex w-full max-w-[1440px] gap-6" aria-label="Tabs">
          {[
            { id: 'home', label: 'Satış Ekranı' },
            { id: 'categories', label: 'Kategoriler' },
            { id: 'customers', label: 'Müşteriler' },
            { id: 'finance', label: 'Finans' },
            { id: 'orders', label: 'Siparişler' },
            { id: 'settings', label: 'Ayarlar' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${activeTab === tab.id
                ? 'border-[#1A3C34] text-[#1A3C34]'
                : 'border-transparent text-[#5C6F68] hover:border-[#1A3C34]/30 hover:text-[#1A3C34]'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Main POS Body ── */}
      <div className={`mx-auto w-full max-w-[1440px] px-3 py-4 md:px-6 md:py-6 ${activeTab === 'home' ? 'block' : 'hidden'}`}>
        <div className="space-y-4">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="surface-panel-muted p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5C6F68]">Baglanti</p>
              <p className="mt-2 text-2xl font-semibold text-[#123228]">{isOnline ? 'Online' : 'Offline'}</p>
              <p className="mt-1 text-xs text-[#5C6F68]">Terminal ag durumu</p>
            </article>
            <article className="surface-panel-muted p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5C6F68]">Kuyruk</p>
              <p className="mt-2 text-2xl font-semibold text-[#123228]">{queueCount}</p>
              <p className="mt-1 text-xs text-[#5C6F68]">Bekleyen satis</p>
            </article>
            <article className="surface-panel-muted p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5C6F68]">Vardiya</p>
              <p className="mt-2 text-2xl font-semibold text-[#123228]">
                {activeShift ? 'Acik' : 'Kapali'}
              </p>
              <p className="mt-1 text-xs text-[#5C6F68]">
                {activeShift ? activeShift.registerCode : 'Kasa secimi bekleniyor'}
              </p>
            </article>
            <article className="surface-panel-muted p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5C6F68]">Toplam</p>
              <p className="mt-2 text-2xl font-semibold text-[#123228]">{formatMoney(estimatedPayableCents)}</p>
              <p className="mt-1 text-xs text-[#5C6F68]">Anlik tahsilat tutari</p>
            </article>
          </section>

          {isFocusMode ? (
            <p className="text-xs text-[#1A3C34]/60">
              Focus mode aktif: ikincil operasyon panelleri gizlendi.
            </p>
          ) : null}

          {isAuthed ? (
            !activeShift ? (
              <div className="surface-panel px-4 py-5 md:px-5 md:py-6">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                  Vardiya Baslat
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[#1A3C34]">Session Gate</h2>
                <p className="mt-2 text-sm text-[#5C5C5C]">
                  Kasa kodu ve acilis kasa sayimi olmadan satis ekrani acilmaz.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                    Kasa Kodu
                    <input
                      value={registerCode}
                      onChange={(e) => setRegisterCode(e.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-[#D9D9D3] bg-white px-3 text-sm text-[#1A3C34]"
                      placeholder="MAIN"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                    Acilis Nakit (kurus)
                    <input
                      value={openingCashCents}
                      onChange={(e) => setOpeningCashCents(e.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-[#D9D9D3] bg-white px-3 text-sm text-[#1A3C34]"
                      placeholder="0"
                      inputMode="numeric"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                    Acilis Notu
                    <input
                      value={shiftNote}
                      onChange={(e) => setShiftNote(e.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-[#D9D9D3] bg-white px-3 text-sm text-[#1A3C34]"
                      placeholder="Opsiyonel"
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => void openShift()} disabled={isShiftBusy}>
                    {isShiftBusy ? 'Islem...' : 'Vardiyayi Baslat'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => void ensureShiftSession()}
                    disabled={isShiftBusy}
                  >
                    Yenile
                  </Button>
                </div>
              </div>
            ) : (
              <div className={`surface-panel px-4 py-4 md:px-5 md:py-5 ${isFocusMode ? 'ring-2 ring-[#1A3C34]/15' : ''}`}>
                <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
                  <div className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                      Kasiyer Hizli Satis
                    </p>

                    <div className="grid gap-3 md:grid-cols-12">
                      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#1A3C34]/70 md:col-span-9">
                        Barkod / SKU
                        <div className="flex gap-2">
                          <input
                            value={barcodeInput}
                            onChange={(e) => setBarcodeInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void lookupBarcode(barcodeInput);
                              }
                            }}
                            className="h-11 flex-1 rounded-xl border border-[#D9D9D3] bg-[#FCFDFC] px-3 text-sm normal-case tracking-normal text-[#1A3C34]"
                            placeholder="Barkod okutun veya kod yazip Enter'a basin"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-11 px-4 text-xs"
                            onClick={() => setIsProductSearchModalOpen(true)}
                          >
                            Ara
                          </Button>
                        </div>
                        <span className="text-[11px] normal-case tracking-normal text-[#5C5C5C]">
                          Okutulan urun otomatik olarak sepete eklenir.
                        </span>
                      </label>
                      <div className="md:col-span-3 flex items-end">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-11 w-full px-3 text-xs"
                          onClick={() => setCartItems([])}
                          disabled={cartItems.length === 0}
                        >
                          Sepeti Temizle
                        </Button>
                      </div>

                      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#1A3C34]/70 md:col-span-6">
                        Kalem Iskonto (kurus)
                        <input
                          value={itemDiscountCents}
                          onChange={(e) => setItemDiscountCents(e.target.value)}
                          className="h-10 rounded-lg border border-[#D9D9D3] bg-[#FCFDFC] px-3 text-sm normal-case tracking-normal text-[#1A3C34]"
                          placeholder="0"
                          inputMode="numeric"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#1A3C34]/70 md:col-span-6">
                        Sepet Iskonto (kurus)
                        <input
                          value={cartDiscountCents}
                          onChange={(e) => setCartDiscountCents(e.target.value)}
                          className="h-10 rounded-lg border border-[#D9D9D3] bg-[#FCFDFC] px-3 text-sm normal-case tracking-normal text-[#1A3C34]"
                          placeholder="0"
                          inputMode="numeric"
                        />
                      </label>
                    </div>

                    <div className="rounded-xl border border-[#E5E5E0] bg-[#F9FBF8] px-3 py-2 text-sm text-[#1A3C34]">
                      <p>
                        <span className="font-semibold">Secili urun:</span>{' '}
                        {resolvedProductName || '-'} {variantId ? `(Varyant #${variantId})` : ''}
                      </p>
                      <p className="mt-1">
                        <span className="font-semibold">Secili musteri:</span>{' '}
                        {customerMode === 'CUSTOMER'
                          ? selectedCustomer
                            ? `#${selectedCustomer.id} ${selectedCustomer.name} • Bakiye: ${formatMoney(selectedCustomer.balance)}`
                            : 'Secilmedi'
                          : 'Misafir'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 px-3 text-xs"
                        onClick={() => setIsProductSearchModalOpen(true)}
                      >
                        Urun Ara
                      </Button>
                    </div>

                    <div className="rounded-xl border border-[#DCE5DC] bg-white px-3 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1A3C34]/70">
                          Sepet
                        </p>
                        <p className="text-xs text-[#1A3C34]/70">{cartItems.length} kalem</p>
                      </div>
                      {cartItems.length === 0 ? (
                        <p className="mt-2 text-sm text-[#5C5C5C]">
                          Sepet bos. Tek kalem satmak icin urun bilgisiyle direkt satis da yapabilirsiniz.
                        </p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {cartItems.map((row) => (
                            <div
                              key={row.key}
                              className="rounded-lg border border-[#E5E5E0] bg-[#FAFAF8] px-3 py-2 text-sm text-[#1A3C34]"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-semibold">
                                  {row.name} {row.variantId ? `(Varyant #${row.variantId})` : ''}
                                </p>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="h-7 px-2 text-[11px]"
                                  onClick={() => removeCartItem(row.key)}
                                >
                                  Kaldir
                                </Button>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="h-7 px-2 text-[11px]"
                                  onClick={() => updateCartItemQuantity(row.key, row.quantity - 1)}
                                >
                                  -1
                                </Button>
                                <input
                                  value={String(row.quantity)}
                                  onChange={(e) =>
                                    updateCartItemQuantity(row.key, Number(e.target.value))
                                  }
                                  className="h-7 w-16 rounded-md border border-[#D9D9D3] px-2 text-center text-xs text-[#1A3C34]"
                                  inputMode="numeric"
                                />
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="h-7 px-2 text-[11px]"
                                  onClick={() => updateCartItemQuantity(row.key, row.quantity + 1)}
                                >
                                  +1
                                </Button>
                                <span className="ml-auto">
                                  {typeof row.expectedUnitPriceCents === 'number'
                                    ? `${formatMoney(row.expectedUnitPriceCents)} x ${row.quantity}`
                                    : 'Fiyat snapshot yok'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#C8D9C8] bg-[#F8FBF8] px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                      Kasa Ozeti
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-[#1A3C34]">
                      {formatMoney(estimatedPayableCents)}
                    </p>
                    <div className="mt-3 space-y-1.5 text-sm text-[#1A3C34]">
                      <p className="flex items-center justify-between">
                        <span>Sepet kalemi</span>
                        <span className="font-semibold">
                          {cartItems.length > 0 ? cartItems.length : 1}
                        </span>
                      </p>
                      <p className="flex items-center justify-between">
                        <span>Ara toplam</span>
                        <span className="font-semibold">{formatMoney(estimatedSubtotalCents)}</span>
                      </p>
                      <p className="flex items-center justify-between">
                        <span>Iskonto</span>
                        <span className="font-semibold">{formatMoney(estimatedDiscountCents)}</span>
                      </p>
                      <p className="flex items-center justify-between">
                        <span>Split odeme</span>
                        <span className="font-semibold">{formatMoney(splitTotalCents)}</span>
                      </p>
                      <p className="flex items-center justify-between border-t border-[#DBE4DC] pt-2">
                        <span>Kalan</span>
                        <span className="font-semibold">{formatMoney(estimatedRemainingCents)}</span>
                      </p>
                    </div>

                    <div className="mt-4 grid gap-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1A3C34]/70">
                        Musteri
                        <select
                          value={customerMode}
                          onChange={(e) => {
                            const nextMode = e.target.value as PosCustomerMode;
                            setCustomerMode(nextMode);
                            if (nextMode === 'GUEST') {
                              setSelectedCustomer(null);
                              setCustomerId('');
                            }
                          }}
                          className="mt-1 h-10 w-full rounded-lg border border-[#D9D9D3] bg-white px-2 text-sm normal-case tracking-normal text-[#1A3C34]"
                        >
                          <option value="GUEST">Misafir</option>
                          <option value="CUSTOMER">Musteri sec</option>
                        </select>
                      </label>
                      {customerMode === 'CUSTOMER' ? (
                        <div className="rounded-lg border border-[#D9D9D3] bg-white px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-9 px-3 text-xs"
                              onClick={() => setIsCustomerSearchModalOpen(true)}
                            >
                              Musteri Ara
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-9 px-3 text-xs"
                              onClick={() => setIsCustomerCreateModalOpen(true)}
                            >
                              Musteri Ekle
                            </Button>
                            {selectedCustomer ? (
                              <Button
                                type="button"
                                variant="secondary"
                                className="h-9 px-3 text-xs"
                                onClick={() => {
                                  setSelectedCustomer(null);
                                  setCustomerId('');
                                }}
                              >
                                Kaldir
                              </Button>
                            ) : null}
                          </div>
                          <p className="mt-2 text-xs text-[#1A3C34]">
                            {selectedCustomer
                              ? `Secili: #${selectedCustomer.id} ${selectedCustomer.name} • ${selectedCustomer.phone}`
                              : 'Henuz musteri secilmedi.'}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-[#1A3C34]/75">
                          Misafir satis modu aktif.
                        </p>
                      )}
                      <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1A3C34]/70">
                        Tahsilat
                        <select
                          value={quickPaymentMethod}
                          onChange={(e) =>
                            setQuickPaymentMethod(e.target.value as PosQuickPaymentMethod)
                          }
                          className="mt-1 h-10 w-full rounded-lg border border-[#D9D9D3] bg-white px-2 text-sm normal-case tracking-normal text-[#1A3C34]"
                        >
                          <option value="NONE">Odeme secilmedi</option>
                          <option value="CASH">Nakit</option>
                          <option value="CARD">Kart</option>
                          <option value="CREDIT">Veresiye</option>
                        </select>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-[#1A3C34]">
                        <input
                          type="checkbox"
                          checked={autoPrintReceipt}
                          onChange={(e) => setAutoPrintReceipt(e.target.checked)}
                          className="h-4 w-4 rounded border-[#C8D2C8]"
                        />
                        Fisi satis tamamlaninca otomatik yazdir
                      </label>
                    </div>

                    <div className="mt-4 space-y-2">
                      <Button className="h-12 w-full text-base" onClick={() => void handleCreateSale()} disabled={isSubmitting}>
                        {isSubmitting ? 'Gonderiliyor...' : 'Satisi Tamamla'}
                      </Button>
                      <Button variant="secondary" className="h-10 w-full" onClick={() => void printReceipt()} disabled={!lastReceipt}>
                        Fis Yazdir
                      </Button>
                    </div>

                    <div className="mt-4 rounded-xl border border-[#E0E6E0] bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1A3C34]/70">
                        Bakiyeden Odeme
                      </p>
                      <div className="mt-2 flex gap-2">
                        <input
                          value={balanceApplyAmount}
                          onChange={(e) => setBalanceApplyAmount(e.target.value)}
                          className="h-10 flex-1 rounded-lg border border-[#D9D9D3] px-3 text-sm text-[#1A3C34]"
                          placeholder="Bakiye (kurus)"
                          inputMode="numeric"
                        />
                        <Button
                          variant="secondary"
                          className="h-10 px-3 text-xs"
                          onClick={() => void applyCustomerBalance()}
                          disabled={!selectedCustomer || !lastOnlineOrderId || isApplyingBalance}
                        >
                          {isApplyingBalance ? 'Uygulaniyor...' : 'Uygula'}
                        </Button>
                      </div>
                      <p className="mt-2 text-xs text-[#5C5C5C]">
                        Son online siparis: {lastOnlineOrderId ? `#${lastOnlineOrderId}` : 'Yok'}
                      </p>
                    </div>
                    <p className="mt-3 text-xs text-[#5C5C5C]">
                      Split odeme ve operasyonel raporlar asagidaki detayli panelde.
                    </p>
                  </div>
                </div>
              </div>
            )
          ) : null}

          {isAuthed && isProductSearchModalOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
              <div className="w-full max-w-3xl rounded-2xl border border-[#D8DED8] bg-white p-4 shadow-2xl">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#1A3C34]">Urun Ara ve Sec</p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 px-3 text-xs"
                    onClick={() => setIsProductSearchModalOpen(false)}
                  >
                    Bitti / Kapat
                  </Button>
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void searchProducts();
                      }
                    }}
                    className="h-11 flex-1 rounded-xl border border-[#D9D9D3] bg-[#FCFDFC] px-3 text-sm text-[#1A3C34]"
                    placeholder="Urun adi / SKU / urun id"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 px-4 text-xs"
                    onClick={() => void searchProducts()}
                    disabled={isSearchingProduct}
                  >
                    {isSearchingProduct ? 'Araniyor...' : 'Ara'}
                  </Button>
                </div>
                <div className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto rounded-xl border border-[#E5E5E0] bg-[#FAFBF8] p-3">
                  {productResults.length === 0 ? (
                    <p className="text-sm text-[#5C5C5C]">Urun bulunamadi.</p>
                  ) : (
                    productResults.map((product) => (
                      <button
                        key={`picker-${product.type}-${product.variantId ?? product.productId}`}
                        type="button"
                        onClick={() => selectProduct(product)}
                        className="w-full rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-left text-sm text-[#1A3C34] hover:border-[#1A3C34]"
                      >
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-xs">
                          {product.sku ? `${product.sku} • ` : ''}
                          {formatMoney(product.priceCents)}
                          {typeof product.stock === 'number' ? ` • Stok: ${product.stock}` : ''}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {isAuthed && isCustomerSearchModalOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
              <div className="w-full max-w-2xl rounded-2xl border border-[#D8DED8] bg-white p-4 shadow-2xl">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#1A3C34]">Musteri Ara</p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 px-3 text-xs"
                    onClick={() => setIsCustomerSearchModalOpen(false)}
                  >
                    Kapat
                  </Button>
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void searchCustomers();
                      }
                    }}
                    className="h-11 flex-1 rounded-xl border border-[#D9D9D3] bg-[#FCFDFC] px-3 text-sm text-[#1A3C34]"
                    placeholder="Ad / telefon / musteri id"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 px-4 text-xs"
                    onClick={() => void searchCustomers()}
                    disabled={isSearchingCustomer}
                  >
                    {isSearchingCustomer ? 'Araniyor...' : 'Ara'}
                  </Button>
                </div>
                <div className="mt-3 max-h-[55vh] space-y-2 overflow-y-auto rounded-xl border border-[#E5E5E0] bg-[#FAFBF8] p-3">
                  {customerResults.length === 0 ? (
                    <p className="text-sm text-[#5C5C5C]">Musteri bulunamadi.</p>
                  ) : (
                    customerResults.map((customer) => (
                      <button
                        key={`customer-modal-${customer.id}`}
                        type="button"
                        onClick={() => {
                          selectCustomer(customer);
                          setCustomerMode('CUSTOMER');
                          setIsCustomerSearchModalOpen(false);
                        }}
                        className="w-full rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-left text-sm text-[#1A3C34] hover:border-[#1A3C34]"
                      >
                        <p className="font-semibold">
                          #{customer.id} {customer.name}
                        </p>
                        <p className="text-xs">
                          {customer.phone} • Bakiye: {formatMoney(customer.balance)}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {isAuthed && isCustomerCreateModalOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
              <div className="w-full max-w-lg rounded-2xl border border-[#D8DED8] bg-white p-4 shadow-2xl">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#1A3C34]">Yeni Musteri Ekle</p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 px-3 text-xs"
                    onClick={() => setIsCustomerCreateModalOpen(false)}
                  >
                    Kapat
                  </Button>
                </div>
                <div className="mt-3 grid gap-3">
                  <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1A3C34]/70">
                    Ad Soyad
                    <input
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-[#D9D9D3] px-3 text-sm normal-case tracking-normal text-[#1A3C34]"
                      placeholder="Musteri adi"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1A3C34]/70">
                    Telefon
                    <input
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-[#D9D9D3] px-3 text-sm normal-case tracking-normal text-[#1A3C34]"
                      placeholder="05xxxxxxxxx"
                    />
                  </label>
                  <Button
                    type="button"
                    className="h-10 w-full text-sm"
                    onClick={() => void createPosCustomer()}
                    disabled={isCreatingCustomer}
                  >
                    {isCreatingCustomer ? 'Kaydediliyor...' : 'Kaydet ve Musteriyi Sec'}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {isAuthed && user?.role !== 'USER' && !isFocusMode ? (
            <details className="rounded-2xl border border-[#D8DED8] bg-white px-4 py-4" open={false}>
              <summary className="cursor-pointer list-none text-sm font-semibold text-[#1A3C34]">
                Detayli POS operasyon paneli (vardiya, split, analitik, fatura)
              </summary>
              <div className="mt-4 grid gap-4">
                <div className="rounded-xl border border-[#E5E5E0] bg-[#F7FAFD] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                    Vardiya Yonetimi (POS-10)
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-5">
                    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                      Kasa Kodu
                      <input
                        value={registerCode}
                        onChange={(e) => setRegisterCode(e.target.value)}
                        className="h-10 rounded-lg border border-[#D9D9D3] bg-white px-3 text-sm normal-case tracking-normal text-[#1A3C34]"
                        placeholder="MAIN"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                      Acilis Nakit (kurus)
                      <input
                        value={openingCashCents}
                        onChange={(e) => setOpeningCashCents(e.target.value)}
                        className="h-10 rounded-lg border border-[#D9D9D3] bg-white px-3 text-sm normal-case tracking-normal text-[#1A3C34]"
                        placeholder="0"
                        inputMode="numeric"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                      Kapanis Nakit (kurus)
                      <input
                        value={closingCashCents}
                        onChange={(e) => setClosingCashCents(e.target.value)}
                        className="h-10 rounded-lg border border-[#D9D9D3] bg-white px-3 text-sm normal-case tracking-normal text-[#1A3C34]"
                        placeholder="0"
                        inputMode="numeric"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70 md:col-span-2">
                      Vardiya Notu
                      <input
                        value={shiftNote}
                        onChange={(e) => setShiftNote(e.target.value)}
                        className="h-10 rounded-lg border border-[#D9D9D3] bg-white px-3 text-sm normal-case tracking-normal text-[#1A3C34]"
                        placeholder="Opsiyonel"
                      />
                    </label>
                    <div className="md:col-span-5 flex flex-wrap gap-2">
                      <Button onClick={() => void openShift()} disabled={isShiftBusy}>
                        {isShiftBusy ? 'Islem...' : 'Vardiya Ac'}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => void closeShift()}
                        disabled={isShiftBusy || !activeShift}
                      >
                        {isShiftBusy ? 'Islem...' : 'Vardiya Kapat'}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => void loadShiftRows()}
                        disabled={isShiftBusy}
                      >
                        Yenile
                      </Button>
                    </div>
                    <div className="md:col-span-5 rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-sm text-[#1A3C34]">
                      <span className="font-semibold">Aktif Vardiya:</span>{' '}
                      {activeShift
                        ? `${activeShift.registerCode} • Acan #${activeShift.openedByUserId} • Acilis ${formatMoney(activeShift.openingCashCents)}`
                        : 'Secili kasada aktif vardiya yok'}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border border-[#E5E5E0] bg-white px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                        Kasa Vardiya Gecmisi
                      </p>
                      {shiftRows.length === 0 ? (
                        <p className="mt-2 text-sm text-[#5C5C5C]">Vardiya kaydi yok.</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {shiftRows.map((row) => (
                            <div
                              key={row.id}
                              className="rounded-lg border border-[#E5E5E0] bg-[#FAFAF8] px-3 py-2 text-sm text-[#1A3C34]"
                            >
                              <p className="font-semibold">
                                {row.registerCode} • #{row.id}
                              </p>
                              <p>
                                Personel: {row.openedBy?.name ?? `#${row.openedByUserId}`} •
                                Acilis: {formatMoney(row.openingCashCents)}
                              </p>
                              <p>
                                Kapanis: {formatMoney(row.closingCashCents ?? undefined)} •
                                Fark: {formatMoney(row.varianceCents ?? undefined)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-[#E5E5E0] bg-white px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                        Personel Satis Raporu
                      </p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1A3C34]/70">
                          Baslangic
                          <input
                            type="date"
                            value={reportDateFrom}
                            onChange={(e) => setReportDateFrom(e.target.value)}
                            className="mt-1 h-9 w-full rounded-lg border border-[#D9D9D3] px-2 text-sm text-[#1A3C34]"
                          />
                        </label>
                        <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1A3C34]/70">
                          Bitis
                          <input
                            type="date"
                            value={reportDateTo}
                            onChange={(e) => setReportDateTo(e.target.value)}
                            className="mt-1 h-9 w-full rounded-lg border border-[#D9D9D3] px-2 text-sm text-[#1A3C34]"
                          />
                        </label>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button
                          variant="secondary"
                          className="h-8 px-3 text-xs"
                          onClick={() => void loadStaffSalesReport()}
                          disabled={isSalesReportBusy}
                        >
                          {isSalesReportBusy ? 'Yukleniyor...' : 'Raporu yenile'}
                        </Button>
                      </div>
                      {staffSalesReport?.rows?.length ? (
                        <div className="mt-2 space-y-2">
                          {staffSalesReport.rows.map((row) => (
                            <div
                              key={row.userId}
                              className="rounded-lg border border-[#E5E5E0] bg-[#FAFAF8] px-3 py-2 text-sm text-[#1A3C34]"
                            >
                              <p className="font-semibold">
                                {row.userName} ({row.role ?? '-'})
                              </p>
                              <p>
                                Siparis: {row.orderCount} • Ciro: {formatMoney(row.salesTotalCents)}
                              </p>
                              <p>
                                Tahsilat: {formatMoney(row.paymentsTotalCents)} • Vardiya:{' '}
                                {row.shiftCount}
                              </p>
                            </div>
                          ))}
                          <div className="rounded-lg border border-[#D9D9D3] bg-white px-3 py-2 text-sm text-[#1A3C34]">
                            <p className="font-semibold">Toplam</p>
                            <p>
                              Siparis: {staffSalesReport.totals.orderCount} • Ciro:{' '}
                              {formatMoney(staffSalesReport.totals.salesTotalCents)}
                            </p>
                            <p>
                              Tahsilat: {formatMoney(staffSalesReport.totals.paymentsTotalCents)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-[#5C5C5C]">Rapor verisi yok.</p>
                      )}

                      <div className="mt-4 rounded-lg border border-[#E5E5E0] bg-[#FAFCFF] px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                          POS-11 Satis Analitigi
                        </p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                          <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1A3C34]/70">
                            Periyot
                            <select
                              value={salesPeriod}
                              onChange={(e) =>
                                setSalesPeriod(e.target.value as 'day' | 'week' | 'month')
                              }
                              className="mt-1 h-9 w-full rounded-lg border border-[#D9D9D3] bg-white px-2 text-sm text-[#1A3C34]"
                            >
                              <option value="day">Gunluk</option>
                              <option value="week">Haftalik</option>
                              <option value="month">Aylik</option>
                            </select>
                          </label>
                          <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1A3C34]/70">
                            Top Urun Limiti
                            <input
                              value={salesTopLimit}
                              onChange={(e) => setSalesTopLimit(e.target.value)}
                              className="mt-1 h-9 w-full rounded-lg border border-[#D9D9D3] bg-white px-2 text-sm text-[#1A3C34]"
                              inputMode="numeric"
                              placeholder="10"
                            />
                          </label>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            className="h-8 px-3 text-xs"
                            onClick={() => void loadSalesReport()}
                            disabled={isSalesAnalyticsBusy}
                          >
                            {isSalesAnalyticsBusy ? 'Yukleniyor...' : 'Analitik yenile'}
                          </Button>
                          <Button
                            variant="secondary"
                            className="h-8 px-3 text-xs"
                            onClick={() => void downloadSalesCsv()}
                            disabled={isSalesAnalyticsBusy}
                          >
                            Excel (CSV)
                          </Button>
                          <Button
                            variant="secondary"
                            className="h-8 px-3 text-xs"
                            onClick={printSalesReportPdf}
                            disabled={!salesReport}
                          >
                            PDF Yazdir
                          </Button>
                        </div>

                        {salesReport ? (
                          <div className="mt-3 space-y-3 text-sm text-[#1A3C34]">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <p className="rounded-lg border border-[#E5E5E0] bg-white px-3 py-2">
                                Siparis: <span className="font-semibold">{salesReport.summary.orderCount}</span>
                              </p>
                              <p className="rounded-lg border border-[#E5E5E0] bg-white px-3 py-2">
                                Ciro: <span className="font-semibold">{formatMoney(salesReport.summary.salesTotalCents)}</span>
                              </p>
                              <p className="rounded-lg border border-[#E5E5E0] bg-white px-3 py-2">
                                Tahsilat: <span className="font-semibold">{formatMoney(salesReport.summary.paymentsTotalCents)}</span>
                              </p>
                              <p className="rounded-lg border border-[#E5E5E0] bg-white px-3 py-2">
                                Ortalama Fis: <span className="font-semibold">{formatMoney(salesReport.summary.avgTicketCents)}</span>
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1A3C34]/70">
                                Trend Grafik
                              </p>
                              {salesReport.trend.length === 0 ? (
                                <p className="mt-1 text-sm text-[#5C5C5C]">Trend verisi yok.</p>
                              ) : (
                                <div className="mt-2 space-y-2">
                                  {salesReport.trend.map((row) => {
                                    const widthPct =
                                      maxTrendSales > 0
                                        ? Math.max(
                                          Math.round(
                                            (row.salesTotalCents / maxTrendSales) * 100,
                                          ),
                                          2,
                                        )
                                        : 0;
                                    return (
                                      <div key={row.bucketStart} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs text-[#1A3C34]">
                                          <span>{new Date(row.bucketStart).toLocaleDateString('tr-TR')}</span>
                                          <span>
                                            {formatMoney(row.salesTotalCents)} • {row.orderCount} siparis
                                          </span>
                                        </div>
                                        <div className="h-2 rounded-full bg-[#E8EDF2]">
                                          <div
                                            className="h-2 rounded-full bg-[#1A6B5C]"
                                            style={{ width: `${widthPct}%` }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1A3C34]/70">
                                Top Urunler
                              </p>
                              {salesReport.topProducts.length === 0 ? (
                                <p className="mt-1 text-sm text-[#5C5C5C]">Urun satis verisi yok.</p>
                              ) : (
                                <div className="mt-2 space-y-2">
                                  {salesReport.topProducts.map((row) => (
                                    <div
                                      key={row.productId}
                                      className="rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-sm text-[#1A3C34]"
                                    >
                                      <p className="font-semibold">
                                        #{row.productId} {row.productName}
                                      </p>
                                      <p>
                                        Adet: {row.quantity} • Siparis: {row.orderCount} • Ciro:{' '}
                                        {formatMoney(row.salesTotalCents)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-[#5C5C5C]">Analitik rapor yuklenmedi.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 rounded-xl border border-[#E5E5E0] bg-[#F9FAF7] px-4 py-4 md:grid-cols-5">
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70 md:col-span-3">
                    Musteri Ara
                    <div className="flex gap-2">
                      <input
                        value={customerQuery}
                        onChange={(e) => setCustomerQuery(e.target.value)}
                        className="h-10 flex-1 rounded-lg border border-[#D9D9D3] px-3 text-sm normal-case tracking-normal text-[#1A3C34]"
                        placeholder="Ad / telefon / musteri id"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-10 px-3"
                        onClick={() => void searchCustomers()}
                        disabled={isSearchingCustomer}
                      >
                        {isSearchingCustomer ? 'Araniyor...' : 'Ara'}
                      </Button>
                    </div>
                    {customerResults.length > 0 ? (
                      <div className="mt-2 grid gap-1">
                        {customerResults.slice(0, 4).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => selectCustomer(c)}
                            className={`rounded-lg border px-3 py-2 text-left text-xs normal-case tracking-normal ${selectedCustomer?.id === c.id
                              ? 'border-[#1A3C34] bg-[#EAF3F0] text-[#1A3C34]'
                              : 'border-[#E5E5E0] bg-white text-[#1A3C34]'
                              }`}
                          >
                            #{c.id} {c.name} • {c.phone} • Bakiye: {formatMoney(c.balance)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70 md:col-span-2">
                    Barkod
                    <div className="flex gap-2">
                      <input
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        className="h-10 flex-1 rounded-lg border border-[#D9D9D3] px-3 text-sm normal-case tracking-normal text-[#1A3C34]"
                        placeholder="SKU / barkod okutun"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-10 px-3"
                        onClick={() => setIsProductSearchModalOpen(true)}
                      >
                        Ara
                      </Button>
                    </div>
                    <span className="text-[11px] normal-case tracking-normal text-[#5C5C5C]">
                      Scanner klavye modu desteklenir: odak inputta degilken barkod + Enter.
                    </span>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                    Customer ID (opsiyonel)
                    <input
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="h-10 rounded-lg border border-[#D9D9D3] px-3 text-sm normal-case tracking-normal text-[#1A3C34]"
                      placeholder="Bos birak = misafir"
                      inputMode="numeric"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                    Product ID
                    <input
                      value={productId}
                      onChange={(e) => setProductId(e.target.value)}
                      className="h-10 rounded-lg border border-[#D9D9D3] px-3 text-sm normal-case tracking-normal text-[#1A3C34]"
                      placeholder="10"
                      inputMode="numeric"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                    Quantity
                    <input
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="h-10 rounded-lg border border-[#D9D9D3] px-3 text-sm normal-case tracking-normal text-[#1A3C34]"
                      placeholder="1"
                      inputMode="numeric"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                    Unit Price (kurus)
                    <input
                      value={unitPriceCents}
                      onChange={(e) => setUnitPriceCents(e.target.value)}
                      className="h-10 rounded-lg border border-[#D9D9D3] px-3 text-sm normal-case tracking-normal text-[#1A3C34]"
                      placeholder="15000"
                      inputMode="numeric"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                    Kalem Iskonto (kurus)
                    <input
                      value={itemDiscountCents}
                      onChange={(e) => setItemDiscountCents(e.target.value)}
                      className="h-10 rounded-lg border border-[#D9D9D3] px-3 text-sm normal-case tracking-normal text-[#1A3C34]"
                      placeholder="0"
                      inputMode="numeric"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                    Sepet Iskonto (kurus)
                    <input
                      value={cartDiscountCents}
                      onChange={(e) => setCartDiscountCents(e.target.value)}
                      className="h-10 rounded-lg border border-[#D9D9D3] px-3 text-sm normal-case tracking-normal text-[#1A3C34]"
                      placeholder="0"
                      inputMode="numeric"
                    />
                  </label>
                  <div className="md:col-span-5 rounded-lg border border-[#D9D9D3] bg-white px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                        POS-03 Split Odeme
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 px-3 text-xs"
                        onClick={addSplitPaymentLine}
                      >
                        Satir Ekle
                      </Button>
                    </div>
                    <div className="mt-2 grid gap-2">
                      {splitPayments.map((line, index) => (
                        <div
                          key={`split-${index}`}
                          className="grid gap-2 rounded-lg border border-[#E5E5E0] bg-[#FAFAF8] p-2 md:grid-cols-12"
                        >
                          <label className="md:col-span-3">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1A3C34]/70">
                              Yontem
                            </span>
                            <select
                              value={line.method}
                              onChange={(e) =>
                                updateSplitPaymentLine(
                                  index,
                                  'method',
                                  e.target.value as PosPaymentMethod,
                                )
                              }
                              className="mt-1 h-9 w-full rounded-lg border border-[#D9D9D3] bg-white px-2 text-sm text-[#1A3C34]"
                            >
                              <option value="CASH">Nakit</option>
                              <option value="CARD">Kart</option>
                              <option value="TRANSFER">Havale</option>
                              <option value="OTHER">Diger</option>
                            </select>
                          </label>
                          <label className="md:col-span-4">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1A3C34]/70">
                              Tutar (kurus)
                            </span>
                            <input
                              value={line.amountCents}
                              onChange={(e) =>
                                updateSplitPaymentLine(index, 'amountCents', e.target.value)
                              }
                              className="mt-1 h-9 w-full rounded-lg border border-[#D9D9D3] bg-white px-2 text-sm text-[#1A3C34]"
                              placeholder="0"
                              inputMode="numeric"
                            />
                          </label>
                          <label className="md:col-span-4">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1A3C34]/70">
                              Referans
                            </span>
                            <input
                              value={line.reference}
                              onChange={(e) =>
                                updateSplitPaymentLine(index, 'reference', e.target.value)
                              }
                              className="mt-1 h-9 w-full rounded-lg border border-[#D9D9D3] bg-white px-2 text-sm text-[#1A3C34]"
                              placeholder="Opsiyonel"
                            />
                          </label>
                          <div className="md:col-span-1 flex items-end">
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-9 w-full px-2 text-xs"
                              onClick={() => removeSplitPaymentLine(index)}
                              disabled={splitPayments.length <= 1}
                            >
                              Sil
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-[#1A3C34]">
                      Split toplam: <span className="font-semibold">{formatMoney(splitTotalCents)}</span>
                    </p>
                  </div>
                  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                    Not
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="h-10 rounded-lg border border-[#D9D9D3] px-3 text-sm normal-case tracking-normal text-[#1A3C34]"
                      placeholder="Opsiyonel"
                    />
                  </label>
                  <div className="md:col-span-5 rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-sm text-[#1A3C34]">
                    <span className="font-semibold">Secili urun:</span>{' '}
                    {resolvedProductName || '-'}{' '}
                    {variantId ? `(Varyant #${variantId})` : ''}
                  </div>
                  <div className="md:col-span-5 rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-sm text-[#1A3C34]">
                    <span className="font-semibold">Secili musteri:</span>{' '}
                    {customerMode === 'CUSTOMER'
                      ? selectedCustomer
                        ? `#${selectedCustomer.id} ${selectedCustomer.name} • Bakiye: ${formatMoney(selectedCustomer.balance)}`
                        : 'Secilmedi'
                      : 'Misafir'}
                  </div>
                  <div className="md:col-span-5 flex flex-wrap gap-2">
                    <Button onClick={() => void handleCreateSale()} disabled={isSubmitting}>
                      {isSubmitting ? 'Gonderiliyor...' : 'Satis Olustur'}
                    </Button>
                    <Button variant="secondary" onClick={() => void printReceipt()} disabled={!lastReceipt}>
                      Fis Yazdir
                    </Button>
                    <input
                      value={balanceApplyAmount}
                      onChange={(e) => setBalanceApplyAmount(e.target.value)}
                      className="h-10 w-44 rounded-full border border-[#D9D9D3] px-3 text-sm text-[#1A3C34]"
                      placeholder="Bakiye (kurus)"
                      inputMode="numeric"
                    />
                    <Button
                      variant="secondary"
                      onClick={() => void applyCustomerBalance()}
                      disabled={!selectedCustomer || !lastOnlineOrderId || isApplyingBalance}
                    >
                      {isApplyingBalance ? 'Uygulaniyor...' : 'Bakiyeden Ode'}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-[#E5E5E0] bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                      Fis Ayarlari
                    </p>
                    <div className="mt-3 grid gap-3">
                      <label className="text-sm text-[#1A3C34]">
                        Isletme adi
                        <input
                          value={receiptSettings.businessName}
                          onChange={(e) =>
                            setReceiptSettings((prev) => ({
                              ...prev,
                              businessName: e.target.value,
                            }))
                          }
                          className="mt-1 h-10 w-full rounded-lg border border-[#D9D9D3] px-3 text-sm text-[#1A3C34]"
                        />
                      </label>
                      <label className="text-sm text-[#1A3C34]">
                        Alt not
                        <input
                          value={receiptSettings.footerNote}
                          onChange={(e) =>
                            setReceiptSettings((prev) => ({
                              ...prev,
                              footerNote: e.target.value,
                            }))
                          }
                          className="mt-1 h-10 w-full rounded-lg border border-[#D9D9D3] px-3 text-sm text-[#1A3C34]"
                        />
                      </label>
                      <Button variant="secondary" className="w-fit" onClick={saveReceiptSettings}>
                        Ayarlari Kaydet
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#E5E5E0] bg-[#FAFAF8] px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                      Fis Onizleme
                    </p>
                    {lastReceipt ? (
                      <div className="mt-3 space-y-2 text-sm text-[#1A3C34]">
                        <p className="font-semibold">{receiptSettings.businessName}</p>
                        <p>Fis: {lastReceipt.saleId}</p>
                        <p>Tarih: {new Date(lastReceipt.createdAt).toLocaleString('tr-TR')}</p>
                        <p>
                          Musteri:{' '}
                          {typeof lastReceipt.customerId === 'number'
                            ? lastReceipt.customerId
                            : 'Misafir'}
                        </p>
                        <div className="rounded-lg border border-[#E5E5E0] bg-white px-3 py-2">
                          {lastReceipt.lines.map((line, idx) => (
                            <p key={`${line.productId}-${idx}`}>
                              Urun #{line.productId} x {line.quantity} ={' '}
                              {formatMoney(
                                typeof line.unitPriceCents === 'number'
                                  ? line.unitPriceCents * line.quantity
                                  : undefined,
                              )}
                            </p>
                          ))}
                        </div>
                        <p className="font-semibold">Toplam: {formatMoney(lastReceipt.totalAmountCents)}</p>
                        <p className="text-xs text-[#5C5C5C]">
                          {lastReceipt.isOfflineQueued
                            ? 'Offline kayit - senkron bekliyor'
                            : 'Online satis'}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-[#5C5C5C]">Henuz fis yok.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-[#E5E5E0] bg-[#FDFCF8] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                    POS-12 A4 Fatura Yazdirma
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-4">
                    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                      Siparis No
                      <input
                        value={invoiceOrderId}
                        onChange={(e) => setInvoiceOrderId(e.target.value)}
                        className="h-10 rounded-lg border border-[#D9D9D3] bg-white px-3 text-sm normal-case tracking-normal text-[#1A3C34]"
                        placeholder={lastOnlineOrderId ? String(lastOnlineOrderId) : 'Order id'}
                        inputMode="numeric"
                      />
                    </label>
                    <div className="md:col-span-3 flex flex-wrap items-end gap-2">
                      <Button
                        variant="secondary"
                        className="h-10 px-3 text-xs"
                        onClick={() => void loadInvoicePayload()}
                        disabled={isInvoiceBusy}
                      >
                        {isInvoiceBusy ? 'Yukleniyor...' : 'Faturayi Yukle'}
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-10 px-3 text-xs"
                        onClick={printA4Invoice}
                        disabled={!invoicePayload}
                      >
                        A4 Yazdir / PDF
                      </Button>
                    </div>
                  </div>

                  {invoicePayload ? (
                    <div className="mt-3 space-y-2 rounded-lg border border-[#E5E5E0] bg-white px-3 py-3 text-sm text-[#1A3C34]">
                      <p className="font-semibold">
                        {invoicePayload.business.name} - {invoicePayload.invoiceNo}
                      </p>
                      <p>
                        Siparis #{invoicePayload.order.id} • Tarih:{' '}
                        {new Date(invoicePayload.issueDate).toLocaleString('tr-TR')}
                      </p>
                      <p>
                        Musteri: #{invoicePayload.customer.id} {invoicePayload.customer.name}
                      </p>
                      <p>
                        Ara Toplam: {formatMoney(invoicePayload.totals.subtotalAmountCents)} •
                        KDV: {formatMoney(invoicePayload.totals.taxAmountCents)} •
                        Toplam: {formatMoney(invoicePayload.totals.totalAmountCents)}
                      </p>
                      <p>
                        Odenen: {formatMoney(invoicePayload.totals.paidAmountCents)} • Kalan:{' '}
                        {formatMoney(invoicePayload.totals.remainingAmountCents)}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[#5C5C5C]">
                      Fatura verisi yuklenmedi.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-[#E5E5E0] bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                    Offline Kuyruk Detayi
                  </p>
                  {queueItems.length === 0 ? (
                    <p className="mt-2 text-sm text-[#5C5C5C]">Bekleyen satis yok.</p>
                  ) : (
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-[#E5E5E0] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5C5C5C]">
                            <th className="py-2 pr-3">Order ID</th>
                            <th className="py-2 pr-3">Retry Count</th>
                            <th className="py-2 pr-3">Last Error</th>
                            <th className="py-2 pr-3">Last Attempt</th>
                            <th className="py-2 pr-3">Next Retry</th>
                            <th className="py-2 pr-3">Status</th>
                            <th className="py-2">Aksiyon</th>
                          </tr>
                        </thead>
                        <tbody>
                          {queueItems.map((item) => (
                            <tr key={item.id} className="border-b border-[#F0F0EA]">
                              <td className="py-2 pr-3 text-xs text-[#1A3C34]">
                                {item.payload.idempotencyKey ?? `Q-${item.id.slice(0, 8)}`}
                              </td>
                              <td className="py-2 pr-3 text-xs text-[#1A3C34]">{item.attempts}</td>
                              <td className="py-2 pr-3 text-xs text-[#5C5C5C]">
                                {item.lastError || '-'}
                              </td>
                              <td className="py-2 pr-3 text-xs text-[#5C5C5C]">
                                {formatQueueDate(item.lastAttemptAt)}
                              </td>
                              <td className="py-2 pr-3 text-xs text-[#5C5C5C]">
                                {formatQueueDate(item.nextRetryAt)}
                              </td>
                              <td className="py-2 pr-3 text-xs font-semibold text-[#1A3C34]">
                                {resolveQueueStatus(item)}
                              </td>
                              <td className="py-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    size="sm"
                                    className="h-7 px-2 text-[10px]"
                                    onClick={() => void retrySingleQueueItem(item)}
                                    disabled={isSyncing || queueActionItemId === item.id}
                                  >
                                    Tekrar dene
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-7 px-2 text-[10px]"
                                    onClick={() => void removeSingleQueueItem(item)}
                                    disabled={isSyncing || queueActionItemId === item.id}
                                  >
                                    Kuyruktan kaldir
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </details>
          ) : (
            <div className="rounded-xl border border-[#E5E5E0] bg-[#FFF9E6] px-4 py-4">
              <p className="text-sm text-[#1A3C34]">
                POS ekranlari yalnizca yonetim hesabiyla erisilebilir. Devam etmek
                icin giris yapin.
              </p>
              <Button className="mt-3 w-fit" onClick={() => router.push('/login')}>
                Giris yap
              </Button>
            </div>
          )}

          {mismatchModal ? (
            <div className="fixed inset-0 z-50">
              <button
                type="button"
                onClick={() => resolveMismatchDecision('cancel')}
                className="absolute inset-0 bg-black/45"
                aria-label="Mismatch modalini kapat"
              />
              <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#E5E5E0] bg-white px-6 py-6 shadow-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9B1C1C]">
                  Fiyat Degisikligi Algilandi
                </p>
                <div className="mt-4 space-y-2 text-sm text-[#1A3C34]">
                  <p>
                    Beklenen:{' '}
                    <span className="font-semibold">
                      {typeof mismatchModal.expectedCents === 'number'
                        ? formatMoney(mismatchModal.expectedCents)
                        : '-'}
                    </span>
                  </p>
                  <p>
                    Guncel:{' '}
                    <span className="font-semibold">{formatMoney(mismatchModal.actualCents)}</span>
                  </p>
                </div>
                <p className="mt-4 text-sm text-[#5C5C5C]">
                  Satis devam edecek. Bu islem risk paneline kaydedilecek.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => resolveMismatchDecision('cancel')}>
                    Iptal
                  </Button>
                  <Button onClick={() => resolveMismatchDecision('continue')}>Devam Et</Button>
                </div>
              </div>
            </div>
          ) : null}

          <ConflictResolutionModal
            isOpen={Boolean(conflictDetail)}
            detail={conflictDetail ?? undefined}
            message="Ayni kayitta baska terminalde degisiklik tespit edildi."
            onClose={() => setConflictDetail(null)}
            onRefresh={() => {
              setConflictDetail(null);
              void loadShiftRows();
              void loadSalesReport();
              void loadStaffSalesReport();
              void refreshQueue();
            }}
          />
        </div>
      </div>

      {/* Tab Contents */}
      <div className={`mx-auto w-full max-w-[1440px] px-3 py-4 md:px-6 md:py-6 ${activeTab === 'categories' ? 'block' : 'hidden'}`}>
        <div className="surface-panel space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#1A3C34]">Ürün Arama ve Kategori Akışı</h2>
              <p className="mt-1 text-sm text-[#5C6F68]">
                Ürünü arat, seç ve satış ekranına aktar.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-9 px-3 text-xs"
              onClick={() => setIsProductSearchModalOpen(true)}
            >
              Gelişmiş Ürün Arama
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void searchProducts();
                }
              }}
              className="h-10 rounded-lg border border-[#D9D9D3] bg-white px-3 text-sm text-[#1A3C34]"
              placeholder="Ürün adı / SKU ile ara"
            />
            <Button
              type="button"
              className="h-10 px-4 text-xs"
              variant="secondary"
              onClick={() => void searchProducts()}
              disabled={isSearchingProduct}
            >
              {isSearchingProduct ? 'Aranıyor...' : 'Ara'}
            </Button>
          </div>

          <div className="rounded-xl border border-[#E5E5E0] bg-[#FAFAF8] p-3">
            {isSearchingProduct ? (
              <p className="text-sm text-[#5C5C5C]">Ürünler getiriliyor...</p>
            ) : productResults.length > 0 ? (
              <div className="space-y-2">
                {productResults.slice(0, 8).map((row) => (
                  <div
                    key={`${row.type}-${row.productId}-${row.variantId ?? 0}-${row.sku ?? row.name}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-sm text-[#1A3C34]"
                  >
                    <div>
                      <p className="font-semibold">{row.name}</p>
                      <p className="text-xs text-[#5C5C5C]">
                        SKU: {row.sku ?? '-'} • Stok: {typeof row.stock === 'number' ? row.stock : '-'} • Fiyat: {formatMoney(row.priceCents)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 px-3 text-[11px]"
                      onClick={() => selectProduct(row)}
                    >
                      Ürünü Seç
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#5C5C5C]">Henüz ürün listesi yok. Arama yaparak başlayın.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E5E5E0] bg-white px-3 py-2 text-sm text-[#1A3C34]">
            <p>
              <span className="font-semibold">Seçili ürün:</span> {resolvedProductName || '-'} {variantId ? `(Varyant #${variantId})` : ''}
            </p>
            <Button
              type="button"
              variant="secondary"
              className="h-8 px-3 text-[11px]"
              onClick={() => setActiveTab('home')}
            >
              Satış Ekranına Dön
            </Button>
          </div>
        </div>
      </div>

      <div className={`mx-auto w-full max-w-[1440px] px-3 py-4 md:px-6 md:py-6 ${activeTab === 'customers' ? 'block' : 'hidden'}`}>
        <div className="surface-panel space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#1A3C34]">Müşteri Yönetimi</h2>
              <p className="mt-1 text-sm text-[#5C6F68]">
                Müşteri arama, seçme ve hızlı müşteri oluşturma işlemleri.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-9 px-3 text-xs"
              onClick={() => setIsCustomerCreateModalOpen(true)}
            >
              Yeni Müşteri
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void searchCustomers();
                }
              }}
              className="h-10 rounded-lg border border-[#D9D9D3] bg-white px-3 text-sm text-[#1A3C34]"
              placeholder="Ad, telefon veya müşteri no ile ara"
            />
            <Button
              type="button"
              className="h-10 px-4 text-xs"
              variant="secondary"
              onClick={() => void searchCustomers()}
              disabled={isSearchingCustomer}
            >
              {isSearchingCustomer ? 'Aranıyor...' : 'Ara'}
            </Button>
          </div>

          <div className="rounded-xl border border-[#E5E5E0] bg-[#FAFAF8] p-3">
            {isSearchingCustomer ? (
              <p className="text-sm text-[#5C5C5C]">Müşteriler getiriliyor...</p>
            ) : customerResults.length > 0 ? (
              <div className="space-y-2">
                {customerResults.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-sm text-[#1A3C34]"
                  >
                    <div>
                      <p className="font-semibold">#{row.id} {row.name}</p>
                      <p className="text-xs text-[#5C5C5C]">{row.phone} • Bakiye: {formatMoney(row.balance)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 px-3 text-[11px]"
                      onClick={() => selectCustomer(row)}
                    >
                      Seç
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#5C5C5C]">Sonuç yok. Yeni müşteri oluşturabilirsiniz.</p>
            )}
          </div>

          <div className="rounded-xl border border-[#E5E5E0] bg-white px-3 py-3">
            <p className="text-sm text-[#1A3C34]">
              <span className="font-semibold">Seçili müşteri:</span>{' '}
              {selectedCustomer
                ? `#${selectedCustomer.id} ${selectedCustomer.name} • ${selectedCustomer.phone} • Bakiye: ${formatMoney(selectedCustomer.balance)}`
                : 'Seçilmedi'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                value={balanceApplyAmount}
                onChange={(e) => setBalanceApplyAmount(e.target.value)}
                className="h-9 w-44 rounded-full border border-[#D9D9D3] px-3 text-sm text-[#1A3C34]"
                placeholder="Bakiye (kuruş)"
                inputMode="numeric"
              />
              <Button
                type="button"
                variant="secondary"
                className="h-9 px-3 text-xs"
                onClick={() => void applyCustomerBalance()}
                disabled={!selectedCustomer || !lastOnlineOrderId || isApplyingBalance}
              >
                {isApplyingBalance ? 'Uygulanıyor...' : 'Bakiyeden Öde'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className={`mx-auto w-full max-w-[1440px] px-3 py-4 md:px-6 md:py-6 ${activeTab === 'finance' ? 'block' : 'hidden'}`}>
        <div className="surface-panel space-y-4 p-6">
          <div>
            <h2 className="text-xl font-semibold text-[#1A3C34]">Finans ve Analitik</h2>
            <p className="mt-1 text-sm text-[#5C6F68]">
              Personel satış raporu ve POS analitik verileri.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1A3C34]/70">
              Başlangıç
              <input
                type="date"
                value={reportDateFrom}
                onChange={(e) => setReportDateFrom(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-[#D9D9D3] bg-white px-2 text-sm text-[#1A3C34]"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1A3C34]/70">
              Bitiş
              <input
                type="date"
                value={reportDateTo}
                onChange={(e) => setReportDateTo(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-[#D9D9D3] bg-white px-2 text-sm text-[#1A3C34]"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1A3C34]/70">
              Periyot
              <select
                value={salesPeriod}
                onChange={(e) => setSalesPeriod(e.target.value as 'day' | 'week' | 'month')}
                className="mt-1 h-9 w-full rounded-lg border border-[#D9D9D3] bg-white px-2 text-sm text-[#1A3C34]"
              >
                <option value="day">Günlük</option>
                <option value="week">Haftalık</option>
                <option value="month">Aylık</option>
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1A3C34]/70">
              Top Ürün Limiti
              <input
                value={salesTopLimit}
                onChange={(e) => setSalesTopLimit(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-[#D9D9D3] bg-white px-2 text-sm text-[#1A3C34]"
                inputMode="numeric"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="h-8 px-3 text-xs"
              onClick={() => void loadStaffSalesReport()}
              disabled={isSalesReportBusy}
            >
              {isSalesReportBusy ? 'Yükleniyor...' : 'Personel Raporu'}
            </Button>
            <Button
              variant="secondary"
              className="h-8 px-3 text-xs"
              onClick={() => void loadSalesReport()}
              disabled={isSalesAnalyticsBusy}
            >
              {isSalesAnalyticsBusy ? 'Yükleniyor...' : 'Satış Analitiği'}
            </Button>
            <Button
              variant="secondary"
              className="h-8 px-3 text-xs"
              onClick={() => void downloadSalesCsv()}
              disabled={isSalesAnalyticsBusy}
            >
              CSV İndir
            </Button>
            <Button
              variant="secondary"
              className="h-8 px-3 text-xs"
              onClick={printSalesReportPdf}
              disabled={!salesReport}
            >
              PDF Yazdır
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-[#E5E5E0] bg-white px-3 py-3 text-sm text-[#1A3C34]">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                Satış Özeti
              </p>
              {salesReport ? (
                <div className="mt-2 space-y-1.5">
                  <p>Sipariş: <span className="font-semibold">{salesReport.summary.orderCount}</span></p>
                  <p>Ciro: <span className="font-semibold">{formatMoney(salesReport.summary.salesTotalCents)}</span></p>
                  <p>Tahsilat: <span className="font-semibold">{formatMoney(salesReport.summary.paymentsTotalCents)}</span></p>
                  <p>Ortalama Fiş: <span className="font-semibold">{formatMoney(salesReport.summary.avgTicketCents)}</span></p>
                </div>
              ) : (
                <p className="mt-2 text-[#5C5C5C]">Analitik verisi yüklenmedi.</p>
              )}
            </div>

            <div className="rounded-xl border border-[#E5E5E0] bg-white px-3 py-3 text-sm text-[#1A3C34]">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                Personel Özeti
              </p>
              {staffSalesReport?.rows?.length ? (
                <div className="mt-2 space-y-1.5">
                  {staffSalesReport.rows.slice(0, 4).map((row) => (
                    <p key={row.userId}>
                      {row.userName}: <span className="font-semibold">{row.orderCount} sipariş</span> • {formatMoney(row.salesTotalCents)}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[#5C5C5C]">Personel rapor verisi yok.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`mx-auto w-full max-w-[1440px] px-3 py-4 md:px-6 md:py-6 ${activeTab === 'orders' ? 'block' : 'hidden'}`}>
        <div className="surface-panel space-y-4 p-6">
          <div>
            <h2 className="text-xl font-semibold text-[#1A3C34]">Sipariş ve Kuyruk Yönetimi</h2>
            <p className="mt-1 text-sm text-[#5C6F68]">
              Fatura yükleme ve offline kuyruk işlemleri.
            </p>
          </div>

          <div className="grid gap-2 md:grid-cols-[220px_auto]">
            <input
              value={invoiceOrderId}
              onChange={(e) => setInvoiceOrderId(e.target.value)}
              className="h-10 rounded-lg border border-[#D9D9D3] bg-white px-3 text-sm text-[#1A3C34]"
              placeholder={lastOnlineOrderId ? String(lastOnlineOrderId) : 'Sipariş no'}
              inputMode="numeric"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                className="h-10 px-3 text-xs"
                onClick={() => void loadInvoicePayload()}
                disabled={isInvoiceBusy}
              >
                {isInvoiceBusy ? 'Yükleniyor...' : 'Faturayı Yükle'}
              </Button>
              <Button
                variant="secondary"
                className="h-10 px-3 text-xs"
                onClick={printA4Invoice}
                disabled={!invoicePayload}
              >
                A4 Yazdır / PDF
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E5E0] bg-white px-3 py-3 text-sm text-[#1A3C34]">
            {invoicePayload ? (
              <div className="space-y-1.5">
                <p className="font-semibold">
                  {invoicePayload.business.name} - {invoicePayload.invoiceNo}
                </p>
                <p>Sipariş #{invoicePayload.order.id} • Müşteri: {invoicePayload.customer.name}</p>
                <p>
                  Toplam: {formatMoney(invoicePayload.totals.totalAmountCents)} • Ödenen: {formatMoney(invoicePayload.totals.paidAmountCents)}
                </p>
              </div>
            ) : (
              <p className="text-[#5C5C5C]">Fatura verisi yüklenmedi.</p>
            )}
          </div>

          <div className="rounded-xl border border-[#E5E5E0] bg-white px-3 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                Offline Kuyruk Detayı
              </p>
              <Button
                size="sm"
                className="h-7 px-2 text-[10px]"
                onClick={() => void syncQueuedSales({ force: true })}
                disabled={!isOnline || !hasQueue || isSyncing}
              >
                {isSyncing ? 'Sync...' : 'Kuyruğu Sync Et'}
              </Button>
            </div>
            {queueItems.length === 0 ? (
              <p className="text-sm text-[#5C5C5C]">Bekleyen satış yok.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E5E0] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5C5C5C]">
                      <th className="py-2 pr-3">Order ID</th>
                      <th className="py-2 pr-3">Retry</th>
                      <th className="py-2 pr-3">Next Retry</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2">Aksiyon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueItems.map((item) => (
                      <tr key={item.id} className="border-b border-[#F0F0EA]">
                        <td className="py-2 pr-3 text-xs text-[#1A3C34]">
                          {item.payload.idempotencyKey ?? `Q-${item.id.slice(0, 8)}`}
                        </td>
                        <td className="py-2 pr-3 text-xs text-[#1A3C34]">{item.attempts}</td>
                        <td className="py-2 pr-3 text-xs text-[#5C5C5C]">{formatQueueDate(item.nextRetryAt)}</td>
                        <td className="py-2 pr-3 text-xs font-semibold text-[#1A3C34]">
                          {resolveQueueStatus(item)}
                        </td>
                        <td className="py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              className="h-7 px-2 text-[10px]"
                              onClick={() => void retrySingleQueueItem(item)}
                              disabled={isSyncing || queueActionItemId === item.id}
                            >
                              Tekrar Dene
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 px-2 text-[10px]"
                              onClick={() => void removeSingleQueueItem(item)}
                              disabled={isSyncing || queueActionItemId === item.id}
                            >
                              Kaldır
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`mx-auto w-full max-w-[1440px] px-3 py-4 md:px-6 md:py-6 ${activeTab === 'settings' ? 'block' : 'hidden'}`}>
        <div className="surface-panel space-y-4 p-6">
          <div>
            <h2 className="text-xl font-semibold text-[#1A3C34]">POS Ayarları</h2>
            <p className="mt-1 text-sm text-[#5C6F68]">
              Fiş bilgileri ve yazdırma kontrolleri.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[#E5E5E0] bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                Fiş Ayarları
              </p>
              <div className="mt-3 grid gap-3">
                <label className="text-sm text-[#1A3C34]">
                  İşletme adı
                  <input
                    value={receiptSettings.businessName}
                    onChange={(e) =>
                      setReceiptSettings((prev) => ({
                        ...prev,
                        businessName: e.target.value,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-[#D9D9D3] px-3 text-sm text-[#1A3C34]"
                  />
                </label>
                <label className="text-sm text-[#1A3C34]">
                  Alt not
                  <input
                    value={receiptSettings.footerNote}
                    onChange={(e) =>
                      setReceiptSettings((prev) => ({
                        ...prev,
                        footerNote: e.target.value,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-[#D9D9D3] px-3 text-sm text-[#1A3C34]"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" className="h-9 px-3 text-xs" onClick={saveReceiptSettings}>
                    Ayarları Kaydet
                  </Button>
                  <Button variant="secondary" className="h-9 px-3 text-xs" onClick={() => void printReceipt()} disabled={!lastReceipt}>
                    Son Fişi Yazdır
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#E5E5E0] bg-[#FAFAF8] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1A3C34]/70">
                Fiş Önizleme
              </p>
              {lastReceipt ? (
                <div className="mt-3 space-y-2 text-sm text-[#1A3C34]">
                  <p className="font-semibold">{receiptSettings.businessName}</p>
                  <p>Fiş: {lastReceipt.saleId}</p>
                  <p>Tarih: {new Date(lastReceipt.createdAt).toLocaleString('tr-TR')}</p>
                  <p>
                    Müşteri: {typeof lastReceipt.customerId === 'number' ? lastReceipt.customerId : 'Misafir'}
                  </p>
                  <p className="font-semibold">Toplam: {formatMoney(lastReceipt.totalAmountCents)}</p>
                  <p className="text-xs text-[#5C5C5C]">
                    {lastReceipt.isOfflineQueued ? 'Offline kayıt - senkron bekliyor' : 'Online satış'}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-[#5C5C5C]">Henüz fiş yok.</p>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
