import type { Metadata } from "next";
import { siteOrigin } from "@/lib/newsletter/site";
import type { Issue } from "@/lib/newsletter/types";

export function issueMetadata(issue: Issue, path: string): Metadata {
  const origin = siteOrigin();
  const title = `גיליון #${issue.number}: ${issue.title}`;
  const url = `${origin}${path}`;
  return {
    title: { absolute: title },
    description: issue.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      locale: "he_IL",
      siteName: "מועדון היזמות · מדור החדשנות וה-AI",
      title,
      description: issue.description,
      url,
      images: [{ url: "/newsletter/hero-building-1600.webp", alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      images: ["/newsletter/hero-building-1600.webp"],
    },
  };
}
