/**
 * Virtualized log list.
 *
 * The reason the old page felt unusable: every row was a <button>, so a screen
 * full of logs produced ~90 tab stops, ~90 focus rings, and no way to scan with
 * a keyboard. Here the rows are inert <div>s inside one scroller, and selection
 * is owned by a single roving-tabindex container.
 *
 * Only rows intersecting the viewport (+overscan) are in the DOM, so a 5,000
 * line ledger costs the same as a 50 line one.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LOGS_COLUMNS,
  LOGS_PAGE_SIZE,
  LOGS_ROWS_ARE_BUTTONS,
  LOGS_ROW_HEIGHT,
} from './logFlags.js';
import { formatClock } from './normalize.js';

const OVERSCAN = 8;

const LEVEL_TONE = {
  critical: 'text-rose-300 bg-rose-500/15 border-rose-500/30',
  error: 'text-rose-400 bg-rose-500/10 border-rose-500/25',
  warn: 'text-amber-300 bg-amber-500/10 border-amber-500/25',
  info: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
  debug: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

function RowInner({ row, selected, onSelect, isFocused }) {
  const tone = LEVEL_TONE[row.level] ?? LEVEL_TONE.info;
  const Tag = LOGS_ROWS_ARE_BUTTONS ? 'button' : 'div';
  return (
    <Tag
      {...(LOGS_ROWS_ARE_BUTTONS ? { type: 'button' } : {})}
      role={LOGS_ROWS_ARE_BUTTONS ? undefined : 'option'}
      aria-selected={LOGS_ROWS_ARE_BUTTONS ? undefined : selected}
      onClick={onSelect}
      data-log-row={row.id}
      data-level={row.level}
      className={`flex items-center gap-2 px-3 border-b border-[var(--md-sys-color-outline-variant)]/25 cursor-pointer transition-colors duration-150 ${
        selected
          ? 'bg-[var(--md-sys-color-primary)]/15'
          : isFocused
            ? 'bg-[var(--md-sys-color-surface-container-high)]'
            : 'hover:bg-[var(--md-sys-color-surface-container)]'
      }`}
      style={{ height: LOGS_ROW_HEIGHT }}
    >
      {LOGS_COLUMNS.time && (
        <span className="font-mono text-[11px] text-[var(--md-sys-color-on-surface-variant)] w-[62px] shrink-0 tabular-nums">
          {formatClock(row.time)}
        </span>
      )}
      {LOGS_COLUMNS.level && (
        <span className={`font-mono text-[9px] font-bold uppercase px-1.5 rounded border shrink-0 w-[62px] text-center ${tone}`}>
          {row.level}
        </span>
      )}
      {LOGS_COLUMNS.source && (
        <span className="font-mono text-[10px] text-[var(--md-sys-color-primary)] w-[92px] shrink-0 truncate">
          {row.source}
        </span>
      )}
      {LOGS_COLUMNS.message && (
        <span className="font-mono text-[11px] text-[var(--md-sys-color-on-surface)] truncate flex-1">
          {row.message}
        </span>
      )}
    </Tag>
  );
}

export function VirtualLogList({
  rows,
  selectedId,
  onSelect,
  onScroll,
  pinned,
  scrollerRef,
}) {
  const [range, setRange] = useState({ start: 0, end: LOGS_PAGE_SIZE });
  const focusIndex = useRef(0);

  const recompute = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const first = Math.max(0, Math.floor(el.scrollTop / LOGS_ROW_HEIGHT) - OVERSCAN);
    const visible = Math.ceil(el.clientHeight / LOGS_ROW_HEIGHT) + OVERSCAN * 2;
    setRange({ start: first, end: Math.min(rows.length, first + visible) });
  }, [rows.length, scrollerRef]);

  useEffect(() => { recompute(); }, [recompute, rows.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [recompute, scrollerRef]);

  /** Follow the live tail, but only while the user has not scrolled away. */
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !pinned) return;
    el.scrollTop = el.scrollHeight;
  }, [rows.length, pinned, scrollerRef]);

  /** Roving focus: one tab stop for the whole list, arrows to move inside it. */
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      const next = Math.max(0, Math.min(rows.length - 1, focusIndex.current + delta));
      focusIndex.current = next;
      const row = rows[next];
      if (row) {
        onSelect(row);
        const el = scrollerRef.current;
        if (el) {
          const top = next * LOGS_ROW_HEIGHT;
          if (top < el.scrollTop) el.scrollTop = top;
          else if (top + LOGS_ROW_HEIGHT > el.scrollTop + el.clientHeight) {
            el.scrollTop = top + LOGS_ROW_HEIGHT - el.clientHeight;
          }
        }
      }
    } else if (e.key === 'Enter') {
      const row = rows[focusIndex.current];
      if (row) onSelect(row);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusIndex.current = 0;
      onSelect(rows[0]);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusIndex.current = Math.max(0, rows.length - 1);
      onSelect(rows[rows.length - 1]);
    }
  };

  const slice = rows.slice(range.start, range.end);

  return (
    <div
      ref={scrollerRef}
      onScroll={(e) => { recompute(); onScroll?.(e.currentTarget); }}
      role="listbox"
      aria-label="Log stream"
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="flex-1 overflow-y-auto custom-drawer-scrollbar outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)]"
    >
      {/* Spacers keep the scrollbar honest without rendering every row. */}
      <div style={{ height: range.start * LOGS_ROW_HEIGHT }} aria-hidden="true" />
      {slice.map((row, i) => (
        <RowInner
          key={row.id}
          row={row}
          selected={row.id === selectedId}
          isFocused={range.start + i === focusIndex.current}
          onSelect={() => { focusIndex.current = range.start + i; onSelect(row); }}
        />
      ))}
      <div style={{ height: Math.max(0, rows.length - range.end) * LOGS_ROW_HEIGHT }} aria-hidden="true" />
    </div>
  );
}