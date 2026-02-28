/**
 * Nutopiano — Granüler yetki enum'u
 * Kaynak: rol-yetki-matrisi.md §2.1
 */
export enum Permission {
    // ─── Kullanıcı Yönetimi ───
    USERS_VIEW = 'users.view',
    USERS_CREATE = 'users.create',
    USERS_EDIT = 'users.edit',
    USERS_DELETE = 'users.delete',
    USERS_ROLE_ASSIGN = 'users.role.assign',
    USERS_ACTIVATE = 'users.activate',
    USERS_2FA_MANAGE = 'users.2fa.manage',
    USERS_IMPERSONATE = 'users.impersonate',

    // ─── Satıcı Yönetimi ───
    SELLERS_VIEW = 'sellers.view',
    SELLERS_CREATE = 'sellers.create',
    SELLERS_EDIT = 'sellers.edit',
    SELLERS_ACTIVATE = 'sellers.activate',
    SELLERS_APPLICATIONS_VIEW = 'sellers.applications.view',
    SELLERS_APPLICATIONS_APPROVE = 'sellers.applications.approve',
    SELLERS_TEAM_VIEW = 'sellers.team.view',
    SELLERS_TEAM_MANAGE = 'sellers.team.manage',
    SELLERS_IMPERSONATE = 'sellers.impersonate',

    // ─── Ürün Yönetimi ───
    PRODUCTS_VIEW = 'products.view',
    PRODUCTS_CREATE = 'products.create',
    PRODUCTS_EDIT = 'products.edit',
    PRODUCTS_DELETE = 'products.delete',
    PRODUCTS_PUBLISH = 'products.publish',
    PRODUCTS_STOCK = 'products.stock',
    PRODUCTS_FORCE_PUBLISH = 'products.force_publish',
    PRODUCTS_FORCE_STOCK = 'products.force_stock',
    PRODUCTS_IMPORT = 'products.import',
    PRODUCTS_ARCHIVE = 'products.archive',

    // ─── Kategori Yönetimi ───
    CATEGORIES_VIEW = 'categories.view',
    CATEGORIES_CREATE = 'categories.create',
    CATEGORIES_EDIT = 'categories.edit',
    CATEGORIES_DELETE = 'categories.delete',
    CATEGORIES_REORDER = 'categories.reorder',

    // ─── Sipariş Yönetimi ───
    ORDERS_VIEW = 'orders.view',
    ORDERS_VIEW_ALL = 'orders.view_all',
    ORDERS_CREATE = 'orders.create',
    ORDERS_EDIT = 'orders.edit',
    ORDERS_STATUS_UPDATE = 'orders.status_update',
    ORDERS_CANCEL = 'orders.cancel',
    ORDERS_RETURN_PROCESS = 'orders.return.process',

    // ─── Müşteri Yönetimi ───
    CUSTOMERS_VIEW = 'customers.view',
    CUSTOMERS_CREATE = 'customers.create',
    CUSTOMERS_EDIT = 'customers.edit',
    CUSTOMERS_DELETE = 'customers.delete',
    CUSTOMERS_CREDIT_MANAGE = 'customers.credit.manage',

    // ─── Finans ───
    FINANCE_VIEW = 'finance.view',
    FINANCE_LEDGER_VIEW = 'finance.ledger.view',
    FINANCE_WALLETS_VIEW = 'finance.wallets.view',
    FINANCE_PAYOUT_VIEW = 'finance.payout.view',
    FINANCE_PAYOUT_APPROVE = 'finance.payout.approve',
    FINANCE_PAYOUT_REJECT = 'finance.payout.reject',
    FINANCE_REFUND_PROCESS = 'finance.refund.process',
    FINANCE_MANUAL_ADJUSTMENT = 'finance.manual_adjustment',
    FINANCE_COMMISSION_CONFIGURE = 'finance.commission.configure',
    FINANCE_TAX_CONFIGURE = 'finance.tax.configure',
    FINANCE_REPORT_EXPORT = 'finance.report.export',

