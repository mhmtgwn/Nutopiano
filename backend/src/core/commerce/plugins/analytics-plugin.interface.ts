import { CommercePlugin } from './plugin.interface';

export abstract class AnalyticsPlugin extends CommercePlugin {
  readonly kind = 'analytics' as const;

  abstract track(params: {
    event: string;
    businessId: number;
    entityId?: number | string | null;
    payload?: Record<string, unknown>;
  }): Promise<void>;
}
