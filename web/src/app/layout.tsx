import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Somanadh K — Forward Deployed AI Engineer Intern",
    template: "%s — Somanadh K",
  },
  description:
    "Portfolio of Somanadh K, a Computer Science student and Forward Deployed AI Engineer Intern building AI applications, backend systems, agentic workflows, and retrieval-augmented generation.",
  keywords: [
    "Somanadh K",
    "AI engineer intern",
    "FastAPI developer",
    "RAG systems",
    "AI agent orchestration",
    "backend engineer",
    "Python developer",
    "forward deployed AI engineer",
  ],
  authors: [{ name: "Somanadh K", url: siteUrl }],
  creator: "Somanadh K",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: "SOMANADH.OS",
    title: "Somanadh K — Building intelligent systems",
    description:
      "AI engineer intern working on intelligent applications, backend systems, AI agents, and retrieval-augmented generation. Enter the living portfolio.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Somanadh K — Building intelligent systems",
    description:
      "AI engineering intern · backend · agentic workflows · retrieval-augmented generation.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: "#08090D",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${space.variable} ${inter.variable} ${jetbrains.variable} ${instrument.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