    // ─── POS ───
    POS_SALES = 'pos.sales',
    POS_ORDERS = 'pos.orders',
    POS_REPORTS = 'pos.reports',
    POS_REGISTER_OPEN = 'pos.register.open',
    POS_REGISTER_CLOSE = 'pos.register.close',
    POS_RETURN = 'pos.return',
    POS_DISCOUNT = 'pos.discount',
    POS_OVERRIDE_PRICE = 'pos.override_price',
    POS_CASH_DRAWER = 'pos.cash_drawer',
    POS_REFUND_WITHOUT_MANAGER = 'pos.refund_without_manager',
    POS_VIEW_MARGIN = 'pos.view_margin',

    // ─── Raporlar ───
    REPORTS_VIEW = 'reports.view',
    REPORTS_EXPORT = 'reports.export',

    // ─── Sistem Ayarları ───
    SETTINGS_VIEW = 'settings.view',
    SETTINGS_EDIT = 'settings.edit',
    SETTINGS_SMTP = 'settings.smtp',
    SETTINGS_SMS = 'settings.sms',
    SETTINGS_PLANS = 'settings.plans',
    SETTINGS_FEATURE_FLAGS = 'settings.feature_flags',
    SETTINGS_API_KEYS = 'settings.api_keys',

    // ─── Denetim ───
    AUDIT_VIEW = 'audit.view',
    AUDIT_EXPORT = 'audit.export',
    OUTBOX_VIEW = 'outbox.view',
    OUTBOX_RETRY = 'outbox.retry',

    // ─── Destek / Impersonation ───
    SUPPORT_IMPERSONATE = 'support.impersonate',
    SUPPORT_PII_VIEW = 'support.pii_view',

    // ─── Toplu İşlemler ───
    BULK_PRODUCTS = 'bulk.products',
    BULK_ORDERS = 'bulk.orders',
    BULK_USERS = 'bulk.users',
}

/**
 * Permission grupları — kategori bazlı gruplama
 */
