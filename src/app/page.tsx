import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-24">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-brand">Reichman University</p>
        <h1 className="text-4xl font-bold tracking-tight">Entrepreneurship Club</h1>
        <p className="text-lg text-muted">
          Club pages and one-off campaign email. Newsletter issues are ordinary pages you share
          on WhatsApp.
        </p>
      </div>
      <nav className="flex gap-3">
        <Link
          href="/newsletter"
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Newsletter
        </Link>
        <Link
          href="/send"
          className="rounded-lg border border-black/15 px-5 py-2.5 text-sm font-medium hover:bg-black/5"
        >
          Send a campaign
        </Link>
      </nav>
    </main>
  );
}
