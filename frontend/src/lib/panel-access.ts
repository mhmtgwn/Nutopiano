import type { LucideIcon } from 'lucide-react';
import {
  Archive,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  ClipboardList,
  CreditCard,
  FileKey,
  Flag,
  Heart,
  Home,
  KeyRound,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Store,
  User,
  Users,
  Wallet,
} from 'lucide-react';

import {
  getPanelHomePathByRole,
  getPanelLabelByRole,
  isAdminRole,
  normalizeRole,
  type AppRole,
  type EffectiveAppRole,
} from '@/lib/role-routing';
import type { FeatureStatusItem, PanelKey } from '@/types/profile';

export type PanelNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  badge?: string;
};

export type PanelSection = {
  title: string;
  icon?: LucideIcon;
  collapsible?: boolean;
  items: PanelNavItem[];
};

export type PanelEntry = PanelNavItem & {
  key: PanelKey;
  title: string;
};

export type ResolvedCapability =
  | 'VIEW_FINANCE'
  | 'EXECUTE_OVERRIDE'
  | 'VIEW_AUDIT'
  | 'MANAGE_SELLERS'
  | 'PROCESS_RETURN'
  | 'CLOSE_REGISTER'
  | 'FORCE_PUBLISH'
  | 'FORCE_STOCK'
  | 'VIEW_OUTBOX'
  | 'MANAGE_PAYOUT'
  | 'VIEW_REPORTS'
  | 'USE_POS'
  | 'VIEW_SUPPORT_MODE'
  | 'EXECUTE_BULK_ACTIONS';

export type PanelVisibilityRule = (manifest: PanelAccessManifest) => boolean;

export type SellerSectionAccess = {
  overview: boolean;
  orders: boolean;
  products: boolean;
  customers: boolean;
  finance: boolean;
  reports: boolean;
  campaigns: boolean;
  subscription: boolean;
  settings: boolean;
};

export type PanelAccessManifest = {
  role: AppRole | null;
  effectiveRole: EffectiveAppRole | null;
  permissions: string[];
  permissionSet: Set<string>;
  allowedPanels: PanelKey[];
  featureStatuses: FeatureStatusItem[];
  adminPanelEnabled: boolean;
  sellerPanelEnabled: boolean;
  posPanelEnabled: boolean;
  customerPanelEnabled: boolean;
  hasBackofficePanels: boolean;
  hasMultiplePanels: boolean;
  sellerSectionAccess: SellerSectionAccess;
  visiblePanels: PanelEntry[];
  primaryPanel: PanelEntry | null;
  panelHome: string;
  panelSwitcherHref: string;
  panelSwitcherLabel: string;
};

export type AccessSubject = {
  role?: string | null;
  effectiveRole?: string | null;
  permissions?: string[];
  allowedPanels?: string[];
  panelHome?: string;
  featureStatuses?: FeatureStatusItem[];
};

type RoleFeaturePreset = {
  label: string;
  description: string;
  permissionScope: string;
  variant: 'error' | 'purple' | 'info' | 'warning' | 'neutral';
  features: FeatureStatusItem[];
};

const VALID_PANEL_KEYS = new Set<PanelKey>(['ADMIN', 'SELLER', 'POS', 'CUSTOMER']);

const STAFF_ORDER_PERMISSIONS = [
  'orders.view',
  'orders.create',
  'orders.edit',
  'orders.status_update',
  'orders.cancel',
  'orders.return.process',
];

const STAFF_PRODUCT_PERMISSIONS = [
  'products.view',
  'products.create',
  'products.edit',
  'products.delete',
  'products.publish',
  'products.stock',
  'products.import',
  'products.archive',
];

const STAFF_CUSTOMER_PERMISSIONS = [
  'customers.view',
  'customers.create',
  'customers.edit',
  'customers.credit.manage',
];

const STAFF_FINANCE_PERMISSIONS = [
  'finance.view',
  'finance.ledger.view',
  'finance.wallets.view',
  'finance.payout.view',
  'finance.refund.process',
  'finance.report.export',
];

