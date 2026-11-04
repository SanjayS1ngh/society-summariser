import { useState } from 'react';

const SECTIONS = [
  { title: 'Decisions made', key: 'decisions', keep: (i) => i.status === 'decided' },
  { title: 'Discussed, not decided', key: 'decisions', keep: (i) => i.status !== 'decided' },
  { title: 'Pending payments', key: 'payments' },
  { title: 'Complaints', key: 'complaints' },
  { title: 'Upcoming events', key: 'events' },
  { title: 'Questions nobody answered', key: 'unanswered' },
];

function formatTime(ts) {
  return new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

// One small button per source message. Click it to read the original message.
function Sources({ ids, sources }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="sources">
      {ids.filter((id) => sources[id]).map((id) => (
        <button
          key={id}
          className={open === id ? 'chip on' : 'chip'}
          aria-expanded={open === id}
          onClick={() => setOpen(open === id ? null : id)}
        >
          {formatTime(sources[id].ts)}
        </button>
      ))}
      {open && (
        <blockquote className="quote">
          <b>{sources[open].sender}</b>: {sources[open].text}
        </blockquote>
      )}
    </div>
  );
}

function details(item) {
  const bits = [];
  if (item.amount) bits.push('Amount: ' + item.amount);
  if (item.dueDate) bits.push('Due: ' + item.dueDate);
  if (item.owedBy?.length) bits.push('Owed by: ' + item.owedBy.join(', '));
  if (item.raisedBy) bits.push('Raised by: ' + item.raisedBy);
  if (item.askedBy) bits.push('Asked by: ' + item.askedBy);
  if (item.when) bits.push('When: ' + item.when);
  if (item.status && item.status !== 'decided') bits.push('Status: ' + item.status);
  return bits.join(' \u00b7 ');
}

export default function SummaryView({ data }) {
  const { result, sources, usage } = data;
  return (
    <article className="summary">
      <header>
        <h1>Group summary</h1>
        <p className="muted">
          {data.from} to {data.to} &middot; {data.messageCount.toLocaleString()} messages &middot; Phone numbers are masked
        </p>
      </header>

      {result.warnings?.map((w) => <p key={w} className="warn" role="alert">{w}</p>)}

      {SECTIONS.map((s) => {
        const items = (result[s.key] || []).filter(s.keep || (() => true));
        return (
          <section key={s.title} className="block">
            <h2>{s.title} <span className="count">{items.length}</span></h2>
            {items.length === 0 && <p className="muted">Nothing found.</p>}
            <ul>
              {items.map((item, idx) => (
                <li key={idx}>
                  <p>{item.text || item.question}</p>
                  {details(item) && <p className="meta">{details(item)}</p>}
                  <Sources ids={item.sources} sources={sources} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {usage && (
        <footer className="muted no-print">
          {usage.chunks} parts read &middot; {usage.calls} AI calls &middot; {(usage.inputTokens + usage.outputTokens).toLocaleString()} tokens &middot; cost ${usage.costUSD?.toFixed(4)}
        </footer>
      )}
    </article>
  );
}