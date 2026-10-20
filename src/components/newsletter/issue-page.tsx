import Link from "next/link";
import { EventTimeline } from "@/components/newsletter/event-timeline";
import { GuideVideo } from "@/components/newsletter/guide-video";
import { PromptBlock } from "@/components/newsletter/prompt-block";
import { ReadingProgress } from "@/components/newsletter/reading-progress";
import { RichText } from "@/components/newsletter/rich-text";
import { heDate } from "@/lib/newsletter/dates";
import { issuePath, siteOrigin } from "@/lib/newsletter/site";
import type { Guide, Issue } from "@/lib/newsletter/types";
import "@/styles/newsletter.css";

const SECTION_ORDER = ["news", "events", "guide", "concept"] as const;

function SectionIcon({ name }: { name: string }) {
  return (
    <svg
      className="opener-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
    >
      {name === "news" ? <path d="M4 6h16M4 11h16M4 16h10" /> : null}
      {name === "events" ? (
        <>
          <rect x="4" y="5" width="16" height="15" />
          <path d="M4 10h16M9 3v4M15 3v4" />
        </>
      ) : null}
      {name === "guide" ? <path d="M5 5h4v4H5zM5 15h4v4H5zM13 7h6M13 17h6" /> : null}
      {name === "concept" ? <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3Z" /> : null}
    </svg>
  );
}

function ClubLockup({ dark = false }: { dark?: boolean }) {
  return (
    <a className={dark ? "lockup is-dark" : "lockup"} href="https://ruec.co.il/ai/" target="_blank" rel="noopener">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/newsletter/logo.png" alt="" width={34} height={43} />
      <span>
        <strong>מועדון היזמות</strong>
        <span>אוניברסיטת רייכמן · מדור החדשנות וה-AI</span>
      </span>
    </a>
  );
}

function SourceLinks({ links }: { links: { text: string; href: string | null }[] }) {
  if (!links.length) return null;
  return (
    <p className="sources">
      {links.map((link) =>
        link.href ? (
          <a key={link.href + link.text} className="source" href={link.href} target="_blank" rel="noopener">
            {link.text}
          </a>
        ) : (
          <span key={link.text} className="placeholder-link">
            {link.text}
          </span>
        ),
      )}
    </p>
  );
}

function tocDetail(issue: Issue, key: (typeof SECTION_ORDER)[number]) {
  if (key === "news") return `${issue.sections.news.items.length} ידיעות`;
  if (key === "events") return `${issue.sections.events.events.length} אירועים`;
  if (key === "guide" && issue.sections.guide.guides.length > 1) {
    return <span dir="ltr">{issue.sections.guide.guides.length} use cases</span>;
  }
  return issue.sections[key].subtitle;
}

function GuideArticle({ guide, index, many }: { guide: Guide; index: number; many: boolean }) {
  return (
    <article className={index ? "guide guide-next" : "guide"}>
      {many ? (
        <header className="guide-head">
          <p className="kicker">Use case {index + 1}</p>
          <h3 className="guide-title">
            <RichText text={guide.title} />
          </h3>
        </header>
      ) : null}
      {guide.fields.length ? (
        <dl className="guide-fields">
          {guide.fields.map((field) => (
            <div key={field.label}>
              <dt>{field.label}</dt>
              <dd>
                <RichText text={field.value} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {guide.video ? <GuideVideo video={guide.video} /> : null}
      {guide.steps.length ? (
        <>
          {guide.stepsLabel ? <h3 className="sub-label">{guide.stepsLabel}</h3> : null}
          <ol className="steps">
            {guide.steps.map((step, stepIndex) => (
              <li className="step" key={`${guide.title}-${stepIndex}`}>
                <span className="step-num" aria-hidden="true">
                  {stepIndex + 1}
                </span>
                <div className="step-body">
                  {step.lead ? (
                    <h4 className="step-lead">
                      <RichText text={step.lead} />
                    </h4>
                  ) : null}
                  {step.body ? (
                    <p>
                      <RichText text={step.body} />
                    </p>
                  ) : null}
                  {step.quote ? <PromptBlock text={step.quote} variant="is-inline" /> : null}
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : null}
      {guide.extra.filter(Boolean).map((paragraph) => (
        <p key={paragraph}>
          <RichText text={paragraph} />
        </p>
      ))}
      {guide.tips.map((tip) => (
        <p className="tip" key={tip.label}>
          <strong>{tip.label}</strong> <RichText text={tip.value} />
        </p>
      ))}
      {guide.prompts.map((prompt, promptIndex) => (
        <PromptBlock key={`${guide.title}-prompt-${promptIndex}`} text={prompt.text} label={prompt.label} variant="is-main" />
      ))}
      {guide.teaser ? (
        <p className="teaser">
          <span>בגיליון הבא</span> <RichText text={guide.teaser.replace(/^בגיליון הבא:\s*/, "")} />
        </p>
      ) : null}
    </article>
  );
}

function IssueFooter({ issue, issues }: { issue: Issue; issues: Issue[] }) {
  const index = issues.findIndex((item) => item.slug === issue.slug);
  const newer = index > 0 ? issues[index - 1] : null;
  const older = index >= 0 && index < issues.length - 1 ? issues[index + 1] : null;
  return (
    <footer className="footer">
      <ClubLockup />
      <nav className="footer-nav">
        {older ? <Link href={issuePath(older.slug)}>← גיליון {older.number}</Link> : <span />}
        <Link href="/">כל הגיליונות</Link>
        {newer ? <Link href={issuePath(newer.slug)}>גיליון {newer.number} →</Link> : <span />}
      </nav>
    </footer>
  );
}

export function IssuePage({ issue, issues, canonicalPath }: { issue: Issue; issues: Issue[]; canonicalPath: string }) {
  const shareUrl = `${siteOrigin()}${canonicalPath}?utm_source=whatsapp&utm_medium=share`;
  const shareText = `גיליון #${issue.number}: ${issue.title}\n${shareUrl}`;
  const manyGuides = issue.sections.guide.guides.length > 1;
  const concept = issue.sections.concept;

  return (
    <div className="nl" data-issue={issue.number}>
      <a className="skip" href="#news">
        דלגו לתוכן
      </a>
      <ReadingProgress />
      <header className="masthead has-photo">
        <div className="mast-inner">
          <ClubLockup dark />
          <p className="mast-meta">
            <span>גיליון {issue.number}</span>
            <span>{heDate(issue.date)}</span>
            <span>{issue.readMinutes} דק׳ קריאה</span>
          </p>
          <h1 className="mast-title">{issue.title}</h1>
          {issue.description ? (
            <p className="mast-desc">
              <RichText text={issue.description} />
            </p>
          ) : null}
        </div>
      </header>
      <main className="page">
        <nav className="toc" aria-label="בגיליון הזה">
          <p className="toc-label">בגיליון הזה</p>
          <ol>
            {SECTION_ORDER.map((key, index) => (
              <li key={key}>
                <a href={`#${key}`}>
                  <span className="toc-n">0{index + 1}</span>
                  <span className="toc-t">{issue.sections[key].label}</span>
                  <span className="toc-d">{tocDetail(issue, key)}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <section id="news" className="section section-news" aria-labelledby="news-h">
          <header className="opener">
            <div className="opener-num" aria-hidden="true">
              01
            </div>
            <div className="opener-text">
              <p className="kicker">
                <SectionIcon name="news" />
                <span>{issue.sections.news.label}</span>
              </p>
              {issue.sections.news.subtitle ? (
                <h2 id="news-h" className="opener-title">
                  <RichText text={issue.sections.news.subtitle} />
                </h2>
              ) : (
                <h2 id="news-h" className="opener-title sr-only">
                  {issue.sections.news.label}
                </h2>
              )}
            </div>
          </header>
          <div className="news-list">
            {issue.sections.news.items.map((item, index) => (
              <article className={index === 0 ? "news-item is-lead" : "news-item"} key={item.title}>
                <span className="news-index" aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className="news-title">
                  <RichText text={item.title} />
                </h3>
                {item.summary ? (
                  <p className="news-summary">
                    <RichText text={item.summary} />
                  </p>
                ) : null}
                {item.why ? (
                  <p className="why">
                    <strong>למה זה חשוב</strong> <RichText text={item.why} />
                  </p>
                ) : null}
                <SourceLinks links={item.links} />
              </article>
            ))}
          </div>
        </section>

        <section id="events" className="section section-events" aria-labelledby="events-h">
          <header className="opener">
            <div className="opener-num" aria-hidden="true">
              02
            </div>
            <div className="opener-text">
              <p className="kicker">
                <SectionIcon name="events" />
                <span>{issue.sections.events.label}</span>
              </p>
              {issue.sections.events.subtitle ? (
                <h2 id="events-h" className="opener-title">
                  <RichText text={issue.sections.events.subtitle} />
                </h2>
              ) : (
                <h2 id="events-h" className="opener-title sr-only">
                  {issue.sections.events.label}
                </h2>
              )}
            </div>
          </header>
          <EventTimeline events={issue.sections.events.events} notes={issue.sections.events.notes} />
        </section>

        <section id="guide" className="section section-guide" aria-labelledby="guide-h">
          <header className="opener">
            <div className="opener-num" aria-hidden="true">
              03
            </div>
            <div className="opener-text">
              <p className="kicker">
                <SectionIcon name="guide" />
                <span>{issue.sections.guide.label}</span>
              </p>
              {issue.sections.guide.subtitle ? (
                <h2 id="guide-h" className="opener-title">
                  <RichText text={issue.sections.guide.subtitle} />
                </h2>
              ) : (
                <h2 id="guide-h" className="opener-title sr-only">
                  {issue.sections.guide.label}
                </h2>
              )}
            </div>
          </header>
          {issue.sections.guide.guides.map((guide, index) => (
            <GuideArticle key={guide.title} guide={guide} index={index} many={manyGuides} />
          ))}
        </section>

        <section id="concept" className="section section-concept" aria-labelledby="concept-h">
          <header className="opener">
            <div className="opener-num" aria-hidden="true">
              04
            </div>
            <div className="opener-text">
              <p className="kicker">
                <SectionIcon name="concept" />
                <span>{concept.label}</span>
              </p>
              {concept.subtitle ? (
                <h2 id="concept-h" className="opener-title">
                  <RichText text={concept.subtitle} />
                </h2>
              ) : (
                <h2 id="concept-h" className="opener-title sr-only">
                  {concept.label}
                </h2>
              )}
            </div>
          </header>
          <div className="concept-box">
            {concept.rows.slice(0, 1).map((row) => (
              <div className="concept-row" key={row.label ?? row.value}>
                {row.label ? <h3>{row.label}</h3> : null}
                <p>
                  <RichText text={row.value} />
                </p>
              </div>
            ))}
            {concept.list ? (
              <>
                {concept.list.label ? <h3 className="sub-label">{concept.list.label}</h3> : null}
                <ul className="concept-list">
                  {concept.list.items.map((item) => (
                    <li key={item.term ?? item.text}>
                      {item.term ? <strong dir="ltr">{item.term}</strong> : null}
                      <span>
                        <RichText text={item.text} />
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {concept.rows.slice(1).map((row) => (
              <div className="concept-row" key={row.label ?? row.value}>
                {row.label ? <h3>{row.label}</h3> : null}
                <p>
                  <RichText text={row.value} />
                </p>
              </div>
            ))}
            {concept.links.length ? (
              <p className="concept-links">
                {concept.links.map((link) =>
                  link.href ? (
                    <a key={link.href} className="source" href={link.href} target="_blank" rel="noopener">
                      {link.text}
                    </a>
                  ) : (
                    <span key={link.text} className="placeholder-link">
                      {link.text}
                    </span>
                  ),
                )}
              </p>
            ) : null}
          </div>
        </section>

        <section className="closing">
          <div className="closing-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="closing-bootie"
              src="/newsletter/bootie-megaphone.webp"
              alt="בוטי עם מגפון"
              width={200}
              height={200}
            />
            <div className="closing-text">
              {issue.outro ? (
                <p className="outro">
                  <RichText text={issue.outro} />
                </p>
              ) : null}
            </div>
          </div>
          <div className="closing-actions">
            <a
              className="btn btn-ghost"
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener"
            >
              שיתוף בוואטסאפ
            </a>
          </div>
        </section>
      </main>
      <IssueFooter issue={issue} issues={issues} />
    </div>
  );
}