const STAFF_REPORT_PERMISSIONS = ['reports.view', 'finance.report.export'];

const STAFF_POS_PERMISSIONS = [
  'pos.sales',
  'pos.orders',
  'pos.reports',
  'pos.register.open',
  'pos.register.close',
  'pos.return',
  'pos.discount',
  'pos.override_price',
  'pos.cash_drawer',
  'pos.refund_without_manager',
  'pos.view_margin',
];

const dedupe = <T>(values: T[]) => Array.from(new Set(values));

const createPanelEntry = (
  key: PanelKey,
  href: string,
  overrides?: Partial<Pick<PanelEntry, 'description' | 'label' | 'title'>>,
): PanelEntry => {
  if (key === 'ADMIN') {
    return {
      key,
      href,
      icon: LayoutDashboard,
      label: overrides?.label ?? 'Admin Paneli',
      title: overrides?.title ?? 'Admin Paneli',
      description:
        overrides?.description ?? 'Platform, ekip ve operasyon akislarini yonetin.',
    };
  }

  if (key === 'SELLER') {
    return {
      key,
      href,
      icon: Store,
      label: overrides?.label ?? 'Satici Paneli',
      title: overrides?.title ?? 'Satici Paneli',
      description:
        overrides?.description ?? 'Siparis, urun ve magaza akislarini yonetin.',
    };
  }

  if (key === 'POS') {
    return {
      key,
      href,
      icon: CreditCard,
      label: overrides?.label ?? 'POS Paneli',
      title: overrides?.title ?? 'POS Paneli',
      description:
        overrides?.description ?? 'Satis, kasa ve vardiya islerini yonetin.',
    };
  }

  return {
    key,
    href,
    icon: ShoppingBag,
    label: overrides?.label ?? 'Musteri Hesabi',
    title: overrides?.title ?? 'Musteri Hesabi',
    description:
      overrides?.description ?? 'Siparis, favori ve adres bilgilerinize ulasin.',
  };
};

export const ROLE_FEATURE_PRESETS: Record<AppRole, RoleFeaturePreset> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    description: 'Platform yoneticisi - tam erisim',
    variant: 'error',
    permissionScope: 'Tum yetkiler',
    features: [
      { key: 'platform.settings', status: 'ACTIVE' },
      { key: 'platform.feature_flags', status: 'ACTIVE' },
      { key: 'platform.api_keys', status: 'ACTIVE' },
      { key: 'platform.audit_outbox', status: 'ACTIVE' },
      { key: 'platform.finance_all', status: 'ACTIVE' },
      {
        key: 'platform.report_exports',
        status: 'PLANNED',
        note: 'Ek export modulleri faz-2.',
      },
    ],
  },
  ADMIN: {
    label: 'Admin',
    description: 'Isletme yoneticisi - kendi isletmesinde genis yetki',
    variant: 'purple',
    permissionScope: 'Super admin alanlari haric genis operasyon yetkisi',
    features: [
      { key: 'business.operations', status: 'ACTIVE' },
      { key: 'seller.management', status: 'ACTIVE' },
      { key: 'finance.payouts', status: 'ACTIVE' },
      { key: 'audit.read', status: 'ACTIVE' },
      {
        key: 'platform.superadmin_only',
        status: 'BLOCKED',
        note: 'Sadece SUPER_ADMIN.',
      },
    ],
  },
  SELLER: {
    label: 'Satici',
    description: 'Satici - kendi magazasini yonetir',
    variant: 'info',
    permissionScope: 'Kendi urun, siparis, musteri ve finans akislarina erisim',
    features: [
      { key: 'seller.products', status: 'ACTIVE' },
      { key: 'seller.orders', status: 'ACTIVE' },
      { key: 'seller.customers', status: 'ACTIVE' },
      { key: 'seller.pos', status: 'ACTIVE' },
      { key: 'seller.finance_own', status: 'ACTIVE' },
      {
        key: 'seller.advanced_modules',
        status: 'PLANNED',
        note: 'Dokumanda olan ek moduller.',
      },
    ],
  },
  SELLER_STAFF: {
    label: 'Satici Personeli',
    description: 'Yetki grubu ile kontrol edilen seller personeli',
    variant: 'warning',
    permissionScope: 'Varsayilan yok - atanmis yetkiler belirler',
    features: [
      {
        key: 'staff.assigned_permissions',
        status: 'ACTIVE',
        note: 'Atanan yetki grubuna gore degisir.',
      },
      {
        key: 'staff.out_of_scope',
        status: 'BLOCKED',
        note: 'Yetki grubu disindaki islemler kapali.',
      },
    ],
  },
  CUSTOMER: {
    label: 'Musteri',
    description: 'Son kullanici - siparis ve hesap akislarina erisir',
    variant: 'neutral',
    permissionScope: 'Siparis verme, profil ve adres yonetimi',
    features: [
      { key: 'customer.profile', status: 'ACTIVE' },
      { key: 'customer.addresses', status: 'ACTIVE' },
      { key: 'customer.orders', status: 'ACTIVE' },
      { key: 'customer.favorites', status: 'ACTIVE' },
      { key: 'customer.reviews', status: 'ACTIVE' },
      {
        key: 'customer.backoffice',
        status: 'BLOCKED',
        note: 'Backoffice panellerine erisim yok.',
      },
    ],
  },
};

