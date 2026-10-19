"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import { parseRecipientCsv } from "@/lib/mailing/csv";
import { renderEmail } from "@/lib/mailing/render";
import { sendCampaignAction, type SendFormState } from "@/app/send/actions";

const fieldClass =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-brand";

export function SendForm() {
  const [state, action, pending] = useActionState<SendFormState, FormData>(
    sendCampaignAction,
    null,
  );
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("<p>Hello {{firstName|there}},</p>\n<p></p>");
  const [csvText, setCsvText] = useState("");

  const parsed = useMemo(() => (csvText ? parseRecipientCsv(csvText) : null), [csvText]);
  const previewHtml = useMemo(() => {
    const sample = parsed?.recipients[0];
    const body = renderEmail(html, sample?.firstName ?? null);
    const csp =
      "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'; img-src https: data:;\">";
    if (/<head[\s>]/i.test(body)) return body.replace(/<head([\s>])/i, `<head$1${csp}`);
    return body.replace(/<html([^>]*)>/i, `<html$1><head>${csp}</head>`);
  }, [html, parsed]);

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => {
          action(data);
        });
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Send secret
        <input
          name="secret"
          type="password"
          autoComplete="current-password"
          required
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Subject
        <input
          name="subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          required
          maxLength={200}
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        HTML body
        <textarea
          name="html"
          value={html}
          onChange={(event) => setHtml(event.target.value)}
          required
          rows={12}
          spellCheck={false}
          className={`${fieldClass} font-mono`}
        />
        <span className="font-normal text-muted">
          Use {"{{firstName}}"} or {"{{firstName|there}}"}. Names are escaped. A footer with an
          unsubscribe reply line is added automatically.
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Recipients CSV
        <input
          name="csv"
          type="file"
          accept=".csv,text/csv,text/plain"
          required
          className="text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              setCsvText("");
              return;
            }
            void file.text().then(setCsvText);
          }}
        />
        <span className="font-normal text-muted">
          Header row optional. Columns: <code>email</code> and optionally <code>firstName</code>.
          Up to 500 addresses. The file is not saved.
        </span>
      </label>

      {parsed ? (
        <p className="text-sm text-muted">
          {parsed.recipients.length} valid
          {parsed.duplicateCount > 0 ? `, ${parsed.duplicateCount} duplicates` : ""}
          {parsed.invalid.length > 0 ? `, ${parsed.invalid.length} invalid` : ""}
          {parsed.truncated ? ". Only the first 500 will be sent." : "."}
        </p>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Preview</h2>
        <iframe
          title="Email preview"
          sandbox=""
          srcDoc={previewHtml}
          className="h-80 w-full rounded-lg border border-black/15 bg-white"
        />
      </section>

      {state ? (
        <div
          role="status"
          className={`rounded-lg px-4 py-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}
        >
          <p>{state.message}</p>
          {state.invalid.length > 0 ? (
            <p className="mt-1">Skipped invalid rows: {state.invalid.join(", ")}</p>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