export const PERMISSION_GROUPS = {
    USER_MANAGEMENT: [
        Permission.USERS_VIEW, Permission.USERS_CREATE, Permission.USERS_EDIT,
        Permission.USERS_DELETE, Permission.USERS_ROLE_ASSIGN, Permission.USERS_ACTIVATE,
        Permission.USERS_2FA_MANAGE, Permission.USERS_IMPERSONATE,
    ],
    SELLER_MANAGEMENT: [
        Permission.SELLERS_VIEW, Permission.SELLERS_CREATE, Permission.SELLERS_EDIT,
        Permission.SELLERS_ACTIVATE, Permission.SELLERS_APPLICATIONS_VIEW,
        Permission.SELLERS_APPLICATIONS_APPROVE, Permission.SELLERS_TEAM_VIEW,
        Permission.SELLERS_TEAM_MANAGE, Permission.SELLERS_IMPERSONATE,
    ],
    PRODUCT_MANAGEMENT: [
        Permission.PRODUCTS_VIEW, Permission.PRODUCTS_CREATE, Permission.PRODUCTS_EDIT,
        Permission.PRODUCTS_DELETE, Permission.PRODUCTS_PUBLISH, Permission.PRODUCTS_STOCK,
        Permission.PRODUCTS_FORCE_PUBLISH, Permission.PRODUCTS_FORCE_STOCK,
        Permission.PRODUCTS_IMPORT, Permission.PRODUCTS_ARCHIVE,
    ],
    CATEGORY_MANAGEMENT: [
        Permission.CATEGORIES_VIEW, Permission.CATEGORIES_CREATE, Permission.CATEGORIES_EDIT,
        Permission.CATEGORIES_DELETE, Permission.CATEGORIES_REORDER,
    ],
    ORDER_MANAGEMENT: [
        Permission.ORDERS_VIEW, Permission.ORDERS_VIEW_ALL, Permission.ORDERS_CREATE,
        Permission.ORDERS_EDIT, Permission.ORDERS_STATUS_UPDATE, Permission.ORDERS_CANCEL,
        Permission.ORDERS_RETURN_PROCESS,
    ],
    CUSTOMER_MANAGEMENT: [
        Permission.CUSTOMERS_VIEW, Permission.CUSTOMERS_CREATE, Permission.CUSTOMERS_EDIT,
        Permission.CUSTOMERS_DELETE, Permission.CUSTOMERS_CREDIT_MANAGE,
    ],
    FINANCE: [
        Permission.FINANCE_VIEW, Permission.FINANCE_LEDGER_VIEW, Permission.FINANCE_WALLETS_VIEW,
        Permission.FINANCE_PAYOUT_VIEW, Permission.FINANCE_PAYOUT_APPROVE,
        Permission.FINANCE_PAYOUT_REJECT, Permission.FINANCE_REFUND_PROCESS,
        Permission.FINANCE_MANUAL_ADJUSTMENT, Permission.FINANCE_COMMISSION_CONFIGURE,
        Permission.FINANCE_TAX_CONFIGURE, Permission.FINANCE_REPORT_EXPORT,
    ],
    POS: [
        Permission.POS_SALES, Permission.POS_ORDERS, Permission.POS_REPORTS,
        Permission.POS_REGISTER_OPEN, Permission.POS_REGISTER_CLOSE, Permission.POS_RETURN,
        Permission.POS_DISCOUNT, Permission.POS_OVERRIDE_PRICE, Permission.POS_CASH_DRAWER,
        Permission.POS_REFUND_WITHOUT_MANAGER, Permission.POS_VIEW_MARGIN,
    ],
    REPORTS: [Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT],
    SETTINGS: [
        Permission.SETTINGS_VIEW, Permission.SETTINGS_EDIT, Permission.SETTINGS_SMTP,
        Permission.SETTINGS_SMS, Permission.SETTINGS_PLANS, Permission.SETTINGS_FEATURE_FLAGS,
        Permission.SETTINGS_API_KEYS,
    ],
    AUDIT: [
        Permission.AUDIT_VIEW, Permission.AUDIT_EXPORT,
        Permission.OUTBOX_VIEW, Permission.OUTBOX_RETRY,
    ],
    SUPPORT: [Permission.SUPPORT_IMPERSONATE, Permission.SUPPORT_PII_VIEW],
    BULK: [Permission.BULK_PRODUCTS, Permission.BULK_ORDERS, Permission.BULK_USERS],
} as const;