export const normalizeAccessPermissions = (permissions?: string[]) =>
  dedupe(
    Array.isArray(permissions)
      ? permissions
          .map((permission) => String(permission ?? '').trim().toLowerCase())
          .filter(Boolean)
      : [],
  );

const normalizeAllowedPanels = (allowedPanels?: string[]): PanelKey[] =>
  dedupe(
    Array.isArray(allowedPanels)
      ? allowedPanels.filter((panel): panel is PanelKey => VALID_PANEL_KEYS.has(panel as PanelKey))
      : [],
  );

const hasAnyPermission = (permissionSet: Set<string>, candidates: string[]) =>
  candidates.some((candidate) => permissionSet.has(candidate));

export const inferAllowedPanels = (
  role?: string | null,
  permissions?: string[],
): PanelKey[] => {
  const normalizedRole = normalizeRole(role);
  const permissionSet = new Set(normalizeAccessPermissions(permissions));

  switch (normalizedRole) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return ['ADMIN', 'SELLER', 'POS', 'CUSTOMER'];
    case 'SELLER':
      return ['SELLER', 'POS'];
    case 'CUSTOMER':
      return ['CUSTOMER'];
    case 'SELLER_STAFF': {
      const panels: PanelKey[] = [];

      if (
        hasAnyPermission(permissionSet, [
          ...STAFF_ORDER_PERMISSIONS,
          ...STAFF_PRODUCT_PERMISSIONS,
          ...STAFF_CUSTOMER_PERMISSIONS,
          ...STAFF_FINANCE_PERMISSIONS,
          ...STAFF_REPORT_PERMISSIONS,
        ])
      ) {
        panels.push('SELLER');
      }

      if (hasAnyPermission(permissionSet, STAFF_POS_PERMISSIONS)) {
        panels.push('POS');
      }

      return panels;
    }
    default:
      return [];
  }
};

export const resolveAllowedPanels = (
  role?: string | null,
  allowedPanels?: string[],
  permissions?: string[],
) => {
  const direct = normalizeAllowedPanels(allowedPanels);
  if (direct.length > 0) {
    return direct;
  }

  return inferAllowedPanels(role, permissions);
};

