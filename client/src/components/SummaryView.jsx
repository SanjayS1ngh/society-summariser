import { useMemo, useState } from 'react';
import {
  SORTS,
  buildSections,
  facts,
  fmtDate,
  fmtTime,
  itemText,
  toWhatsAppText,
} from './summaryConfig.js';

// One small button per source message. Click it to read the original message.
function Sources({ ids = [], sources }) {
  const [open, setOpen] = useState(null);
  const valid = ids.filter((id) => sources[id]);
  if (!valid.length) return null;
  return (
    <div className="sources">
      <span className="sources-label">Source</span>
      {valid.map((id) => (
        <button
          key={id}
          className={open === id ? 'chip on' : 'chip'}
          aria-expanded={open === id}
          onClick={() => setOpen(open === id ? null : id)}
        >
          {fmtTime(sources[id].ts)}
        </button>
      ))}
      {open && sources[open] && (
        <blockquote className="quote">
          <b>{sources[open].sender}</b>: {sources[open].text}
        </blockquote>
      )}
    </div>
  );
}

export default function SummaryView({ data }) {
  const { result, sources, usage } = data;
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('chat');
  const [note, setNote] = useState('');

  const trimmed = query.trim();
  const sections = useMemo(() => buildSections(result, sources, { query: trimmed, sort }), [result, sources, trimmed, sort]);
  const everything = useMemo(() => buildSections(result, sources), [result, sources]);

  const shown = filter === 'all' ? sections : sections.filter((s) => s.id === filter);
  const matchCount = sections.reduce((n, s) => n + s.items.length, 0);
  const totalCount = everything.reduce((n, s) => n + s.items.length, 0);
  const shownCount = shown.reduce((n, s) => n + s.items.length, 0);
  const isFiltered = filter !== 'all' || trimmed !== '';

  function reset() {
    setFilter('all');
    setQuery('');
    setSort('chat');
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(toWhatsAppText(data, shown));
      setNote('Copied. Paste it into WhatsApp.');
    } catch {
      setNote('Could not copy. Allow clipboard access and try again.');
    }
    setTimeout(() => setNote(''), 3000);
  }

  return (
    <article className="summary">
      <header className="summary-head">
        <h1>Group summary</h1>
        <p className="summary-period">{fmtDate(data.from)} to {fmtDate(data.to)}</p>
        <dl className="stats">
          <div><dt>Messages read</dt><dd>{data.messageCount.toLocaleString()}</dd></div>
          <div><dt>Items found</dt><dd>{totalCount}</dd></div>
        </dl>
        <p className="muted small print-only">Phone numbers are masked.</p>
      </header>

      {result.warnings?.map((w) => <p key={w} className="warn" role="alert">{w}</p>)}

      <div className="rail no-print">
        <div className="tabs" role="group" aria-label="Show section">
          <button className="tab" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
            All <span className="tab-count">{matchCount}</span>
          </button>
          {sections.map((s) => (
            <button
              key={s.id}
              className="tab"
              data-tone={s.tone}
              aria-pressed={filter === s.id}
              onClick={() => setFilter(filter === s.id ? 'all' : s.id)}
            >
              <span className="dot" aria-hidden="true" />
              {s.short} <span className="tab-count">{s.items.length}</span>
            </button>
          ))}
        </div>

        <div className="tools">
          <label className="search">
            <span className="sr-only">Search the summary</span>
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Search names, amounts, messages"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          <label className="sort">
            <span>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>

          <button className="btn small" onClick={copy}>Copy for WhatsApp</button>
          {(isFiltered || sort !== 'chat') && <button className="btn ghost small" onClick={reset}>Reset</button>}
        </div>
        <p className="rail-note" role="status">
          {note || (isFiltered ? `Showing ${shownCount} of ${totalCount} items` : '')}
        </p>
      </div>

      {trimmed && shownCount === 0 && (
        <div className="empty">
          <p><b>No items match “{trimmed}”.</b></p>
          <p className="muted">Check the spelling, try a shorter word, or clear the search.</p>
          <button className="btn small" onClick={reset}>Clear search</button>
        </div>
      )}

      {shown.map((s, sIdx) => {
        if (trimmed && s.items.length === 0) return null;
        return (
          <section key={s.id} id={`sec-${s.id}`} className="block" data-tone={s.tone} style={{ '--s': Math.min(sIdx, 5) }}>
            <h2>
              <span className="dot" aria-hidden="true" />
              {s.title}
              <span className="count">{s.items.length}</span>
            </h2>
            {s.items.length === 0 ? (
              <p className="muted">Nothing found for this period.</p>
            ) : (
              <ul className="items" key={sort}>
                {s.items.map((item, idx) => (
                  <li key={`${s.id}-${item._k}`} className="item" style={{ '--i': Math.min(idx, 8) }}>
                    <p className="item-text">{itemText(item)}</p>
                    {facts(item).length > 0 && (
                      <dl className="facts">
                        {facts(item).map(([label, value]) => (
                          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                        ))}
                      </dl>
                    )}
                    <Sources ids={item.sources} sources={sources} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {usage && (
        <footer className="usage no-print">
          {usage.chunks} parts read &middot; {usage.calls} AI calls &middot; {(usage.inputTokens + usage.outputTokens).toLocaleString()} tokens &middot; cost ${usage.costUSD?.toFixed(4)}
        </footer>
      )}
    </article>
  );
}