/**
 * Rol bazlı varsayılan yetkiler
 * Kaynak: rol-yetki-matrisi.md §3
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
    SUPER_ADMIN: Object.values(Permission), // Tüm yetkiler

    ADMIN: [
        // Kullanıcı yönetimi (rol atama ve impersonation hariç)
        Permission.USERS_VIEW, Permission.USERS_CREATE, Permission.USERS_EDIT,
        Permission.USERS_DELETE, Permission.USERS_ACTIVATE, Permission.USERS_2FA_MANAGE,
        // Satıcı yönetimi (tümü)
        ...PERMISSION_GROUPS.SELLER_MANAGEMENT,
        // Ürün, kategori, sipariş, müşteri (tümü)
        ...PERMISSION_GROUPS.PRODUCT_MANAGEMENT,
        ...PERMISSION_GROUPS.CATEGORY_MANAGEMENT,
        ...PERMISSION_GROUPS.ORDER_MANAGEMENT,
        ...PERMISSION_GROUPS.CUSTOMER_MANAGEMENT,
        // Finans (commission/tax configure hariç)
        Permission.FINANCE_VIEW, Permission.FINANCE_LEDGER_VIEW, Permission.FINANCE_WALLETS_VIEW,
        Permission.FINANCE_PAYOUT_VIEW, Permission.FINANCE_PAYOUT_APPROVE,
        Permission.FINANCE_PAYOUT_REJECT, Permission.FINANCE_REFUND_PROCESS,
        Permission.FINANCE_MANUAL_ADJUSTMENT, Permission.FINANCE_REPORT_EXPORT,
        // POS (tümü)
        ...PERMISSION_GROUPS.POS,
        // Raporlar (tümü)
        ...PERMISSION_GROUPS.REPORTS,
        // Ayarlar (feature_flags ve api_keys hariç)
        Permission.SETTINGS_VIEW, Permission.SETTINGS_EDIT, Permission.SETTINGS_SMTP,
        Permission.SETTINGS_SMS, Permission.SETTINGS_PLANS,
        // Denetim (tümü)
        ...PERMISSION_GROUPS.AUDIT,
        // Destek
        Permission.SUPPORT_IMPERSONATE, Permission.SUPPORT_PII_VIEW,
        // Toplu işlem (tümü)
        ...PERMISSION_GROUPS.BULK,
    ],

    SELLER: [
        // Kendi ekibi
        Permission.SELLERS_TEAM_VIEW, Permission.SELLERS_TEAM_MANAGE,
        // Ürünler (force_publish ve force_stock hariç)
        Permission.PRODUCTS_VIEW, Permission.PRODUCTS_CREATE, Permission.PRODUCTS_EDIT,
        Permission.PRODUCTS_DELETE, Permission.PRODUCTS_PUBLISH, Permission.PRODUCTS_STOCK,
        Permission.PRODUCTS_IMPORT, Permission.PRODUCTS_ARCHIVE,
        // Kategoriler (sadece görüntüleme)
        Permission.CATEGORIES_VIEW,
        // Siparişler (view_all hariç)
        Permission.ORDERS_VIEW, Permission.ORDERS_CREATE, Permission.ORDERS_EDIT,
        Permission.ORDERS_STATUS_UPDATE, Permission.ORDERS_CANCEL, Permission.ORDERS_RETURN_PROCESS,
        // Müşteriler (delete hariç)
        Permission.CUSTOMERS_VIEW, Permission.CUSTOMERS_CREATE, Permission.CUSTOMERS_EDIT,
        Permission.CUSTOMERS_CREDIT_MANAGE,
        // Finans (kendi cüzdanı)
        Permission.FINANCE_VIEW, Permission.FINANCE_LEDGER_VIEW, Permission.FINANCE_WALLETS_VIEW,
        Permission.FINANCE_PAYOUT_VIEW, Permission.FINANCE_REFUND_PROCESS,
        Permission.FINANCE_REPORT_EXPORT,
        // POS (tam — refund_without_manager hariç)
        Permission.POS_SALES, Permission.POS_ORDERS, Permission.POS_REPORTS,
        Permission.POS_REGISTER_OPEN, Permission.POS_REGISTER_CLOSE, Permission.POS_RETURN,
        Permission.POS_DISCOUNT, Permission.POS_OVERRIDE_PRICE, Permission.POS_CASH_DRAWER,
        Permission.POS_VIEW_MARGIN,
        // Raporlar
        Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT,
        // Toplu işlem (sadece kendi ürünleri)
        Permission.BULK_PRODUCTS,
    ],

    // USER ve SELLER_STAFF: Varsayılan yetki yok, yetki grubu ile kontrol edilir
    USER: [],
    SELLER_STAFF: [],

    CUSTOMER: [],
};

/**
 * Preset yetki grupları — SELLER_STAFF için hazır tanımlar
 * Kaynak: rol-yetki-matrisi.md §4
 */
