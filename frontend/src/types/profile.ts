export type FeatureStatusCode = 'ACTIVE' | 'PLANNED' | 'BLOCKED';
export type PanelKey = 'ADMIN' | 'SELLER' | 'POS' | 'CUSTOMER';

export type FeatureStatusItem = {
  key: string;
  status: FeatureStatusCode;
  note?: string;
};

export type ProfileResponse = {
  userId: string;
  name?: string;
  phone?: string;
  email?: string;
  role: string;
  effectiveRole?: string;
  permissions?: string[];
  panelHome?: string;
  allowedPanels?: string[];
  featureStatuses?: FeatureStatusItem[];
  businessId?: string | null;
};
