/**
 * Log detail inspector.
 *
 * Side panel, not a full-screen modal: a modal hides the list you were reading
 * and forces a close before you can check the neighbouring row. A panel keeps
 * the stream visible so "was it before or after this?" stays answerable.
 *
 * Every section collapses independently and the open state is remembered, so
 * reopening a row does not reset the reader's place.
 */
import React, { useState } from 'react';
import { LOGS_COLUMNS } from './logFlags.js';
import { formatClock } from './normalize.js';

const LEVEL_TONE = {
  critical: 'text-rose-300 border-rose-500/40 bg-rose-500/10',
  error: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  warn: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
  info: 'text-sky-300 border-sky-500/25 bg-sky-500/10',
  debug: 'text-slate-400 border-slate-500/25 bg-slate-500/10',
};

/** Copy with transient "Copied" state instead of an alert or a toast stack. */
function CopyButton({ value, label = 'Copy' }) {
  const [done, setDone] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(String(value));
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        } catch {
          /* clipboard blocked: the value is still selectable in the JSON block */
        }
      }}
      className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)] hover:border-[var(--md-sys-color-primary)] hover:text-[var(--md-sys-color-primary)] transition-colors duration-150"
    >
      {done ? 'Copied' : label}
    </button>
  );
}

function Section({ title, badge, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-[var(--md-sys-color-outline-variant)]/30">
      <div className="flex items-center justify-between px-4 py-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-primary)] transition-colors duration-150"
        >
          <span className={`inline-block transition-transform duration-150 ${open ? 'rotate-90' : ''}`}>▸</span>
          {title}
          {badge != null && (
            <span className="text-[10px] font-mono font-normal normal-case text-[var(--md-sys-color-primary)]">
              {badge}
            </span>
          )}
        </button>
      </div>
      {open && <div className="px-4 pb-3">{children}</div>}
    </section>
  );
}

function Field({ k, v }) {
  if (v == null || v === '') return null;
  return (
    <div className="min-w-0">
      <dt className="text-[9px] uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]/70">{k}</dt>
      <dd className="font-mono text-[11px] text-[var(--md-sys-color-on-surface)] break-all">{String(v)}</dd>
    </div>
  );
}

export function LogDetailPanel({ row, onClose }) {
  if (!row) {
    return (
      <aside className="w-[320px] shrink-0 border-l border-[var(--md-sys-color-outline-variant)]/40 hidden xl:flex items-center justify-center p-6">
        <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] text-center max-w-[200px]">
          Select a log line to inspect it.
        </p>
      </aside>
    );
  }

  const tone = LEVEL_TONE[row.level] ?? LEVEL_TONE.info;
  const raw = row.raw ?? {};
  const pretty = (() => {
    try { return JSON.stringify(raw, null, 2); } catch { return String(raw); }
  })();

  return (
    <aside
      className="w-full sm:w-[320px] shrink-0 border-l border-[var(--md-sys-color-outline-variant)]/40 overflow-y-auto custom-drawer-scrollbar"
      data-testid="log-detail-panel"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 bg-[var(--md-sys-color-surface-container)] border-b border-[var(--md-sys-color-outline-variant)]/40">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${tone}`}>
            {row.level}
          </span>
          <span className="font-mono text-[10px] text-[var(--md-sys-color-primary)] truncate">{row.source}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close event inspector"
          className="p-1 rounded text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-highest)] hover:text-[var(--md-sys-color-on-surface)] transition-colors duration-150 shrink-0"
        >
          ✕
        </button>
      </header>

      <Section title="Event">
        <p className="font-mono text-[11px] text-[var(--md-sys-color-on-surface)] break-words mb-3">
          {row.message}
        </p>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
          <Field k="Time" v={formatClock(row.time)} />
          <Field k="Level" v={row.level} />
          <Field k="Source" v={row.source} />
          <Field k="Id" v={row.id} />
          {LOGS_COLUMNS.correlationId && <Field k="Correlation" v={raw.correlationId} />}
          {LOGS_COLUMNS.durationMs && <Field k="Duration" v={row.durationMs != null ? `${row.durationMs}ms` : null} />}
        </dl>
      </Section>

      <Section title="Message" badge={row.message.length}>
        <pre className="font-mono text-[11px] whitespace-pre-wrap break-words text-[var(--md-sys-color-on-surface)] max-h-64 overflow-y-auto custom-drawer-scrollbar">
          {row.message}
        </pre>
        <div className="mt-2 flex gap-1.5">
          <CopyButton value={row.message} label="Copy message" />
        </div>
      </Section>

      <Section title="Raw payload" defaultOpen={false}>
        <pre className="font-mono text-[10px] whitespace-pre-wrap break-words text-[var(--md-sys-color-on-surface-variant)] max-h-72 overflow-y-auto custom-drawer-scrollbar bg-[var(--md-sys-color-surface-container-lowest)] rounded p-2">
          {pretty}
        </pre>
        <div className="mt-2">
          <CopyButton value={pretty} label="Copy JSON" />
        </div>
      </Section>
    </aside>
  );
}