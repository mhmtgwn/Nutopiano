import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
const tracesSampleRateRaw = Number(
  process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1,
);
const tracesSampleRate =
  Number.isFinite(tracesSampleRateRaw) &&
  tracesSampleRateRaw >= 0 &&
  tracesSampleRateRaw <= 1
    ? tracesSampleRateRaw
    : 0.1;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