const resolveSellerSectionAccess = (
  role: AppRole | null,
  permissionSet: Set<string>,
): SellerSectionAccess => {
  if (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'SELLER') {
    return {
      overview: true,
      orders: true,
      products: true,
      customers: true,
      finance: true,
      reports: true,
      campaigns: true,
      subscription: true,
      settings: true,
    };
  }

  if (role !== 'SELLER_STAFF') {
    return {
      overview: false,
      orders: false,
      products: false,
      customers: false,
      finance: false,
      reports: false,
      campaigns: false,
      subscription: false,
      settings: false,
    };
  }

  const orders = hasAnyPermission(permissionSet, STAFF_ORDER_PERMISSIONS);
  const products = hasAnyPermission(permissionSet, STAFF_PRODUCT_PERMISSIONS);
  const customers = hasAnyPermission(permissionSet, STAFF_CUSTOMER_PERMISSIONS);
  const finance = hasAnyPermission(permissionSet, STAFF_FINANCE_PERMISSIONS);
  const reports = hasAnyPermission(permissionSet, STAFF_REPORT_PERMISSIONS);

  return {
    overview: orders || products || customers || finance || reports,
    orders,
    products,
    customers,
    finance,
    reports,
    campaigns: false,
    subscription: false,
    settings: false,
  };
};

const resolveSellerPanelHref = (access: SellerSectionAccess) => {
  if (access.orders) return '/dashboard/orders';
  if (access.products) return '/dashboard/products';
  if (access.customers) return '/dashboard/customers';
  if (access.finance) return '/dashboard/finance';
  if (access.reports) return '/dashboard/reports';
  return '/dashboard';
};

export const resolveDefaultPanelHome = (
  role?: string | null,
  allowedPanels?: PanelKey[],
  permissions?: string[],
) => {
  const normalizedRole = normalizeRole(role);
  const resolvedPanels = Array.isArray(allowedPanels)
    ? allowedPanels
    : resolveAllowedPanels(role, undefined, permissions);
  const permissionSet = new Set(normalizeAccessPermissions(permissions));

  if (normalizedRole === 'SELLER_STAFF') {
    if (resolvedPanels.includes('SELLER')) {
      return resolveSellerPanelHref(
        resolveSellerSectionAccess(normalizedRole, permissionSet),
      );
    }

    if (resolvedPanels.includes('POS')) {
      return '/pos';
    }
  }

  if (resolvedPanels.includes('ADMIN') && isAdminRole(role)) {
    return '/admin';
  }

  if (resolvedPanels.includes('SELLER')) {
    return normalizedRole === 'SELLER_STAFF'
      ? resolveSellerPanelHref(resolveSellerSectionAccess(normalizedRole, permissionSet))
      : '/dashboard';
  }

  if (resolvedPanels.includes('POS')) return '/pos';
  if (normalizedRole === 'CUSTOMER' && resolvedPanels.includes('CUSTOMER')) {
    return '/account/orders';
  }

  return getPanelHomePathByRole(role);
};

