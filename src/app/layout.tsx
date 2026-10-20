import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { geist, notoHebrew } from "@/lib/fonts";
import { siteOrigin } from "@/lib/newsletter/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: {
    default: "ניוזלטר מדור החדשנות וה-AI",
    template: "%s | Reichman Entrepreneurship Club",
  },
  description: "הניוזלטר השבועי של מדור החדשנות וה-AI, מועדון היזמות באוניברסיטת רייכמן.",
  icons: { icon: "/newsletter/logo.png" },
};

export const viewport: Viewport = {
  themeColor: "#0F2D96",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${geist.variable} ${notoHebrew.variable} ${notoHebrew.className} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
      </body>
    </html>
  );
}
