export type ContentLink = {
  text: string;
  href: string | null;
};

export type NewsItem = {
  title: string;
  summary: string;
  why: string | null;
  links: ContentLink[];
};

export type EventDate = {
  start: string;
  end: string;
};

export type EventItem = {
  dateRaw: string;
  date: EventDate | null;
  name: string;
  where: string;
  who: string;
  price: "free" | "paid" | null;
  link: string | null;
};

export type GuideStep = {
  lead: string | null;
  body: string;
  quote: string | null;
};

export type IssueVideo = {
  title: string;
  href: string | null;
  poster: string | null;
  width: number | null;
  height: number | null;
  vertical: boolean;
};

export type Guide = {
  title: string;
  fields: { label: string; value: string }[];
  video: IssueVideo | null;
  stepsLabel: string | null;
  steps: GuideStep[];
  tips: { label: string; value: string }[];
  prompts: { label: string; text: string }[];
  teaser: string | null;
  extra: string[];
};

export type ConceptListItem = {
  term: string | null;
  text: string;
};

export type ConceptSection = {
  rows: { label: string | null; value: string }[];
  list: { label: string | null; items: ConceptListItem[] } | null;
  links: ContentLink[];
};

export type IssueSectionBase = {
  key: string;
  label: string;
  subtitle: string;
};

export type Issue = {
  number: number;
  date: string;
  title: string;
  description: string;
  slug: string;
  file: string;
  readMinutes: number;
  outro: string | null;
  sections: {
    news: IssueSectionBase & { items: NewsItem[] };
    events: IssueSectionBase & { events: EventItem[]; notes: string[] };
    guide: IssueSectionBase & { guides: Guide[] };
    concept: IssueSectionBase & ConceptSection;
  };
};
