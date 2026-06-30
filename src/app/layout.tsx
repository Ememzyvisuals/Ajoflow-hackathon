import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://ajoflow.com"),
  title: {
    default: "AjoFlow – Modern Cooperative Finance for Africa",
    template: "%s | AjoFlow",
  },
  description:
    "AjoFlow modernizes traditional Ajo and Esusu savings with digital payments, AI-powered trust scores, and community collaboration. Powered by Nomba.",
  keywords: [
    "Ajo", "Esusu", "Cooperative Savings", "Digital Cooperative",
    "Contribution Platform", "Savings Group", "African Fintech",
    "Nigeria", "Group Savings", "Thrift Contribution",
  ],
  authors: [{ name: "AjoFlow" }],
  creator: "AjoFlow",
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://ajoflow.com",
    siteName: "AjoFlow",
    title: "AjoFlow – Modern Cooperative Finance for Africa",
    description:
      "Manage Ajo, Esusu & cooperative savings digitally. Automated payments, AI trust scores, community tools.",
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AjoFlow",
  },
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
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
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