export const createPanelAccessManifest = (
  subject?: AccessSubject | null,
): PanelAccessManifest => {
  const role = normalizeRole(subject?.role);
  const normalizedEffectiveRole = normalizeRole(subject?.effectiveRole);
  const effectiveRole =
    normalizedEffectiveRole != null
      ? normalizedEffectiveRole === 'SUPER_ADMIN'
        ? 'ADMIN'
        : normalizedEffectiveRole
      : role === 'SUPER_ADMIN'
        ? 'ADMIN'
        : role;
  const permissions = normalizeAccessPermissions(subject?.permissions);
  const permissionSet = new Set(permissions);
  const allowedPanels = resolveAllowedPanels(
    subject?.role,
    subject?.allowedPanels,
    permissions,
  );
  const sellerSectionAccess = resolveSellerSectionAccess(role, permissionSet);
  const adminPanelEnabled = Boolean(
    allowedPanels.includes('ADMIN') && (role === 'SUPER_ADMIN' || role === 'ADMIN'),
  );
  const sellerPanelEnabled = Boolean(
    allowedPanels.includes('SELLER') &&
      (role === 'SUPER_ADMIN' ||
        role === 'ADMIN' ||
        role === 'SELLER' ||
        sellerSectionAccess.overview),
  );
  const posPanelEnabled = Boolean(
    allowedPanels.includes('POS') &&
      (role === 'SUPER_ADMIN' ||
        role === 'ADMIN' ||
        role === 'SELLER' ||
        hasAnyPermission(permissionSet, STAFF_POS_PERMISSIONS)),
  );
  const customerPanelEnabled = Boolean(
    role === 'CUSTOMER' && allowedPanels.includes('CUSTOMER'),
  );
  const visiblePanels: PanelEntry[] = [];

  if (adminPanelEnabled) {
    visiblePanels.push(createPanelEntry('ADMIN', '/admin'));
  }

  if (sellerPanelEnabled) {
    visiblePanels.push(
      createPanelEntry('SELLER', resolveSellerPanelHref(sellerSectionAccess), {
        label: role === 'SELLER_STAFF' ? 'Seller Is Akisi' : 'Satici Paneli',
        title: role === 'SELLER_STAFF' ? 'Seller Is Akisi' : 'Satici Paneli',
        description:
          role === 'SELLER_STAFF'
            ? 'Atanan seller modullerine hizli erisim.'
            : 'Siparis, urun, musteri ve magaza akislarini yonetin.',
      }),
    );
  }

  if (posPanelEnabled) {
    visiblePanels.push(createPanelEntry('POS', '/pos'));
  }

  if (customerPanelEnabled) {
    visiblePanels.push(createPanelEntry('CUSTOMER', '/account/orders'));
  }

  const panelHome =
    subject?.panelHome ??
    resolveDefaultPanelHome(subject?.role, allowedPanels, permissions);
  const primaryPanel =
    visiblePanels.find((panel) => panel.href === panelHome) ?? visiblePanels[0] ?? null;
  const hasMultiplePanels = visiblePanels.length > 1;
  const panelSwitcherHref =
    visiblePanels.length === 0
      ? panelHome
      : hasMultiplePanels
        ? '/panel'
        : primaryPanel?.href ?? panelHome;
  const panelSwitcherLabel =
    visiblePanels.length > 1
      ? 'Paneller'
      : primaryPanel?.label ?? getPanelLabelByRole(subject?.role);

  return {
    role,
    effectiveRole,
    permissions,
    permissionSet,
    allowedPanels,
    featureStatuses: Array.isArray(subject?.featureStatuses)
      ? subject.featureStatuses
      : role
        ? ROLE_FEATURE_PRESETS[role].features
        : [],
    adminPanelEnabled,
    sellerPanelEnabled,
    posPanelEnabled,
    customerPanelEnabled,
    hasBackofficePanels: adminPanelEnabled || sellerPanelEnabled || posPanelEnabled,
    hasMultiplePanels,
    sellerSectionAccess,
    visiblePanels,
    primaryPanel,
    panelHome,
    panelSwitcherHref,
    panelSwitcherLabel,
  };
};

export const getPanelSwitcherEntries = (manifest: PanelAccessManifest) =>
  manifest.visiblePanels.map((entry) => ({
    href: entry.href,
    icon: entry.icon,
    label: entry.label,
    description: entry.description,
  }));

export const getBackofficePanelEntries = (manifest: PanelAccessManifest) =>
  manifest.visiblePanels.filter((entry) => entry.key !== 'CUSTOMER');

export const getAccountCoreLinks = (manifest: PanelAccessManifest): PanelNavItem[] => {
  const links: PanelNavItem[] = [
    { href: '/account/profile', icon: User, label: 'Profil' },
    { href: '/account/settings', icon: Settings, label: 'Ayarlar' },
  ];

  if (manifest.hasBackofficePanels) {
    links.unshift({
      href: manifest.panelSwitcherHref,
      icon: LayoutDashboard,
      label: manifest.panelSwitcherLabel,
      description:
        manifest.hasMultiplePanels
          ? 'Erisilebilir paneller arasinda gecis yapin.'
          : 'Ana calisma alaniniza gidin.',
    });
  }

  return links;
};

