import type { Metadata } from "next";
import Script from "next/script";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Header from "@/components/Header";
import FooterBar from "@/components/layout/FooterBar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import ChunkErrorRecovery from "@/components/common/ChunkErrorRecovery";

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

  window.addEventListener('error', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLScriptElement)) return;
    const src = target.src || '';
    if (!src.includes('/_next/static/chunks/')) return;
    if (getOnceFlag()) return;
    setOnceFlag();
    window.location.reload();
  }, true);

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
          <ChunkErrorRecovery />
          <div className="app-shell flex min-h-screen flex-col text-foreground">
            <Header />
            <main className="app-main flex-1 pb-20 md:pb-0">
              <div className="app-content-frame">{children}</div>
            </main>
            <FooterBar />
            <MobileBottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}
