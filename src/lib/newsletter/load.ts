import "server-only";
import fs from "node:fs";
import path from "node:path";
import { parseIssue } from "@/lib/newsletter/parse";
import type { Issue, IssueVideo } from "@/lib/newsletter/types";

const ISSUES_DIR = path.join(process.cwd(), "content/newsletter/issues");

function jpegSize(buffer: Buffer): { w: number; h: number } | null {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { h: buffer.readUInt16BE(offset + 5), w: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

function attachPoster(video: IssueVideo): IssueVideo {
  if (!video.href?.startsWith("/newsletter/media/")) return video;
  const poster = video.href.replace(/\.\w+$/, ".jpg");
  const disk = path.join(process.cwd(), "public", poster);
  if (!fs.existsSync(disk)) return video;
  const size = jpegSize(fs.readFileSync(disk));
  if (!size) return { ...video, poster };
  return { ...video, poster, width: size.w, height: size.h, vertical: size.h > size.w };
}

function withPosters(issue: Issue): Issue {
  return {
    ...issue,
    sections: {
      ...issue.sections,
      guide: {
        ...issue.sections.guide,
        guides: issue.sections.guide.guides.map((guide) => ({
          ...guide,
          video: guide.video ? attachPoster(guide.video) : null,
        })),
      },
    },
  };
}

export async function loadIssues(): Promise<Issue[]> {
  "use cache";
  if (!fs.existsSync(ISSUES_DIR)) return [];
  const files = fs.readdirSync(ISSUES_DIR).filter((file) => /^\d{4}-\d{2}-\d{2}\.md$/.test(file));
  const issues = files.map((file) => withPosters(parseIssue(path.join(ISSUES_DIR, file))));
  const slugs = new Set<string>();
  for (const issue of issues) {
    if (slugs.has(issue.slug)) throw new Error(`duplicate slug "${issue.slug}"`);
    slugs.add(issue.slug);
  }
  return issues.sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number);
}

export async function loadIssue(slug: string): Promise<Issue | undefined> {
  const issues = await loadIssues();
  return issues.find((issue) => issue.slug === slug);
}
