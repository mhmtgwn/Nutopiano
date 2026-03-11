import type { Metadata } from "next";
import Script from "next/script";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import AppChrome from "@/components/layout/AppChrome";

const earlyChunkRecoveryScript = `
(() => {
  const KEY = '__nutopiano_early_chunk_reload_once__';
  const TTL_MS = 30000;

  const getOnceFlag = () => {
    try {
      return window.sessionStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  };

  const setOnceFlag = () => {
    try {
      window.sessionStorage.setItem(KEY, '1');
    } catch {
      // no-op
    }
  };

  const clearOnceFlagLater = () => {
    window.setTimeout(() => {
      try {
        window.sessionStorage.removeItem(KEY);
      } catch {
        // no-op
      }
    }, TTL_MS);
  };

  const isChunkErrorText = (value) => {
    const text = String(value || '').toLowerCase();
    return (
      text.includes('chunkloaderror') ||
      text.includes('loading chunk') ||
      text.includes('failed to fetch dynamically imported module')
    );
  };

  const reloadOnce = () => {
    if (getOnceFlag()) return;
    setOnceFlag();
    window.location.reload();
  };

  window.addEventListener('error', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLScriptElement)) return;
    const src = target.src || '';
    if (!src.includes('/_next/static/chunks/')) return;
    reloadOnce();
  }, true);

  window.addEventListener('error', (event) => {
    if (isChunkErrorText(event.message) || isChunkErrorText(event.filename)) {
      reloadOnce();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message =
      reason && typeof reason === 'object' && 'message' in reason
        ? reason.message
        : reason;
    if (isChunkErrorText(message)) {
      reloadOnce();
    }
  });

  clearOnceFlagLater();
})();
`;

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Nutopiano Store",
  description: "Profesyonel e-ticaret uygulaması",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${playfairDisplay.variable} ${sourceSans.variable} antialiased`}
      >
        <Script id="early-chunk-recovery" strategy="beforeInteractive">
          {earlyChunkRecoveryScript}
        </Script>
        <Providers>
          <AppChrome>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}
