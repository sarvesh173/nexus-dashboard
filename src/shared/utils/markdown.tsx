/**
 * Minimal CommonMark/GFM renderer, dependency-free.
 *
 * Replaces react-markdown + remark-gfm, which together pull in a dozen
 * transitive mdast/micromark packages for a surface that only ever renders
 * log text: paragraphs, inline code, fenced blocks, lists, headings, tables,
 * emphasis and links.
 *
 * Safety
 * ------
 * Every element produced here is a React element and all source text goes
 * through children, so raw HTML in the content is shown as literal text and
 * cannot execute. That matches react-markdown's default behaviour (it does not
 * enable rehype-raw either), so this is not a loosening of the reference's
 * guarantee.
 *
 * Not a complete CommonMark implementation. It covers what the callers render
 * and leaves anything else as plain text rather than guessing.
 */

import React from "react";

/**
 * Inline spans within one line: code, bold, italic, strike, links.
 *
 * A code span is matched first so asterisks inside backticks are never read as
 * emphasis.
 */
function inline(text: string, k: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(~~[^~]+~~)|(\*[^*\n]+\*)|(\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${k}i${i++}`;

    if (tok.startsWith("`")) {
      out.push(
        <code key={key} className="rounded bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 text-sm font-mono text-neutral-800 dark:text-neutral-200">
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok.startsWith("**")) {
      out.push(<strong key={key} className="font-semibold">{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("~~")) {
      out.push(<del key={key}>{tok.slice(2, -2)}</del>);
    } else if (tok.startsWith("[")) {
      const cut = tok.indexOf("](");
      // Only http(s) and mailto get an href. Anything else (javascript:, data:)
      // renders as plain text, because a log body is untrusted input.
      const href = tok.slice(cut + 2, -1);
      const safe = /^(https?:|mailto:)/i.test(href);
      out.push(
        safe ? (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer"
             className="text-blue-600 dark:text-blue-400 underline hover:no-underline">
            {tok.slice(1, cut)}
          </a>
        ) : (
          <span key={key}>{tok.slice(1, cut)}</span>
        ),
      );
    } else {
      out.push(<em key={key} className="italic">{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function renderMarkdown(content: string): React.ReactNode {
  const lines = String(content ?? "").split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let n = 0;

  const isBlockStart = (s: string) =>
    /^\s*(```|~~~|#{1,6}\s|[-*+]\s|\d+\.\s|>|\|)/.test(s);

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code — contents are never parsed as markdown.
    const fence = /^\s*(```|~~~)(.*)$/.exec(line);
    if (fence) {
      const marker = fence[1];
      const lang = fence[2].trim().split(/\s+/)[0];
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(marker)) buf.push(lines[i++]);
      i++; // closing fence (or EOF)
      out.push(
        <pre key={`b${n++}`} className="overflow-x-auto rounded bg-neutral-900 p-3 text-sm text-neutral-100 my-2">
          <code className="font-mono" data-language={lang || undefined}>{buf.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // GFM table: header row followed by a |---|---| separator.
    if (line.includes("|") && /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[i + 1] ?? "")) {
      const cells = (s: string) => s.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) rows.push(cells(lines[i++]));
      out.push(
        <div key={`b${n++}`} className="overflow-x-auto my-2">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-neutral-100 dark:bg-neutral-800">
              <tr>{head.map((h, j) => <th key={j} className="border border-neutral-300 dark:border-neutral-600 px-3 py-1.5 text-left font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>{r.map((c, ci) => <td key={ci} className="border border-neutral-300 dark:border-neutral-600 px-3 py-1.5">{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Blockquote.
    if (/^\s*>/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ""));
      out.push(
        <blockquote key={`b${n++}`} className="border-l-4 border-neutral-400 pl-3 italic text-neutral-600 dark:text-neutral-400 my-2">
          {buf.map((b, bi) => <p key={bi} className="my-1 leading-relaxed">{inline(b, `q${n}-${bi}`)}</p>)}
        </blockquote>,
      );
      continue;
    }

    // Horizontal rule.
    if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) {
      out.push(<hr key={`b${n++}`} className="my-3 border-neutral-300 dark:border-neutral-600" />);
      i++;
      continue;
    }

    // Lists.
    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const cls = ordered ? "list-decimal" : "list-disc";
      const wrap = ordered ? "ol" : "ul";
      const items: string[] = [];
      while (i < lines.length && (/^\s*[-*+]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) {
        items.push(lines[i++].replace(/^\s*(?:[-*+]|\d+\.)\s+/, ""));
      }
      const List = wrap;
      out.push(
        <List key={`b${n++}`} className={`${cls} list-inside my-1 space-y-0.5`}>
          {items.map((it, ii) => <li key={ii} className="leading-relaxed">{inline(it, `l${n}-${ii}`)}</li>)}
        </List>,
      );
      continue;
    }

    // Headings.
    const hd = /^(#{1,6})\s+(.*)$/.exec(line);
    if (hd) {
      const level = hd[1].length;
      const cls = ["text-2xl font-bold my-2", "text-xl font-bold my-2", "text-lg font-semibold my-1.5",
                   "text-base font-semibold my-1", "text-sm font-semibold my-1", "text-sm font-semibold my-1"][level - 1];
      const key = `b${n++}`;
      const body = inline(hd[2], `h${key}`);
      const Tag = ([`h${level}`] as unknown) as "h1";
      out.push(<Tag key={key} className={cls}>{body}</Tag>);
      i++;
      continue;
    }

    if (!line.trim()) { i++; continue; }

    // Paragraph.
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) para.push(lines[i++]);
    out.push(
      <p key={`b${n++}`} className="my-1 leading-relaxed">
        {inline(para.join("\n"), `p${n}`)}
      </p>,
    );
  }

  return out;
}

export default renderMarkdown;