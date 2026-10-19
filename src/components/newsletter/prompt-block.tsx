"use client";

import { useState, type ReactNode } from "react";

function fillMarks(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\[([^\]\n]{1,60})\]/g;
  let last = 0;
  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    nodes.push(
      <mark className="fill" key={index}>
        {match[0]}
      </mark>,
    );
    last = index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function copyWithFallback(text: string) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("copy failed");
}

async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      copyWithFallback(text);
      return;
    }
  }
  copyWithFallback(text);
}

export function PromptBlock({
  text,
  label,
  variant,
}: {
  text: string;
  label?: string;
  variant: "is-main" | "is-inline";
}) {
  const [done, setDone] = useState(false);

  async function onCopy() {
    try {
      await copyText(text);
      setDone(true);
      window.setTimeout(() => setDone(false), 1800);
    } catch {
      setDone(false);
    }
  }

  return (
    <div className={`prompt ${variant}`}>
      {label ? <p className="prompt-label">{label}</p> : null}
      <p className="prompt-text">{fillMarks(text)}</p>
      <button
        type="button"
        className={done ? "copy-btn is-done" : "copy-btn"}
        onClick={onCopy}
        aria-label="העתקת הטקסט"
      >
        {done ? "הועתק" : "העתקה"}
      </button>
    </div>
  );
}
