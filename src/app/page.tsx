import type { Metadata } from "next";
import { IssuePage } from "@/components/newsletter/issue-page";
import { loadIssues } from "@/lib/newsletter/load";
import { issueMetadata } from "@/lib/newsletter/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const issues = await loadIssues();
  const issue = issues[0];
  if (!issue) {
    return { title: { absolute: "ניוזלטר מדור החדשנות וה-AI" } };
  }
  return issueMetadata(issue, "/");
}

export default async function HomePage() {
  const issues = await loadIssues();
  const issue = issues[0];
  if (!issue) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
        <h1 className="text-3xl font-bold">עוד אין גיליון</h1>
        <p>הגיליון הראשון יתפרסם כאן.</p>
      </main>
    );
  }
  return <IssuePage issue={issue} issues={issues} canonicalPath="/" />;
}
