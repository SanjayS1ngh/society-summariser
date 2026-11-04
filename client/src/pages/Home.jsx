import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Home() {
  const [meta, setMeta] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  
  // 1. Load summary history from localStorage on startup
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('summary_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const navigate = useNavigate();

  async function upload(file) {
    setError('');
    setBusy('Reading your chat...');
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/chats', form);
      setMeta(data);
      setFrom(data.firstDate);
      setTo(data.lastDate);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Is the server running?');
    } finally {
      setBusy('');
    }
  }

  async function summarise() {
    setError('');
    setBusy('Summarising. Long chats can take up to a minute...');
    try {
      const { data } = await api.post(`/chats/${meta.id}/summarise`, { from, to });
      
      // 2. Save new summary reference into history array
      const newSummaryItem = {
        id: data.id,
        from,
        to,
        createdAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      };
      
      const updatedHistory = [newSummaryItem, ...history.filter(h => h.id !== data.id)];
      setHistory(updatedHistory);
      localStorage.setItem('summary_history', JSON.stringify(updatedHistory));

      navigate('/s/' + data.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not summarise this chat');
      setBusy('');
    }
  }

  return (
    <main className="page narrow">
      <h1>Society Group Summariser</h1>
      <p className="muted">
        Upload an exported WhatsApp chat and get the decisions, dues, complaints, events and unanswered
        questions on one page. Phone numbers are masked before anything is sent to the AI.
      </p>

      <section className="card">
        <h2>1. Upload your chat</h2>
        <label className="btn" htmlFor="chat">{meta ? 'Choose a different file' : 'Choose the .txt file'}</label>
        <input
          id="chat"
          type="file"
          accept=".txt,text/plain"
          hidden
          disabled={!!busy}
          onChange={(e) => {
            if (e.target.files[0]) upload(e.target.files[0]);
            e.target.value = '';
          }}
        />
        {meta && (
          <p className="muted" style={{ marginTop: '10px' }}>
            {meta.messageCount.toLocaleString()} messages from {meta.participants} senders, {meta.firstDate} to {meta.lastDate}
          </p>
        )}
      </section>

      {meta && (
        <section className="card" style={{ marginTop: '24px' }}>
          <h2>2. Pick a date range</h2>
          <div className="row" style={{ margin: '14px 0' }}>
            <label>From <input type="date" value={from} min={meta.firstDate} max={to || meta.lastDate} onChange={(e) => setFrom(e.target.value)} /></label>
            <label>To <input type="date" value={to} min={from || meta.firstDate} max={meta.lastDate} onChange={(e) => setTo(e.target.value)} /></label>
          </div>
          <button className="primary" style={{ marginTop: '8px' }} disabled={!!busy || !from || !to} onClick={summarise}>Summarise</button>
        </section>
      )}

      {busy && <p className="status" role="status" style={{ marginTop: '16px' }}>{busy}</p>}
      {error && <p className="error" role="alert" style={{ marginTop: '16px' }}>{error}</p>}

      {/* 3. Previous Summaries Section */}
      {history.length > 0 && (
        <section className="card" style={{ marginTop: '32px' }}>
          <h2>Previous Summaries</h2>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            {history.map((item) => (
              <li key={item.id} style={{ borderLeft: '3px solid #0f766e', paddingLeft: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Link to={`/s/${item.id}`} style={{ fontWeight: '500', color: 'inherit', textDecoration: 'none' }}>
                    Range: {item.from} to {item.to}
                  </Link>
                  <p className="muted" style={{ fontSize: '12px', margin: '2px 0 0' }}>Generated on {item.createdAt}</p>
                </div>
                <Link to={`/s/${item.id}`} className="btn" style={{ fontSize: '13px', padding: '6px 12px', textDecoration: 'none' }}>View</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}