export const PRESET_PERMISSION_GROUPS = {
    POS_CASHIER: {
        name: 'POS Kasiyer',
        description: 'Temel POS satış yapma',
        permissions: [
            Permission.POS_SALES,
            Permission.POS_ORDERS,
            Permission.POS_REGISTER_OPEN,
            Permission.CUSTOMERS_VIEW,
            Permission.CUSTOMERS_CREATE,
            Permission.PRODUCTS_VIEW,
        ] as Permission[],
    },
    POS_SENIOR_CASHIER: {
        name: 'POS Şef Kasiyer',
        description: 'POS satış + iade + kasa kapatma',
        permissions: [
            Permission.POS_SALES,
            Permission.POS_ORDERS,
            Permission.POS_REGISTER_OPEN,
            Permission.POS_REGISTER_CLOSE,
            Permission.POS_RETURN,
            Permission.POS_DISCOUNT,
            Permission.POS_CASH_DRAWER,
            Permission.POS_REPORTS,
            Permission.CUSTOMERS_VIEW,
            Permission.CUSTOMERS_CREATE,
            Permission.CUSTOMERS_EDIT,
            Permission.PRODUCTS_VIEW,
            Permission.ORDERS_VIEW,
            Permission.ORDERS_STATUS_UPDATE,
        ] as Permission[],
    },
    POS_STORE_MANAGER: {
        name: 'POS Mağaza Müdürü',
        description: 'Tam POS + ürün düzenleme + finans görme',
        permissions: [
            Permission.POS_SALES,
            Permission.POS_ORDERS,
            Permission.POS_REGISTER_OPEN,
            Permission.POS_REGISTER_CLOSE,
            Permission.POS_RETURN,
            Permission.POS_DISCOUNT,
            Permission.POS_OVERRIDE_PRICE,
            Permission.POS_CASH_DRAWER,
            Permission.POS_REFUND_WITHOUT_MANAGER,
            Permission.POS_VIEW_MARGIN,
            Permission.POS_REPORTS,
            Permission.CUSTOMERS_VIEW,
            Permission.CUSTOMERS_CREATE,
            Permission.CUSTOMERS_EDIT,
            Permission.CUSTOMERS_CREDIT_MANAGE,
            Permission.PRODUCTS_VIEW,
            Permission.PRODUCTS_EDIT,
            Permission.PRODUCTS_STOCK,
            Permission.ORDERS_VIEW,
            Permission.ORDERS_STATUS_UPDATE,
            Permission.ORDERS_CANCEL,
            Permission.ORDERS_RETURN_PROCESS,
            Permission.FINANCE_VIEW,
            Permission.REPORTS_VIEW,
        ] as Permission[],
    },
    WAREHOUSE_STAFF: {
        name: 'Depo Personeli',
        description: 'Stok güncelleme ve sipariş durumu',
        permissions: [
            Permission.PRODUCTS_VIEW,
            Permission.PRODUCTS_STOCK,
            Permission.ORDERS_VIEW,
            Permission.ORDERS_STATUS_UPDATE,
        ] as Permission[],
    },
    FINANCE_STAFF: {
        name: 'Finans Personeli',
        description: 'Salt okunur finans erişimi',
        permissions: [
            Permission.FINANCE_VIEW,
            Permission.FINANCE_LEDGER_VIEW,
            Permission.FINANCE_WALLETS_VIEW,
            Permission.FINANCE_PAYOUT_VIEW,
            Permission.FINANCE_REPORT_EXPORT,
            Permission.ORDERS_VIEW,
            Permission.CUSTOMERS_VIEW,
            Permission.REPORTS_VIEW,
            Permission.REPORTS_EXPORT,
        ] as Permission[],
    },
    SUPPORT_STAFF: {
        name: 'Müşteri Hizmetleri',
        description: 'Sipariş ve müşteri desteği',
        permissions: [
            Permission.ORDERS_VIEW,
            Permission.ORDERS_STATUS_UPDATE,
            Permission.ORDERS_RETURN_PROCESS,
            Permission.CUSTOMERS_VIEW,
            Permission.CUSTOMERS_EDIT,
            Permission.CUSTOMERS_CREDIT_MANAGE,
        ] as Permission[],
    },
} as const;
