import { Fragment, type ReactNode } from "react";
import { Lexer, type Token, type Tokens } from "marked";

const RANGE_RE = /(?<![\w.:])(\d[\d.:,]*\s?[–—-]\s?\d[\d.:,]*)(?!\w)/g;
const NUM_RE = /(?<![\w.])(\d[\d.,]*[%+])(?![\w%+])/g;
const QUOTE_RE = /"([A-Za-z][A-Za-z0-9 .\-]{1,40})"/g;
const LIST_RE =
  /(?<![A-Za-z0-9&.\-] ?)[A-Za-z][A-Za-z0-9.\- ]*[A-Za-z0-9](?:, [A-Za-z][A-Za-z0-9.\- ]*[A-Za-z0-9])+(?! ?[&A-Za-z0-9])/g;
const PLACE_RE = /\[([^\]\n]+)\](?!\()/g;

function apply(
  text: string,
  re: RegExp,
  wrap: (match: string, key: string) => ReactNode,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  re.lastIndex = 0;
  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    nodes.push(wrap(match[0], `${index}`));
    last = index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length ? nodes : [text];
}

function mapStrings(nodes: ReactNode[], fn: (text: string) => ReactNode[]): ReactNode[] {
  return nodes.flatMap((node) => (typeof node === "string" ? fn(node) : [node]));
}

function bidi(text: string): ReactNode {
  let nodes: ReactNode[] = [text];
  nodes = mapStrings(nodes, (part) =>
    apply(part, NUM_RE, (match, key) => (
      <bdi dir="ltr" key={`n-${key}`}>
        {match}
      </bdi>
    )),
  );
  nodes = mapStrings(nodes, (part) =>
    apply(part, RANGE_RE, (match, key) => (
      <span dir="ltr" key={`r-${key}`}>
        {match}
      </span>
    )),
  );
  nodes = mapStrings(nodes, (part) =>
    apply(part, QUOTE_RE, (match, key) => (
      <span className="nw" dir="ltr" key={`q-${key}`}>
        {match}
      </span>
    )),
  );
  nodes = mapStrings(nodes, (part) =>
    apply(part, LIST_RE, (match, key) => (
      <Fragment key={`l-${key}`}>
        {match.split(", ").map((item, index) => (
          <Fragment key={index}>
            {index > 0 ? ", " : null}
            <bdi>{item}</bdi>
          </Fragment>
        ))}
      </Fragment>
    )),
  );
  nodes = mapStrings(nodes, (part) =>
    apply(part, PLACE_RE, (match, key) => (
      <span className="placeholder-link" key={`p-${key}`}>
        {match.slice(1, -1)}
      </span>
    )),
  );
  return <>{nodes}</>;
}

function renderInline(tokens: Token[] | undefined): ReactNode[] {
  if (!tokens) return [];
  return tokens.map((token, index) => <Fragment key={index}>{renderToken(token)}</Fragment>);
}

function renderToken(token: Token): ReactNode {
  switch (token.type) {
    case "text":
    case "escape":
      return bidi("text" in token && typeof token.text === "string" ? token.text : "");
    case "strong":
      return <strong>{renderInline((token as Tokens.Strong).tokens)}</strong>;
    case "em":
      return <em>{renderInline((token as Tokens.Em).tokens)}</em>;
    case "br":
      return <br />;
    case "codespan":
      return <code>{(token as Tokens.Codespan).text}</code>;
    case "link": {
      const link = token as Tokens.Link;
      const href = /^https?:\/\//i.test(link.href) ? link.href : null;
      if (!href) return <span className="placeholder-link">{link.text}</span>;
      return (
        <a href={href} target="_blank" rel="noopener">
          {renderInline(link.tokens)}
        </a>
      );
    }
    default:
      if ("tokens" in token && token.tokens) return <>{renderInline(token.tokens)}</>;
      if ("text" in token && typeof token.text === "string") return bidi(token.text);
      return null;
  }
}

export function RichText({ text }: { text: string }) {
  return <>{renderInline(Lexer.lexInline(text))}</>;
}
