import type { NextConfig } from "next";
import path from 'path';
import { withSentryConfig } from '@sentry/nextjs';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  outputFileTracingRoot: path.join(__dirname, '..'),
  ...(process.env.NODE_ENV === 'development'
    ? {
        turbopack: {
          root: path.join(__dirname, '..'),
        },
      }
    : {}),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.nutopiano.com',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'fastly.picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        pathname: '/uploads/**',
      },
    ],
  },
  async headers() {
    const noStoreHeaders = [
      {
        key: 'Cache-Control',
        value: 'no-store, must-revalidate, no-cache, max-age=0, private',
      },
    ];

    return [
      { source: '/', headers: noStoreHeaders },
      { source: '/login', headers: noStoreHeaders },
      { source: '/admin', headers: noStoreHeaders },
      { source: '/admin/:path*', headers: noStoreHeaders },
      { source: '/account/:path*', headers: noStoreHeaders },
      { source: '/dashboard/:path*', headers: noStoreHeaders },
      { source: '/platform/:path*', headers: noStoreHeaders },
      { source: '/seller/:path*', headers: noStoreHeaders },
      { source: '/pos', headers: noStoreHeaders },
      { source: '/pos/:path*', headers: noStoreHeaders },
      { source: '/panel', headers: noStoreHeaders },
      { source: '/panel/:path*', headers: noStoreHeaders },
    ];
  },
};

const sentryConfig = withSentryConfig(nextConfig, {
  silent: true,
});

export default withBundleAnalyzer(sentryConfig);