export const getAccountCommerceLinks = (
  manifest: PanelAccessManifest,
): PanelNavItem[] => {
  if (!manifest.customerPanelEnabled) {
    return [];
  }

  return [
    { href: '/account/orders', icon: ShoppingBag, label: 'Siparislerim' },
    { href: '/account/favorites', icon: Heart, label: 'Favorilerim' },
    { href: '/account/reviews', icon: MessageSquare, label: 'Yorumlarim' },
    { href: '/account/addresses', icon: MapPin, label: 'Adreslerim' },
    { href: '/checkout', icon: CreditCard, label: 'Odeme Bilgileri' },
  ];
};

export const getAccountOverviewLinks = (
  manifest: PanelAccessManifest,
): PanelNavItem[] => [...getAccountCoreLinks(manifest), ...getAccountCommerceLinks(manifest)];

const canSeeAdminAudit = (manifest: PanelAccessManifest) =>
  manifest.permissionSet.has('audit.view') || manifest.permissionSet.has('audit.export');

const canSeeFinance = (manifest: PanelAccessManifest) =>
  manifest.permissionSet.has('finance.view') ||
  manifest.permissionSet.has('finance.ledger.view') ||
  manifest.permissionSet.has('finance.wallets.view') ||
  manifest.role === 'SUPER_ADMIN' ||
  manifest.role === 'ADMIN' ||
  manifest.role === 'SELLER';

const canManagePayout = (manifest: PanelAccessManifest) =>
  manifest.permissionSet.has('finance.payout.approve') ||
  manifest.permissionSet.has('finance.payout.reject') ||
  manifest.role === 'SUPER_ADMIN' ||
  manifest.role === 'ADMIN';

const canManageSellers = (manifest: PanelAccessManifest) =>
  manifest.permissionSet.has('sellers.view') ||
  manifest.permissionSet.has('sellers.create') ||
  manifest.permissionSet.has('sellers.edit') ||
  manifest.permissionSet.has('sellers.activate') ||
  manifest.role === 'SUPER_ADMIN' ||
  manifest.role === 'ADMIN';

const canSeeReports = (manifest: PanelAccessManifest) =>
  manifest.permissionSet.has('reports.view') ||
  manifest.permissionSet.has('finance.report.export') ||
  manifest.role === 'SUPER_ADMIN' ||
  manifest.role === 'ADMIN' ||
  manifest.role === 'SELLER';

const createWorkspaceSection = (manifest: PanelAccessManifest): PanelSection => {
  const items: PanelNavItem[] = [
    { href: '/admin', label: 'Admin Panel', icon: LayoutDashboard },
    ...getBackofficePanelEntries(manifest)
      .filter((entry) => entry.key !== 'ADMIN')
      .map((entry) => ({
        href: entry.href,
        label: entry.label,
        icon: entry.icon,
      })),
    { href: '/account/profile', label: 'Hesap Merkezi', icon: User },
  ];

  return {
    title: 'Paneller',
    items: dedupeNavItems(items),
  };
};

const dedupeNavItems = (items: PanelNavItem[]) =>
  items.filter(
    (item, index, all) => all.findIndex((candidate) => candidate.href === item.href) === index,
  );

const dedupeSections = (sections: PanelSection[]) =>
  sections
    .map((section) => ({
      ...section,
      items: dedupeNavItems(section.items),
    }))
    .filter((section) => section.items.length > 0);

