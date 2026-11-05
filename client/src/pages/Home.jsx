import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api';
import NavBar from '../components/NavBar.jsx';
import { fmtDate } from '../components/summaryConfig.js';

const HISTORY_KEY = 'summary_history';

function loadHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

const pad = (n) => String(n).padStart(2, '0');

function isoDaysBefore(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysBetween(a, b) {
  return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000) + 1;
}

export default function Home() {
  const [meta, setMeta] = useState(null);
  const [fileName, setFileName] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const [history, setHistory] = useState(loadHistory);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historySort, setHistorySort] = useState('newest');

  const navigate = useNavigate();
  const location = useLocation();

  // "Past summaries" in the nav bar jumps to the history list.
  useEffect(() => {
    if (location.hash === '#history') {
      document.getElementById('history')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.key, location.hash]);

  function persist(next) {
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      /* storage full or blocked: the list still works for this visit */
    }
  }

  async function upload(file) {
    setError('');
    setBusy('Reading your chat…');
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/chats', form);
      setMeta(data);
      setFileName(file.name);
      setFrom(data.firstDate);
      setTo(data.lastDate);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Check that the server is running and try again.');
    } finally {
      setBusy('');
    }
  }

  async function summarise() {
    setError('');
    setBusy('Summarising. Long chats can take up to a minute…');
    try {
      const { data } = await api.post(`/chats/${meta.id}/summarise`, { from, to });
      const item = {
        id: data.id,
        from,
        to,
        createdAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      };
      persist([item, ...history.filter((h) => h.id !== data.id)]);
      navigate('/s/' + data.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not summarise this chat');
      setBusy('');
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  const presets = meta
    ? [
        { label: 'Last 7 days', from: isoDaysBefore(meta.lastDate, 6) },
        { label: 'Last 30 days', from: isoDaysBefore(meta.lastDate, 29) },
        { label: 'Entire chat', from: meta.firstDate },
      ].map((p) => ({ ...p, from: p.from < meta.firstDate ? meta.firstDate : p.from }))
    : [];

  const shownHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    let list = history.map((h, i) => ({ ...h, _i: i }));
    if (q) {
      list = list.filter((h) => `${fmtDate(h.from)} ${fmtDate(h.to)} ${h.from} ${h.to} ${h.createdAt}`.toLowerCase().includes(q));
    }
    if (historySort === 'oldest') list.sort((a, b) => b._i - a._i);
    else if (historySort === 'range') list.sort((a, b) => (a.from < b.from ? 1 : a.from > b.from ? -1 : a._i - b._i));
    else list.sort((a, b) => a._i - b._i);
    return list;
  }, [history, historyQuery, historySort]);

  function removeItem(id) {
    persist(history.filter((h) => h.id !== id));
  }

  function clearAll() {
    if (window.confirm('Clear this list? This only removes the links on this device. It does not delete any summary.')) {
      persist([]);
    }
  }

  const rangeValid = from && to && from <= to;

  return (
    <>
      <NavBar />
      <main className="page">
        <section className="hero">
          <div>
            <h1 className="rise" style={{ '--d': 0.1 }}>Turn a long group chat into a one-page brief</h1>
            <p className="lead rise" style={{ '--d': 0.25 }}>
              Upload an exported WhatsApp chat and get the decisions, dues, complaints, events and unanswered
              questions on one page. Phone numbers are masked before anything is sent to the AI.
            </p>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="floaty f1" data-tone="teal">
              <span className="tag">Decided</span>
              <p>Main gate will close at 10 PM from next month</p>
            </div>
            <div className="floaty f2" data-tone="ochre">
              <span className="tag">Payment</span>
              <p>Maintenance is due on the 10th</p>
              <span className="amt">₹2,500 from 14 flats</span>
            </div>
            <div className="floaty f3" data-tone="brick">
              <span className="tag">Complaint</span>
              <p>Lift in Block B stops between floors</p>
            </div>
            <div className="floaty f4" data-tone="indigo">
              <span className="tag">Event</span>
              <p>Water tank cleaning on Saturday, 10 AM</p>
            </div>
            <div className="floaty f5" data-tone="plum">
              <span className="tag">Unanswered</span>
              <p>Who has the clubhouse key?</p>
            </div>
          </div>
        </section>

        <div className="home-grid">
          <div className="flow">
            <section className="panel rise" style={{ '--d': 0.4 }} aria-labelledby="step-1">
              <header className="panel-head">
                <span className="step" aria-hidden="true">1</span>
                <h2 id="step-1">Upload your chat</h2>
              </header>

              <input
                id="chat"
                className="sr-only"
                type="file"
                accept=".txt,text/plain"
                disabled={!!busy}
                onChange={(e) => {
                  if (e.target.files[0]) upload(e.target.files[0]);
                  e.target.value = '';
                }}
              />
              <label
                htmlFor="chat"
                className={'drop' + (dragging ? ' over' : '')}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                <svg className="drop-border" aria-hidden="true"><rect /></svg>
                <span className="drop-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="drop-text">
                  <b>{meta ? fileName || 'Chat loaded' : 'Drop the exported .txt file here'}</b>
                  <span className="muted">{meta ? 'Choose a different file' : 'or choose it from your device'}</span>
                </span>
              </label>

              {meta && (
                <dl className="stats inline">
                  <div><dt>Messages</dt><dd>{meta.messageCount.toLocaleString()}</dd></div>
                  <div><dt>Senders</dt><dd>{meta.participants}</dd></div>
                  <div><dt>Covers</dt><dd>{fmtDate(meta.firstDate)} to {fmtDate(meta.lastDate)}</dd></div>
                </dl>
              )}

              <details className="how">
                <summary>How do I export a chat?</summary>
                <p>
                  Open the group in WhatsApp. On Android, tap the three dots, then More, then Export chat. On iPhone,
                  tap the group name, then Export Chat. Choose Without media and save the .txt file.
                </p>
              </details>
            </section>

            <section className={'panel rise' + (meta ? ' unlocked' : ' locked')} style={{ '--d': 0.55 }} aria-labelledby="step-2">
              <header className="panel-head">
                <span className="step" aria-hidden="true">2</span>
                <h2 id="step-2">Choose the period</h2>
              </header>

              {!meta ? (
                <p className="muted">Upload a chat first. The dates it covers will appear here.</p>
              ) : (
                <>
                  <div className="presets" role="group" aria-label="Quick ranges">
                    {presets.map((p) => (
                      <button
                        key={p.label}
                        className="tab"
                        aria-pressed={from === p.from && to === meta.lastDate}
                        onClick={() => { setFrom(p.from); setTo(meta.lastDate); }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="row">
                    <label className="field">
                      <span>From</span>
                      <input type="date" value={from} min={meta.firstDate} max={to || meta.lastDate} onChange={(e) => setFrom(e.target.value)} />
                    </label>
                    <label className="field">
                      <span>To</span>
                      <input type="date" value={to} min={from || meta.firstDate} max={meta.lastDate} onChange={(e) => setTo(e.target.value)} />
                    </label>
                  </div>

                  <div className="actions">
                    <button className="primary" disabled={!!busy || !rangeValid} onClick={summarise}>
                      {busy && busy.startsWith('Summarising') ? 'Summarising…' : 'Summarise'}
                    </button>
                    {rangeValid && <span className="muted">{daysBetween(from, to)} {daysBetween(from, to) === 1 ? 'day' : 'days'} selected</span>}
                  </div>
                </>
              )}
            </section>

            {busy && <p className="status" role="status">{busy}</p>}
            {error && <p className="error" role="alert">{error}</p>}
          </div>

          <aside id="history" className="panel history rise" style={{ '--d': 0.7 }} aria-labelledby="history-title">
            <header className="panel-head split">
              <h2 id="history-title">Past summaries</h2>
              {history.length > 0 && <button className="link" onClick={clearAll}>Clear list</button>}
            </header>

            {history.length === 0 ? (
              <p className="muted">Summaries you create appear here so you can reopen them later.</p>
            ) : (
              <>
                {history.length > 1 && (
                  <div className="history-tools">
                    <label className="search">
                      <span className="sr-only">Search past summaries</span>
                      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                        <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <input type="search" placeholder="Search by date" value={historyQuery} onChange={(e) => setHistoryQuery(e.target.value)} />
                    </label>
                    <label className="sort">
                      <span>Sort</span>
                      <select value={historySort} onChange={(e) => setHistorySort(e.target.value)}>
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="range">By period</option>
                      </select>
                    </label>
                  </div>
                )}

                {shownHistory.length === 0 ? (
                  <p className="muted">No summaries match “{historyQuery.trim()}”.</p>
                ) : (
                  <ul className="history-list">
                    {shownHistory.map((item, idx) => (
                      <li key={item.id} style={{ '--i': Math.min(idx, 10) }}>
                        <Link to={`/s/${item.id}`} className="history-link">
                          <span className="history-range">{fmtDate(item.from)} to {fmtDate(item.to)}</span>
                          <span className="muted small">Created {item.createdAt}</span>
                        </Link>
                        <button className="icon-btn" onClick={() => removeItem(item.id)} aria-label={`Remove summary for ${fmtDate(item.from)} to ${fmtDate(item.to)} from the list`}>
                          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="muted small history-foot">Kept on this device only.</p>
              </>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}