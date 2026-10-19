"use client";

import { useEffect, useRef } from "react";

export function ReadingProgress() {
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = bar.current;
    if (!node) return;
    let ticking = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      node.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 1})`;
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="progress" aria-hidden="true">
      <span ref={bar} />
    </div>
  );
}
