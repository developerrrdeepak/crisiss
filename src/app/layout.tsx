import type { Metadata, Viewport } from "next"; // Added Viewport
import { Inter, Space_Grotesk, Outfit, Sora } from "next/font/google";
import { ConnectivityBanner } from "@/components/ConnectivityBanner";
import { PWAUpdater } from "@/components/PWAUpdater";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

function getPublicRuntimeConfigScript() {
  const publicRuntimeConfig = {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env["FIREBASE_PUBLIC_API_KEY"] || process.env["NEXT_PUBLIC_FIREBASE_API_KEY"],
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env["FIREBASE_PUBLIC_AUTH_DOMAIN"] || process.env["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"],
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env["FIREBASE_PUBLIC_PROJECT_ID"] || process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"],
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env["FIREBASE_PUBLIC_STORAGE_BUCKET"] || process.env["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"],
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env["FIREBASE_PUBLIC_MESSAGING_SENDER_ID"] || process.env["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"],
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env["FIREBASE_PUBLIC_APP_ID"] || process.env["NEXT_PUBLIC_FIREBASE_APP_ID"],
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env["FIREBASE_PUBLIC_MEASUREMENT_ID"] || process.env["NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"],
  };

  return `window.__AEGIS_PUBLIC_ENV__ = ${JSON.stringify(publicRuntimeConfig).replace(/</g, "\\u003c")};`;
}

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

// 1. ADD MANIFEST HERE
export const metadata: Metadata = {
  title: "AEGIS AI | Tactical Response Platform",
  description: "Aegis AI — AI-powered hotel security & emergency response platform.",
  manifest: "/manifest.json", // Tells the browser where the PWA file is
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AEGIS AI",
  },
};

// 2. ADD VIEWPORT FOR THEME COLOR (Standard for Next.js 14/15)
export const viewport: Viewport = {
  themeColor: "#bc000a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Manual link for safety */}
        <link rel="manifest" href="/manifest.json" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: getPublicRuntimeConfigScript() }} />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${outfit.variable} ${sora.variable} antialiased font-sans dark`}>
        <ThemeProvider>
          <div className="theme-transition">
            {children}
            <ConnectivityBanner />
            <PWAUpdater />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
