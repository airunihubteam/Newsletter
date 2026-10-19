import Link from "next/link";
import { dotDate } from "@/lib/newsletter/dates";
import { issuePath } from "@/lib/newsletter/site";
import type { Issue } from "@/lib/newsletter/types";
import "@/styles/newsletter.css";

export function ArchivePage({ issues }: { issues: Issue[] }) {
  const [latest, ...rest] = issues;
  return (
    <div className="nl">
      <header className="masthead has-photo is-archive">
        <div className="mast-inner">
          <a className="lockup is-dark" href="https://ruec.co.il/ai/" target="_blank" rel="noopener">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/newsletter/logo.png" alt="" width={34} height={43} />
            <span>
              <strong>מועדון היזמות</strong>
              <span>אוניברסיטת רייכמן · מדור החדשנות וה-AI</span>
            </span>
          </a>
          <h1 className="mast-title">הניוזלטר של מדור החדשנות וה-AI</h1>
          <p className="mast-desc">
            כל שבוע: מה קרה ב-AI, אילו אירועים שווים את הערב שלכם, מדריך אחד שאפשר ליישם היום ומושג אחד שכדאי להכיר.
          </p>
        </div>
      </header>
      <main className="page archive">
        {latest ? (
          <Link className="archive-latest" href={issuePath(latest.slug)}>
            <span className="kicker">הגיליון האחרון · {dotDate(latest.date)}</span>
            <span className="archive-num">#{latest.number}</span>
            <strong>{latest.title}</strong>
            <span className="archive-desc">{latest.description}</span>
            <span className="text-cta">לקריאה</span>
          </Link>
        ) : (
          <p>עוד אין גיליונות.</p>
        )}
        {rest.length ? (
          <>
            <h2 className="sub-label">גיליונות קודמים</h2>
            <ol className="archive-list">
              {rest.map((issue) => (
                <li key={issue.slug}>
                  <Link href={issuePath(issue.slug)}>
                    <span className="archive-n">#{issue.number}</span>
                    <span className="archive-t">{issue.title}</span>
                    <span className="archive-d">{dotDate(issue.date)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </>
        ) : null}
      </main>
      <footer className="footer">
        <a className="lockup" href="https://ruec.co.il/ai/" target="_blank" rel="noopener">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/newsletter/logo.png" alt="" width={34} height={43} />
          <span>
            <strong>מועדון היזמות</strong>
            <span>אוניברסיטת רייכמן · מדור החדשנות וה-AI</span>
          </span>
        </a>
      </footer>
    </div>
  );
}
