/**
 * Call detail panel — the double-tap target.
 *
 * Read-only by construction: it fetches one call artifact from the ledger and
 * renders it. There is no POST, no retry, no re-send, no mutation of any kind.
 *
 * Sections, in the order an engineer debugging a call actually reads them:
 * summary -> routing -> headers -> request -> messages -> response -> pipeline.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { bytes, prettyJson, redact, redactHeaders } from './logRedact.js';

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'request', label: 'Request' },
  { id: 'messages', label: 'Messages' },
  { id: 'response', label: 'Response' },
  { id: 'pipeline', label: 'Pipeline' },
];

function Field({ label, value, mono = true }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex items-baseline gap-3 py-1">
      <span className="w-44 shrink-0 text-[10px] uppercase tracking-wide text-[var(--md-sys-color-on-surface-variant)]/70">
        {label}
      </span>
      <span className={`text-xs text-[var(--md-sys-color-on-surface)] break-words ${mono ? 'font-mono' : ''}`}>
        {String(value)}
      </span>
    </div>
  );
}

function Block({ title, children, count }) {
  return (
    <section className="rounded-xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-low)] overflow-hidden">
      <h3 className="px-4 py-2 text-[10px] uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)] border-b border-[var(--md-sys-color-outline-variant)] flex items-center gap-2">
        {title}
        {count != null && <span className="opacity-60">({count})</span>}
      </h3>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Code({ value }) {
  return (
    <pre className="text-[11px] font-mono leading-relaxed text-[var(--md-sys-color-on-surface)] bg-[var(--md-sys-color-surface-container-highest)] rounded-lg p-3 overflow-auto max-h-[420px] whitespace-pre-wrap break-words">
      {value || '—'}
    </pre>
  );
}

export function CallDetail({ callId, onClose }) {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const [tab, setTab] = useState('summary');
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (!callId) return undefined;
    let live = true;
    setState('loading');
    setData(null);
    setMsgIndex(0);

    fetch(`/api/omniroute/call-log?id=${encodeURIComponent(callId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!live) return;
        if (j.available && j.body) { setData(j); setState('ready'); }
        else { setData(j); setState('unavailable'); }
      })
      .catch(() => { if (live) setState('error'); });

    return () => { live = false; };
  }, [callId]);

  // Everything is masked before it reaches the DOM.
  const body = useMemo(() => (data?.body ? redact(data.body) : null), [data]);

  useEffect(() => {
    if (!callId) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [callId, onClose]);

  if (!callId) return null;

  return (
    <aside
      data-testid="call-detail"
      aria-label="Call detail"
      className="w-[560px] max-w-[52vw] shrink-0 border-l border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] flex flex-col h-full min-h-0"
    >
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--md-sys-color-outline-variant)]">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-[var(--md-sys-color-on-surface)] truncate">
            {body?.summary?.model ?? (state === 'loading' ? 'Loading…' : 'Call detail')}
          </h2>
          {data?.artifact?.size_bytes ? (
            <p className="text-[10px] font-mono text-[var(--md-sys-color-on-surface-variant)]/70 truncate">
              {bytes(data.artifact.size_bytes)} artifact · read-only
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail"
          className="px-2.5 py-1.5 rounded-lg text-xs border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)] hover:border-[var(--md-sys-color-primary)] transition-colors duration-150"
        >
          Close
        </button>
      </header>

      {state === 'loading' && <div className="p-6 text-xs text-[var(--md-sys-color-on-surface-variant)]">Reading artifact…</div>}

      {state === 'error' && (
        <div role="alert" className="m-4 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          Could not read this artifact.
        </div>
      )}

      {state === 'unavailable' && (
        <div className="p-4 space-y-3">
          <div className="px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
            {data?.body_error || data?.error || 'No artifact was recorded for this call.'}
          </div>
          <Block title="What is still known">
            <Field label="id" value={data?.id} />
            <Field label="at" value={data?.at} />
            <Field label="error summary" value={data?.error_summary} mono={false} />
          </Block>
        </div>
      )}

      {state === 'ready' && body && (
        <>
          <nav className="flex gap-1 px-3 py-2 border-b border-[var(--md-sys-color-outline-variant)]" role="tablist">
            {TABS.map((t) => {
              const msgs = body.request?.messages ?? [];
              const badge = t.id === 'messages' && msgs.length ? msgs.length : null;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors duration-150 ${
                    tab === t.id
                      ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-medium'
                      : 'text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]'
                  }`}
                >
                  {t.label}
                  {badge ? <span className="ml-1.5 opacity-70">{badge}</span> : null}
                </button>
              );
            })}
          </nav>

          <div className="flex-1 min-h-0 overflow-auto p-4 space-y-4">
            {tab === 'summary' && (
              <>
                <Block title="Call">
                  <Field label="id" value={body.summary?.id} />
                  <Field label="timestamp" value={body.summary?.timestamp} />
                  <Field label="endpoint" value={`${body.summary?.method ?? ''} ${body.summary?.path ?? ''}`.trim()} />
                  <Field label="status" value={body.summary?.status} />
                  <Field label="duration" value={body.summary?.duration != null ? `${body.summary.duration} ms` : null} />
                </Block>
                <Block title="Routing">
                  <Field label="model" value={body.summary?.model} />
                  <Field label="requested model" value={body.summary?.requestedModel} />
                  <Field label="request model (sent)" value={body.request?.model} />
                  <Field label="provider" value={body.summary?.provider} />
                  <Field label="account" value={body.summary?.account} />
                  <Field label="connection" value={body.summary?.connectionId} />
                  <Field label="stream" value={String(body.request?.stream ?? '')} />
                  <Field label="reasoning effort" value={body.request?.reasoning_effort} />
                </Block>
                <Block title="Tokens">
                  <Field label="prompt" value={body.summary?.tokens?.prompt ?? body.response?.usage?.prompt_tokens} />
                  <Field label="completion" value={body.summary?.tokens?.completion ?? body.response?.usage?.completion_tokens} />
                  <Field label="total" value={body.response?.usage?.total_tokens} />
                </Block>
                {body.error && (
                  <Block title="Error">
                    <Code value={prettyJson(body.error)} />
                  </Block>
                )}
              </>
            )}

            {tab === 'request' && (
              <>
                <Block title="Headers" count={Object.keys(redactHeaders(body.request?.headers)).length}>
                  <Code value={prettyJson(redactHeaders(body.request?.headers))} />
                </Block>
                <Block title="Body (exactly as sent)">
                  <Code value={prettyJson(body.request?.body)} />
                </Block>
                {body.request?.tools?.length > 0 && (
                  <Block title="Tools" count={body.request.tools.length}>
                    <Code value={prettyJson(body.request.tools)} />
                  </Block>
                )}
              </>
            )}

            {tab === 'messages' && (
              (() => {
                const msgs = body.request?.messages ?? [];
                if (!msgs.length) return <div className="text-xs text-[var(--md-sys-color-on-surface-variant)]">No messages were captured.</div>;
                const cur = msgs[Math.min(msgIndex, msgs.length - 1)];
                return (
                  <>
                    <div className="flex items-center gap-2 text-xs">
                      <button type="button" onClick={() => setMsgIndex((i) => Math.max(0, i - 1))} disabled={msgIndex === 0}
                        className="px-2 py-1 rounded border border-[var(--md-sys-color-outline-variant)] disabled:opacity-40">Prev</button>
                      <span className="font-mono text-[var(--md-sys-color-on-surface-variant)]">
                        {msgIndex + 1} / {msgs.length}
                        {body.request?.messages_total > msgs.length ? ` of ${body.request.messages_total} total` : ''}
                      </span>
                      <button type="button" onClick={() => setMsgIndex((i) => Math.min(msgs.length - 1, i + 1))} disabled={msgIndex >= msgs.length - 1}
                        className="px-2 py-1 rounded border border-[var(--md-sys-color-outline-variant)] disabled:opacity-40">Next</button>
                      <span className="ml-2 px-2 py-0.5 rounded text-[10px] uppercase bg-[var(--md-sys-color-surface-container-high)] font-mono">
                        {cur?.role ?? 'unknown'}
                      </span>
                    </div>
                    <Code value={prettyJson(cur)} />
                  </>
                );
              })()
            )}

            {tab === 'response' && (
              <>
                <Block title="Raw response">
                  <Code value={prettyJson(body.response?.raw ?? body.response)} />
                </Block>
                {body.response?.first_choice && (
                  <Block title="First choice">
                    <Field label="role" value={body.response.first_choice.role} />
                    <Field label="finish reason" value={body.response.first_choice.finish_reason} />
                    <div className="mt-2">
                      <Code value={typeof body.response.first_choice.content === 'string'
                        ? body.response.first_choice.content
                        : prettyJson(body.response.first_choice.content)} />
                    </div>
                  </Block>
                )}
              </>
            )}

            {tab === 'pipeline' && (
              <Block title="Pipeline" count={body.pipeline?.length ?? 0}>
                <Code value={prettyJson(body.pipeline)} />
              </Block>
            )}
          </div>
        </>
      )}
    </aside>
  );
}