import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "MADI · Easy-read Translator",
  description: "Translate anything with romanization, suggested replies, and vocabulary",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MADI",
  },
  icons: {
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#111112",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#111112" }}>
        {children}
      </body>
    </html>
  );
}
