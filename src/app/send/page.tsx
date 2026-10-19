import type { Metadata } from "next";
import Link from "next/link";
import { SendForm } from "@/app/send/send-form";
import { geist } from "@/lib/fonts";

export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Send campaign",
  robots: { index: false, follow: false },
};

export default function SendPage() {
  return (
    <main
      dir="ltr"
      lang="en"
      className={`${geist.className} mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 bg-background px-6 py-16 text-foreground`}
    >
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← Home
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Send a campaign</h1>
        <p className="text-muted">
          Upload a CSV and send once. Addresses are not stored. Mail is sent from{" "}
          <code>newsletter@{process.env.RESEND_EMAIL_DOMAIN ?? "your verified domain"}</code>.
        </p>
      </header>
      <SendForm />
    </main>
  );
}
