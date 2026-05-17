import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "@/components/Header";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://linkup-calling.vercel.app"),
  title: {
    default: "LinkUp - Privacy-First Video Calling & Chat",
    template: "%s | LinkUp",
  },
  description: "Secure, frictionless, and privacy-first video calling and real-time chat platform. No signups, no downloads. Start a secure room with just a link.",
  keywords: [
    "video call",
    "free video conference",
    "privacy-first video call",
    "secure WebRTC calling",
    "collaborative whiteboard room",
    "screen share tool",
    "zero friction video chat",
    "LinkUp"
  ],
  authors: [{ name: "Omkar Chavan", url: "https://github.com/omkarchavan1a" }],
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "LinkUp - Instant Video Calling & Collaborative Whiteboard",
    description: "Experience privacy-first video calling, real-time drawing whiteboards, file sharing, and host-lock controls. Zero accounts required.",
    url: "https://linkup-calling.vercel.app",
    siteName: "LinkUp",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkUp - Frictionless Video Calling & Chat",
    description: "Start a video call or drawing whiteboard instantly without signup or app installations.",
    creator: "@omkar_it_determination",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#6366f1",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let theme = localStorage.getItem('theme');
                if (!theme) {
                  theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative`}
      >
        <Header />
        {children}
      </body>
    </html>
  );
}
