export type CommercePluginKind =
  | 'payments'
  | 'shipping'
  | 'analytics'
  | 'marketplaces';

export abstract class CommercePlugin {
  abstract readonly kind: CommercePluginKind;
  abstract readonly key: string;
  abstract readonly version: string;

  abstract healthcheck(): Promise<{
    ok: boolean;
    message?: string | null;
  }>;
}
