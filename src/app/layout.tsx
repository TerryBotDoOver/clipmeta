import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Suspense } from "react";
import { UTMCapture } from "@/components/UTMCapture";
import MetaPixel from "@/components/MetaPixel";
import ClarityAnalytics from "@/components/ClarityAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ClipMeta — AI Metadata for Stock Footage",
    template: "%s | ClipMeta",
  },
  description:
    "ClipMeta uses AI to generate titles, descriptions, and keywords for stock footage clips. Export platform-ready CSVs for Blackbox.global, Shutterstock, Adobe Stock, and Pond5 in minutes.",
  keywords: [
    "stock footage metadata",
    "AI keywording",
    "Blackbox.global CSV",
    "stock video keywords",
    "metadata generator",
    "footage keywording tool",
    "Shutterstock CSV export",
    "Adobe Stock metadata",
    "Pond5 metadata",
    "stock footage keywords",
  ],
  metadataBase: new URL("https://clipmeta.app"),
  alternates: { canonical: "https://clipmeta.app" },
  openGraph: {
    title: "ClipMeta — AI Metadata for Stock Footage",
    description:
      "Upload clips, get AI-generated titles, descriptions, and keywords. Export platform-ready CSVs for Blackbox, Shutterstock, Adobe Stock, and Pond5.",
    url: "https://clipmeta.app",
    siteName: "ClipMeta",
    images: [
      {
        url: "/logo-full.png",
        width: 1200,
        height: 630,
        alt: "ClipMeta — AI Metadata for Stock Footage",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClipMeta — AI Metadata for Stock Footage",
    description:
      "Stop spending hours on metadata. Upload clips, let AI generate platform-ready keywords and titles, export CSV.",
    images: ["/logo-full.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: "/logo-icon.png",
    apple: "/logo-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Ads conversion tracking */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=AW-18071437581" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-18071437581');
            `,
          }}
        />
        {/* Reddit Pixel */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};p.callQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/pixel.js",t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);
              rdt('init','a2_it6x1qz99k3n');
              rdt('track', 'PageVisit');
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <MetaPixel />
        <ClarityAnalytics />
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Suspense fallback={null}>
          <UTMCapture />
        </Suspense>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