export const getAdminPanelSections = (
  manifest: PanelAccessManifest,
): PanelSection[] =>
  dedupeSections([
    createWorkspaceSection(manifest),
    {
      title: 'Business Operations',
      icon: Boxes,
      collapsible: true,
      items: [
        { href: '/admin', label: 'Genel Bakis', icon: Home },
        ...(canManageSellers(manifest)
          ? [
              { href: '/admin/sellers', label: 'Saticilar', icon: Store },
              {
                href: '/admin/sellers/applications',
                label: 'Satici Basvurulari',
                icon: ClipboardList,
              },
              { href: '/admin/sellers/staff', label: 'Satici Ekipleri', icon: Users },
            ]
          : []),
        { href: '/admin/products', label: 'Urunler', icon: Package },
        { href: '/admin/categories', label: 'Kategoriler', icon: BookOpen },
        { href: '/admin/catalog', label: 'Katalog', icon: Boxes },
        { href: '/admin/orders', label: 'Siparisler', icon: ClipboardList },
        { href: '/admin/customers', label: 'Musteriler', icon: Users },
      ],
    },
    {
      title: 'Financial Control',
      icon: Wallet,
      collapsible: true,
      items: [
        ...(canSeeFinance(manifest)
          ? [
              { href: '/admin/finance', label: 'Finans Ozeti', icon: CreditCard },
              { href: '/admin/finance/ledger', label: 'Ledger', icon: BookOpen },
              { href: '/admin/finance/wallets', label: 'Cuzdanlar', icon: Wallet },
              { href: '/admin/finance/refunds', label: 'Iadeler', icon: Shield },
              {
                href: '/admin/finance/mismatch-monitor',
                label: 'Uyumsuzluk',
                icon: ShieldCheck,
              },
            ]
          : []),
        ...(canManagePayout(manifest)
          ? [
              {
                href: '/admin/finance/payouts',
                label: 'Payout Talepleri',
                icon: CreditCard,
              },
            ]
          : []),
      ],
    },
    {
      title: 'Platform Governance',
      icon: ShieldCheck,
      collapsible: true,
      items: [
        { href: '/admin/users', label: 'Kullanicilar', icon: Users },
        { href: '/admin/roles', label: 'Roller ve Yetkiler', icon: ShieldCheck },
        {
          href: '/admin/permission-groups',
          label: 'Yetki Gruplari',
          icon: KeyRound,
        },
        { href: '/admin/notifications', label: 'Bildirimler', icon: Bell },
        ...(canSeeAdminAudit(manifest)
          ? [
              { href: '/admin/audit', label: 'Audit Log', icon: BookOpen },
              { href: '/admin/audit/outbox', label: 'Outbox', icon: Archive },
              { href: '/admin/risk-control', label: 'Risk Kontrol', icon: Shield },
              { href: '/admin/security', label: 'Guvenlik', icon: ShieldCheck },
            ]
          : []),
        { href: '/admin/smtp', label: 'Mail Sunucu', icon: Mail },
        { href: '/admin/smtp/templates', label: 'E-posta Sablonlari', icon: Mail },
        { href: '/admin/sms', label: 'SMS Ayarlari', icon: MessageSquare },
        { href: '/admin/sms/templates', label: 'SMS Sablonlari', icon: MessageSquare },
        ...(manifest.role === 'SUPER_ADMIN'
          ? [
              {
                href: '/admin/settings/feature-flags',
                label: 'Feature Flags',
                icon: Flag,
              },
              { href: '/admin/settings/api-keys', label: 'API Keys', icon: FileKey },
            ]
          : []),
        { href: '/admin/settings/config-snapshots', label: 'Config Snapshots', icon: Archive },
        { href: '/admin/plans', label: 'Planlar', icon: CreditCard },
        ...(canSeeReports(manifest)
          ? [{ href: '/admin/reports', label: 'Raporlar', icon: BarChart3 }]
          : []),
        { href: '/admin/settings', label: 'Ayarlar', icon: Settings },
      ],
    },
  ]);

