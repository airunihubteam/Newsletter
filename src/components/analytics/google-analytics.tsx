"use client";

import { useEffect } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;
const PARAM_LIMIT = 100;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

type AnalyticsValue = string | number;
type AnalyticsParams = Record<string, AnalyticsValue>;

type Gtag = {
  (command: "js", date: Date): void;
  (command: "config", measurementId: string, params?: Record<string, unknown>): void;
  (command: "event", name: string, params?: Record<string, unknown>): void;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

function measurementId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!id || !MEASUREMENT_ID_PATTERN.test(id)) return null;
  return id;
}

function isExcludedPath(pathname: string): boolean {
  return pathname === "/send" || pathname.startsWith("/send/");
}

function isLocalHost(): boolean {
  return location.hostname === "localhost" || location.hostname === "127.0.0.1";
}

let gtagReady = false;
let lastPageView = "";

function installGtag(id: string) {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      // gtag.js reads the Arguments object. A rest-parameter array is dropped.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    } as unknown as Gtag;
  }
  if (gtagReady) return;
  window.gtag("js", new Date());
  window.gtag("config", id, {
    send_page_view: false,
    ...(isLocalHost() ? { debug_mode: true } : {}),
  });
  gtagReady = true;
}

function currentIssue(): string | null {
  const value = document.querySelector("[data-issue]")?.getAttribute("data-issue");
  if (!value || !/^\d{1,6}$/.test(value)) return null;
  return value;
}

function scrub(value: string, limit = PARAM_LIMIT): string {
  return value.replace(EMAIL_PATTERN, "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function sanitize(params: AnalyticsParams, issue: string | null): Record<string, AnalyticsValue> {
  const out: Record<string, AnalyticsValue> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "number") {
      if (!Number.isFinite(value)) continue;
      out[key] = value;
      continue;
    }
    const limit = key === "page_location" || key === "page_path" ? 1000 : PARAM_LIMIT;
    const text = scrub(value, limit);
    if (!text) continue;
    out[key] = text;
  }
  if (issue) out.issue_number = issue;
  return out;
}

function track(name: string, params: AnalyticsParams, issue: string | null = currentIssue()) {
  const id = measurementId();
  if (!id || isExcludedPath(window.location.pathname)) return;
  installGtag(id);
  window.gtag?.("event", name, sanitize(params, issue));
}

function visibleText(el: Element | null | undefined): string {
  if (!el) return "";
  const parts: string[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node.textContent?.replace(/\s+/g, " ").trim();
    if (text) parts.push(text);
    node = walker.nextNode();
  }
  return scrub(parts.join(" "));
}

function controlLabel(el: Element): string {
  if (el.matches("button.copy-btn")) {
    const promptLabel = visibleText(el.closest(".prompt")?.querySelector(".prompt-label"));
    if (promptLabel) return promptLabel;
  }
  if (el.matches("a.tl-register")) {
    const eventName = visibleText(el.closest(".tl-event")?.querySelector(".tl-name"));
    if (eventName) return eventName;
  }
  if (el.matches("a.archive-latest")) {
    const title = visibleText(el.querySelector("strong"));
    if (title) return title;
  }
  const archiveTitle = visibleText(el.querySelector(":scope > .archive-t"));
  if (archiveTitle) return archiveTitle;
  const aria = scrub(el.getAttribute("aria-label") ?? "");
  if (aria) return aria;
  return visibleText(el);
}

function withSection(el: Element, params: AnalyticsParams): AnalyticsParams {
  if (params.section !== undefined) return params;
  const section = el.closest("section[id]")?.id;
  if (section) params.section = section;
  return params;
}

function classifyClick(target: EventTarget | null): { name: string; params: AnalyticsParams } | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest("a[href], button");
  if (!el || el.classList.contains("skip")) return null;

  const buttonText = controlLabel(el);

  if (el.matches("button.copy-btn")) {
    return { name: "prompt_copy", params: withSection(el, { button_text: buttonText }) };
  }
  if (el.matches("button.video-play")) {
    return { name: "video_play", params: withSection(el, { button_text: buttonText }) };
  }
  if (el instanceof HTMLButtonElement) {
    return { name: "button_click", params: withSection(el, { button_text: buttonText }) };
  }
  if (!(el instanceof HTMLAnchorElement)) return null;

  if (el.classList.contains("tl-register")) {
    return { name: "cta_click", params: withSection(el, { cta: "register", button_text: buttonText }) };
  }

  let url: URL;
  try {
    url = new URL(el.href, location.origin);
  } catch {
    return null;
  }

  if (url.hostname === "wa.me" || url.hostname === "api.whatsapp.com") {
    return { name: "cta_click", params: withSection(el, { cta: "whatsapp", button_text: buttonText }) };
  }

  const rawHref = el.getAttribute("href") ?? "";
  if (rawHref.startsWith("#")) {
    const tocLabel = visibleText(el.querySelector(".toc-t"));
    return {
      name: "toc_click",
      params: { section: scrub(rawHref.slice(1)), button_text: tocLabel || buttonText },
    };
  }

  if (url.protocol === "mailto:" || url.protocol === "tel:") {
    const kind = url.protocol.slice(0, -1);
    return {
      name: "link_click",
      params: withSection(el, { link_text: buttonText, link_domain: kind, link_url: kind }),
    };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  if (url.origin !== location.origin) {
    return {
      name: "link_click",
      params: withSection(el, {
        link_text: buttonText,
        link_domain: url.hostname.replace(/^www\./, ""),
        link_url: url.pathname,
      }),
    };
  }

  return {
    name: "nav_click",
    params: withSection(el, { link_text: buttonText, link_url: url.pathname }),
  };
}

