import React from "react";
import { Box, Typography } from "@mui/material";

// A small, dependency-free renderer for the subset of markdown the
// assistant's system prompt is told to use (see geminiAssistant.ts):
// headings (#/##/###), bullet lists (-/*), numbered lists (1.), and inline
// **bold**/*italic*. No external markdown library — this app avoids adding
// dependencies for something this contained, and a hand-rolled parser means
// no risk of raw HTML injection from model output (everything renders through
// React elements, never dangerouslySetInnerHTML).

type Block =
  | { kind: "heading"; level: 2 | 3 | 4; content: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "numbered"; items: string[] }
  | { kind: "paragraph"; content: string };

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let bulletBuffer: string[] = [];
  let numberedBuffer: string[] = [];
  let paragraphBuffer: string[] = [];

  const flushBullets = () => {
    if (bulletBuffer.length) {
      blocks.push({ kind: "bullets", items: bulletBuffer });
      bulletBuffer = [];
    }
  };
  const flushNumbered = () => {
    if (numberedBuffer.length) {
      blocks.push({ kind: "numbered", items: numberedBuffer });
      numberedBuffer = [];
    }
  };
  const flushParagraph = () => {
    if (paragraphBuffer.length) {
      blocks.push({ kind: "paragraph", content: paragraphBuffer.join(" ") });
      paragraphBuffer = [];
    }
  };
  const flushAll = () => {
    flushBullets();
    flushNumbered();
    flushParagraph();
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const headingMatch = line.match(/^(#{2,4})\s+(.*)$/);
    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    const numberedMatch = line.match(/^\d+[.)]\s+(.*)$/);

    if (!line) {
      flushAll();
      continue;
    }
    if (headingMatch) {
      flushAll();
      const level = headingMatch[1].length as 2 | 3 | 4;
      blocks.push({ kind: "heading", level, content: headingMatch[2] });
      continue;
    }
    if (bulletMatch) {
      flushNumbered();
      flushParagraph();
      bulletBuffer.push(bulletMatch[1]);
      continue;
    }
    if (numberedMatch) {
      flushBullets();
      flushParagraph();
      numberedBuffer.push(numberedMatch[1]);
      continue;
    }
    // Plain text line: continues whichever list is open (soft-wrapped list
    // item) or accumulates into the current paragraph.
    if (bulletBuffer.length) {
      bulletBuffer[bulletBuffer.length - 1] += ` ${line}`;
    } else if (numberedBuffer.length) {
      numberedBuffer[numberedBuffer.length - 1] += ` ${line}`;
    } else {
      paragraphBuffer.push(line);
    }
  }
  flushAll();
  return blocks;
}

// Splits a line on **bold** / *italic* spans and returns React nodes with the
// surrounding plain text preserved — a single regex pass rather than nested
// replace() calls, so "**a** and *b*" doesn't get mangled. Exported so other
// small pieces of assistant-generated text (e.g. the deterministic "insights"
// bullets tools attach to a table/cards) can reuse the same inline styling
// instead of duplicating this parsing.
export function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      nodes.push(
        <strong key={key++} style={{ fontWeight: 800 }}>
          {match[1]}
        </strong>,
      );
    } else {
      nodes.push(
        <em key={key++} style={{ fontStyle: "italic" }}>
          {match[2]}
        </em>,
      );
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

const HEADING_SIZE: Record<2 | 3 | 4, number> = { 2: 15, 3: 13.5, 4: 12.5 };

export default function FormattedText({
  text,
  color = "#141824",
}: {
  text: string;
  color?: string;
}) {
  const blocks = parseBlocks(text);
  // A single short paragraph (the common case: plain answers) renders with
  // no extra block spacing, matching the old plain-Typography look exactly.
  if (blocks.length === 1 && blocks[0].kind === "paragraph") {
    return (
      <Typography sx={{ fontSize: 13, color, whiteSpace: "pre-wrap" }}>
        {renderInline(blocks[0].content)}
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <Typography
              key={index}
              sx={{ fontSize: HEADING_SIZE[block.level], fontWeight: 800, color, mt: index > 0 ? 0.5 : 0 }}
            >
              {renderInline(block.content)}
            </Typography>
          );
        }
        if (block.kind === "bullets") {
          return (
            <Box component="ul" key={index} sx={{ m: 0, pl: 2.25, display: "flex", flexDirection: "column", gap: 0.4 }}>
              {block.items.map((item, i) => (
                <Typography component="li" key={i} sx={{ fontSize: 13, color }}>
                  {renderInline(item)}
                </Typography>
              ))}
            </Box>
          );
        }
        if (block.kind === "numbered") {
          return (
            <Box component="ol" key={index} sx={{ m: 0, pl: 2.25, display: "flex", flexDirection: "column", gap: 0.4 }}>
              {block.items.map((item, i) => (
                <Typography component="li" key={i} sx={{ fontSize: 13, color }}>
                  {renderInline(item)}
                </Typography>
              ))}
            </Box>
          );
        }
        return (
          <Typography key={index} sx={{ fontSize: 13, color, whiteSpace: "pre-wrap" }}>
            {renderInline(block.content)}
          </Typography>
        );
      })}
    </Box>
  );
}
