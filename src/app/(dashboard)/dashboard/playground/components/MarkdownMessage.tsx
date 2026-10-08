"use client";

// src/app/(dashboard)/dashboard/playground/components/MarkdownMessage.tsx
import React from "react";
import { renderMarkdown } from "@/shared/utils/markdown";

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

/**
 * MarkdownMessage — renders markdown safely in the Playground chat.
 *
 * Delegates to the shared renderer, which builds React elements only: raw HTML
 * in the content shows up as literal text, so there is no XSS path through a
 * log body. Code fences render as <pre><code> with no syntax highlighting.
 */
export default function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  return (
    // break-words: long unspaced runs (raw JSON, ids, tokens) have no natural
    // wrap point, so without it they overflow their container instead of
    // wrapping — invisible in a wide full-page layout, glaring in a narrower
    // one (e.g. the conversation tree modal).
    <div className={`break-words ${className ?? ""}`}>
      {renderMarkdown(content)}
    </div>
  );
}