function watchIssueEngagement(issue: string | null) {
  const root = document.querySelector<HTMLElement>("[data-issue]");
  if (!root) return () => {};
  const sections = Array.from(root.querySelectorAll<HTMLElement>("section.section[id]"));
  if (!sections.length) return () => {};

  let disposed = false;
  const seen = new Set<string>();
  const thresholds = Array.from({ length: 21 }, (_, index) => index / 20);

  const viewObserver = new IntersectionObserver(
    (entries) => {
      if (disposed) return;
      for (const entry of entries) {
        const section = (entry.target as HTMLElement).id;
        if (seen.has(section) || !entry.isIntersecting) continue;
        const need = 0.5 * Math.min(window.innerHeight, entry.boundingClientRect.height);
        if (entry.intersectionRect.height >= need) {
          seen.add(section);
          track("section_view", { section }, issue);
        }
      }
    },
    { threshold: thresholds },
  );

  let active: { key: string; since: number } | null = null;
  function stop() {
    if (!active) return;
    const seconds = Math.round((performance.now() - active.since) / 1000);
    const section = active.key;
    active = null;
    if (seconds >= 1) track("section_time", { section, seconds }, issue);
  }
  function start(key: string) {
    active = { key, since: performance.now() };
  }

  const timeObserver = new IntersectionObserver(
    (entries) => {
      if (disposed) return;
      for (const entry of entries) {
        const section = (entry.target as HTMLElement).id;
        if (entry.isIntersecting) {
          if (active && active.key !== section) stop();
          if (!active && document.visibilityState === "visible") start(section);
        } else if (active?.key === section) {
          stop();
        }
      }
    },
    { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
  );

  for (const section of sections) {
    viewObserver.observe(section);
    timeObserver.observe(section);
  }

  let lastKey: string | null = null;
  function onVisibility() {
    if (disposed) return;
    if (document.visibilityState === "hidden") {
      lastKey = active?.key ?? null;
      stop();
    } else if (lastKey) {
      start(lastKey);
      lastKey = null;
    }
  }

  const marks = [25, 50, 75, 100];
  const sent = new Set<number>();
  let pending = false;
  function depth() {
    pending = false;
    if (disposed) return;
    const height = document.documentElement.scrollHeight;
    if (!height) return;
    const percent = ((window.scrollY + window.innerHeight) / height) * 100;
    for (const mark of marks) {
      if (sent.has(mark) || percent < (mark === 100 ? 98 : mark)) continue;
      sent.add(mark);
      track("scroll_depth", { percent: String(mark) }, issue);
    }
  }
  function onScroll() {
    if (pending || disposed) return;
    pending = true;
    requestAnimationFrame(depth);
  }

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", stop);
  window.addEventListener("scroll", onScroll, { passive: true });
  depth();

  return () => {
    disposed = true;
    viewObserver.disconnect();
    timeObserver.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", stop);
    window.removeEventListener("scroll", onScroll);
    stop();
  };
}

/**
 * Loads GA4 and records page views, clicks, and reading on the public newsletter.
 * `/send` is skipped: it is an internal tool and the form can contain addresses.
 * Page views are sent on client navigations because the App Router does not reload gtag.js.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const id = measurementId();
  const excluded = isExcludedPath(pathname);

  useEffect(() => {
    if (!id || excluded) return;
    const pagePath = search ? `${pathname}?${search}` : pathname;
    if (lastPageView === pagePath) return;
    lastPageView = pagePath;
    track("page_view", {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [id, excluded, pathname, search]);

  useEffect(() => {
    if (!id || excluded) return;
    function onClick(event: MouseEvent) {
      if (event.type === "auxclick" && event.button !== 1) return;
      const hit = classifyClick(event.target);
      if (!hit) return;
      track(hit.name, hit.params);
    }
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, [id, excluded]);

  useEffect(() => {
    if (!id || excluded) return;
    const root = document.querySelector<HTMLElement>("[data-issue]");
    if (!root) return;
    const issue = root.dataset.issue && /^\d{1,6}$/.test(root.dataset.issue) ? root.dataset.issue : null;
    return watchIssueEngagement(issue);
  }, [id, excluded, pathname]);

  if (!id || excluded) return null;

  return (
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
  );
}
