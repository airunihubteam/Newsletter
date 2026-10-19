import type { Metadata } from "next";
import { ArchivePage } from "@/components/newsletter/archive-page";
import { loadIssues } from "@/lib/newsletter/load";
import { siteOrigin } from "@/lib/newsletter/site";

const description =
  "ארכיון הגיליונות של הניוזלטר השבועי של מדור החדשנות וה-AI, מועדון היזמות באוניברסיטת רייכמן.";

export const metadata: Metadata = {
  title: { absolute: "ניוזלטר מדור החדשנות וה-AI · מועדון היזמות רייכמן" },
  description,
  alternates: { canonical: `${siteOrigin()}/` },
  openGraph: {
    title: "ניוזלטר מדור החדשנות וה-AI",
    description,
    locale: "he_IL",
    images: [{ url: "/newsletter/hero-building-1600.webp" }],
  },
};

export default async function HomePage() {
  const issues = await loadIssues();
  return <ArchivePage issues={issues} />;
}
