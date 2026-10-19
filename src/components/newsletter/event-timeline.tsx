"use client";

import { useEffect, useState, type ReactNode } from "react";
import { HE_DAYS, HE_MONTHS_SHORT } from "@/lib/newsletter/dates";
import type { EventItem } from "@/lib/newsletter/types";
import { RichText } from "@/components/newsletter/rich-text";

function PastGroup({ end, children }: { end: string; children: ReactNode }) {
  const [past, setPast] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setPast(Boolean(end) && end < today);
  }, [end]);

  return <li className={past ? "tl-group is-past" : "tl-group"}>{children}</li>;
}

function DateBadge({ event }: { event: EventItem }) {
  if (!event.date) {
    return (
      <div className="date-badge">
        <span className="date-day">{event.dateRaw}</span>
      </div>
    );
  }
  const start = new Date(`${event.date.start}T12:00:00`);
  const end = new Date(`${event.date.end}T12:00:00`);
  const day =
    event.date.start === event.date.end ? String(start.getDate()) : `${start.getDate()}–${end.getDate()}`;
  return (
    <div className="date-badge">
      <span className="date-day" dir="ltr">
        {day}
      </span>
      <span className="date-month">{HE_MONTHS_SHORT[start.getMonth()]}</span>
      <span className="date-weekday">יום {HE_DAYS[start.getDay()]}</span>
    </div>
  );
}

function groupEvents(events: EventItem[]) {
  const groups: { key: string; end: string; events: EventItem[] }[] = [];
  for (const event of events) {
    const key = event.date?.start || event.dateRaw;
    const last = groups.at(-1);
    if (last?.key === key) last.events.push(event);
    else groups.push({ key, end: "", events: [event] });
  }
  for (const group of groups) {
    group.end = group.events
      .map((event) => event.date?.end || "")
      .sort()
      .at(-1) ?? "";
  }
  return groups;
}

function suggestionText(note: string): string {
  return note.replace(/\[לינק לטופס\]|\[טופס\]/g, "").replace(/\s*→\s*$/, "").trim();
}

export function EventTimeline({ events, notes }: { events: EventItem[]; notes: string[] }) {
  const groups = groupEvents(events);
  return (
    <>
      <ol className="timeline">
        {groups.map((group) => (
          <PastGroup key={group.key} end={group.end}>
            <DateBadge event={group.events[0]} />
            <div className="tl-events">
              {group.events.map((event) => (
                <div className="tl-event" key={`${group.key}-${event.name}`}>
                  <h3 className="tl-name">
                    <RichText text={event.name} />
                    {event.price === "free" ? <span className="tag tag-free">חינם</span> : null}
                    {event.price === "paid" ? <span className="tag tag-paid">בתשלום</span> : null}
                  </h3>
                  <p className="tl-where">
                    <RichText text={event.where} />
                  </p>
                  {event.who ? (
                    <p className="tl-who">
                      <RichText text={event.who} />
                    </p>
                  ) : null}
                  {event.link ? (
                    <a className="tl-register" href={event.link} target="_blank" rel="noopener">
                      להרשמה
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </PastGroup>
        ))}
      </ol>
      {notes.map((note) => {
        const text = suggestionText(note);
        if (!text) return null;
        return (
          <div className="events-suggest" key={text}>
            <p>
              <RichText text={text} />
            </p>
          </div>
        );
      })}
    </>
  );
}
