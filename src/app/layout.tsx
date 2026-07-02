import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://ajoflow.vercel.app"),
  title: {
    default: "AjoFlow – Modern Cooperative Finance for Africa",
    template: "%s | AjoFlow",
  },
  description:
    "AjoFlow modernizes traditional Ajo and Esusu savings with digital payments, AI-powered trust scores, and community collaboration. Powered by Nomba.",
  keywords: [
    "Ajo", "Esusu", "Cooperative Savings", "Digital Cooperative",
    "Contribution Platform", "Savings Group", "African Fintech", "Nigeria",
  ],
  authors: [{ name: "AjoFlow" }],
  creator: "AjoFlow",
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://ajoflow.vercel.app",
    siteName: "AjoFlow",
    title: "AjoFlow – Modern Cooperative Finance for Africa",
    description: "Manage Ajo, Esusu & cooperative savings digitally. Automated payments, AI trust scores, community tools.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "AjoFlow Dashboard" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AjoFlow – Modern Cooperative Finance",
    description: "Digital Ajo, Esusu & cooperative savings for Africa",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "AjoFlow" },

  // ── Google Site Verification ──────────────────────────────────
  // Add your code from Google Search Console here:
  // verification: { google: "YOUR_GOOGLE_SITE_VERIFICATION_CODE" },
  // e.g. verification: { google: "abc123xyz456" }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0F6B4B",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/icon-32x32.png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/*
          ── Google Search Console Verification (alternative method) ──
          If you prefer the meta tag method instead of the metadata API above,
          paste your <meta name="google-site-verification" content="..."> tag here.
          Get it from: Google Search Console → Add Property → HTML tag method
        */}
      </head>
      <body className="min-h-screen bg-background antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
