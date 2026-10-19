import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IssuePage } from "@/components/newsletter/issue-page";
import { loadIssues } from "@/lib/newsletter/load";
import { issueMetadata } from "@/lib/newsletter/metadata";
import { issuePath } from "@/lib/newsletter/site";

export async function generateStaticParams() {
  const issues = await loadIssues();
  return issues.map((issue) => ({ slug: issue.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const issues = await loadIssues();
  const issue = issues.find((item) => item.slug === slug);
  if (!issue) return { title: "גיליון" };
  return issueMetadata(issue, issuePath(issue.slug));
}

export default async function NewsletterIssuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const issues = await loadIssues();
  const issue = issues.find((item) => item.slug === slug);
  if (!issue) notFound();
  return <IssuePage issue={issue} issues={issues} canonicalPath={issuePath(issue.slug)} />;
}
