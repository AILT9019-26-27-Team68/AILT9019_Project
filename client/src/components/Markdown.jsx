/*
 * Markdown — a tiny, dependency-free renderer for the LLM advice text.
 *
 * The backend sends advice as Markdown, not HTML. Rendering it with
 * dangerouslySetInnerHTML would let model output inject markup, so this
 * component parses the small subset the coach actually uses and returns
 * React elements instead. Supported:
 *   headings, paragraphs, **bold**, *italic*, `code`, [links](https://…),
 *   bullet / numbered lists, blockquotes, fenced code, horizontal rules.
 * Anything it does not recognise is shown as plain text — never executed.
 */

const INLINE = /(\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)|\*[^*\n]+\*)/g;

/** Only allow links that cannot execute script: http(s), mailto, or a site path. */
function safeHref(href) {
  const value = String(href || "").trim();
  if (/^https?:\/\/[^\s]+$/i.test(value)) return value;
  if (/^mailto:[^\s]+$/i.test(value)) return value;
  // single leading slash only: "//evil.example" is protocol-relative, not a site path
  if (/^\/(?!\/)[^\s]*$/.test(value)) return value;
  return null;
}

function pushText(nodes, text, key) {
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    if (index > 0) nodes.push(<br key={`${key}-br-${index}`} />);
    if (line) nodes.push(line);
  });
}

/** Turn one line (or paragraph) of inline Markdown into React nodes. */
function renderInline(text, keyPrefix) {
  const nodes = [];
  let last = 0;
  let match;
  INLINE.lastIndex = 0;

  while ((match = INLINE.exec(text)) !== null) {
    const key = `${keyPrefix}-${match.index}`;
    if (match.index > last) {
      pushText(nodes, text.slice(last, match.index), `${key}-plain`);
    }

    const token = match[0];
    if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("[")) {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      const href = link ? safeHref(link[2]) : null;
      nodes.push(
        href ? (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer">
            {link[1]}
          </a>
        ) : (
          <span key={key}>{link ? link[1] : token}</span>
        )
      );
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }

    last = match.index + token.length;
  }

  if (last < text.length) {
    pushText(nodes, text.slice(last), `${keyPrefix}-tail`);
  }
  return nodes;
}

function isBlockStart(line) {
  return (
    /^\s*```/.test(line) ||
    /^\s*#{1,6}\s+/.test(line) ||
    /^\s*[-*+]\s+/.test(line) ||
    /^\s*\d+[.)]\s+/.test(line) ||
    /^\s*>\s?/.test(line) ||
    /^\s*([-*_])(\s*\1){2,}\s*$/.test(line)
  );
}

function parseBlocks(source) {
  const lines = String(source).replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let index = 0;
  let key = 0;
  const nextKey = () => `md-${key++}`;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    // fenced code
    const fence = /^\s*```/.exec(line);
    if (fence) {
      const code = [];
      index += 1;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1; // closing fence
      blocks.push(
        <pre key={nextKey()} className="md-pre">
          <code>{code.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // headings
    const heading = /^\s*(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      // The advice panel already has an <h3>; every Markdown heading is an h4
      // so the outline stays simple and the styles stay consistent.
      blocks.push(<h4 key={nextKey()}>{renderInline(heading[2], nextKey())}</h4>);
      index += 1;
      continue;
    }

    // horizontal rule
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      blocks.push(<hr key={nextKey()} />);
      index += 1;
      continue;
    }

    // blockquote
    if (/^\s*>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      blocks.push(
        <blockquote key={nextKey()}>{renderInline(quote.join("\n"), nextKey())}</blockquote>
      );
      continue;
    }

    // bullet list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*+]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul key={nextKey()}>
          {items.map((item, i) => (
            <li key={`${nextKey()}-${i}`}>{renderInline(item, nextKey())}</li>
          ))}
        </ul>
      );
      continue;
    }

    // numbered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+[.)]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ol key={nextKey()}>
          {items.map((item, i) => (
            <li key={`${nextKey()}-${i}`}>{renderInline(item, nextKey())}</li>
          ))}
        </ol>
      );
      continue;
    }

    // paragraph: collect until a blank line or a new block
    const paragraph = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isBlockStart(lines[index])
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }

    // A line that starts a block we already handled above cannot reach here;
    // the guard keeps a malformed paragraph from looping forever.
    if (paragraph.length === 0) {
      paragraph.push(line.trim());
      index += 1;
    }

    blocks.push(<p key={nextKey()}>{renderInline(paragraph.join("\n"), nextKey())}</p>);
  }

  return blocks;
}

export default function Markdown({ text, className = "" }) {
  if (!text) return null;
  return <div className={`md ${className}`.trim()}>{parseBlocks(text)}</div>;
}
