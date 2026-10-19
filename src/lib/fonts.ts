import { Geist, Noto_Sans_Hebrew } from "next/font/google";

export const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const notoHebrew = Noto_Sans_Hebrew({
  variable: "--font-noto-hebrew",
  subsets: ["hebrew", "latin"],
  weight: ["200", "300", "400", "600", "700"],
  display: "swap",
});
