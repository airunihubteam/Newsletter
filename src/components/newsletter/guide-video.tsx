"use client";

import { useState } from "react";
import type { IssueVideo } from "@/lib/newsletter/types";

function splitTitle(title: string): { name: string; duration: string | null } {
  const parts = title.split(/\s+·\s+/);
  if (parts.length < 2) return { name: title, duration: null };
  return { name: parts[0], duration: parts.slice(1).join(" · ") };
}

export function GuideVideo({ video }: { video: IssueVideo }) {
  const { name, duration } = splitTitle(video.title);
  const youtube = video.href?.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  const [playing, setPlaying] = useState(false);

  if (youtube) {
    return (
      <div className="video-slot" data-video="youtube">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtube[1]}?autoplay=1&rel=0&playsinline=1`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            title={name}
          />
        ) : (
          <button type="button" className="video-play" aria-label={`הפעלת הסרטון: ${name}`} onClick={() => setPlaying(true)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${youtube[1]}/hqdefault.jpg`} alt="" width={480} height={360} />
            <span className="play-icon" aria-hidden="true" />
            <span className="video-meta">
              <span className="video-title">{name}</span>
              {duration ? <span className="video-duration">{duration}</span> : null}
            </span>
          </button>
        )}
      </div>
    );
  }

  if (video.href) {
    const vertical = video.vertical ? " is-vertical" : "";
    return (
      <figure className={`video-slot is-file${vertical}`}>
        <video
          controls
          preload="none"
          playsInline
          poster={video.poster ?? undefined}
          width={video.width ?? undefined}
          height={video.height ?? undefined}
          src={video.href}
        />
        <figcaption className="video-caption">
          <span className="video-title">{name}</span>
          {duration ? <span className="video-duration">{duration}</span> : null}
        </figcaption>
      </figure>
    );
  }

  return (
    <div className="video-slot is-empty">
      <div className="video-empty">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/newsletter/bootie.webp" alt="" width={64} height={64} />
        <span className="play-icon" aria-hidden="true" />
      </div>
      <span className="video-meta">
        <span className="video-title">{name}</span>
        {duration ? <span className="video-duration">{duration}</span> : null}
      </span>
      <span className="video-soon">הסרטון יעלה בקרוב</span>
    </div>
  );
}
