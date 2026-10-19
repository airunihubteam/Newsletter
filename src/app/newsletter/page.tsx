import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Newsletter",
  description: "Newsletter pages from the Reichman Entrepreneurship Club.",
};

export default function NewsletterPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← Home
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Newsletter</h1>
        <p className="text-muted">
          Each issue is a page on this site. Publish the page, then share the link on WhatsApp.
          There is no mailing list here.
        </p>
      </header>
      <section className="rounded-xl border border-dashed border-black/15 p-10 text-center text-muted">
        No issues published yet.
      </section>
    </main>
  );
}