export const getSellerPanelSections = (
  manifest: PanelAccessManifest,
): PanelSection[] => {
  const items: PanelNavItem[] = [];

  if (manifest.sellerSectionAccess.overview && manifest.role !== 'SELLER_STAFF') {
    items.push({ href: '/dashboard', label: 'Genel Bakis', icon: Home });
  }

  if (manifest.sellerSectionAccess.orders) {
    items.push({ href: '/dashboard/orders', label: 'Siparisler', icon: ScrollText });
  }

  if (manifest.sellerSectionAccess.products) {
    items.push({ href: '/dashboard/products', label: 'Urunler', icon: Package });
  }

  if (manifest.sellerSectionAccess.customers) {
    items.push({ href: '/dashboard/customers', label: 'Musteriler', icon: Users });
  }

  if (manifest.sellerSectionAccess.finance) {
    items.push({ href: '/dashboard/finance', label: 'Finans', icon: Wallet });
  }

  if (manifest.sellerSectionAccess.reports) {
    items.push({ href: '/dashboard/reports', label: 'Raporlar', icon: BarChart3 });
  }

  if (manifest.sellerSectionAccess.campaigns) {
    items.push(
      {
        href: '/dashboard/campaigns/automatic',
        label: 'Otomatik Kampanyalar',
        icon: Boxes,
      },
      {
        href: '/dashboard/campaigns/coupons',
        label: 'Kuponlar',
        icon: ClipboardList,
      },
    );
  }

  if (manifest.sellerSectionAccess.subscription) {
    items.push({
      href: '/dashboard/subscription',
      label: 'Abonelik',
      icon: CreditCard,
    });
  }

  if (manifest.sellerSectionAccess.settings) {
    items.push({ href: '/dashboard/settings', label: 'Ayarlar', icon: Settings });
  }

  if (manifest.posPanelEnabled) {
    items.push({ href: '/pos', label: 'POS', icon: CreditCard });
  }

  return dedupeSections([
    {
      title: 'Paneller',
      items: [
        ...getBackofficePanelEntries(manifest).map((entry) => ({
          href: entry.href,
          label: entry.label,
          icon: entry.icon,
        })),
        { href: '/account/profile', label: 'Hesap Merkezi', icon: User },
      ],
    },
    {
      title: 'Operasyon',
      collapsible: true,
      icon: Store,
      items,
    },
  ]);
};

export const canAccessPanelKey = (
  manifest: PanelAccessManifest,
  panel: PanelKey,
) => manifest.visiblePanels.some((entry) => entry.key === panel);

export const canAccessAdminRoute = (manifest: PanelAccessManifest) =>
  manifest.adminPanelEnabled;

export const canAccessPosRoute = (manifest: PanelAccessManifest) =>
  manifest.posPanelEnabled;

export const canAccessSellerPath = (
  manifest: PanelAccessManifest,
  pathname: string,
) => {
  if (!manifest.sellerPanelEnabled) return false;
  if (manifest.role !== 'SELLER_STAFF') return true;

  if (pathname === '/dashboard') {
    return manifest.sellerSectionAccess.overview;
  }
  if (pathname.startsWith('/dashboard/orders')) {
    return manifest.sellerSectionAccess.orders;
  }
  if (pathname.startsWith('/dashboard/products') || pathname.startsWith('/dashboard/inventory')) {
    return manifest.sellerSectionAccess.products;
  }
  if (pathname.startsWith('/dashboard/customers')) {
    return manifest.sellerSectionAccess.customers;
  }
  if (pathname.startsWith('/dashboard/finance')) {
    return manifest.sellerSectionAccess.finance;
  }
  if (pathname.startsWith('/dashboard/reports')) {
    return manifest.sellerSectionAccess.reports;
  }
  if (pathname.startsWith('/dashboard/campaigns')) {
    return manifest.sellerSectionAccess.campaigns;
  }
  if (pathname.startsWith('/dashboard/subscription')) {
    return manifest.sellerSectionAccess.subscription;
  }
  if (pathname.startsWith('/dashboard/settings')) {
    return manifest.sellerSectionAccess.settings;
  }

  return false;
};

export const resolveSellerRouteFallback = (manifest: PanelAccessManifest) => {
  if (manifest.sellerPanelEnabled) {
    return resolveSellerPanelHref(manifest.sellerSectionAccess);
  }
  if (manifest.posPanelEnabled) return '/pos';
  return '/forbidden';
};

export const getRoleFeaturePreset = (role?: string | null) => {
  const normalized = normalizeRole(role);
  if (!normalized) return null;
  return ROLE_FEATURE_PRESETS[normalized];
};
