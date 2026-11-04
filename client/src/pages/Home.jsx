import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Home() {
  const [meta, setMeta] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
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
          <p className="muted">
            {meta.messageCount.toLocaleString()} messages from {meta.participants} senders, {meta.firstDate} to {meta.lastDate}
          </p>
        )}
      </section>

      {meta && (
        <section className="card">
          <h2>2. Pick a date range</h2>
          <div className="row">
            <label>From <input type="date" value={from} min={meta.firstDate} max={to || meta.lastDate} onChange={(e) => setFrom(e.target.value)} /></label>
            <label>To <input type="date" value={to} min={from || meta.firstDate} max={meta.lastDate} onChange={(e) => setTo(e.target.value)} /></label>
          </div>
          <button className="primary" disabled={!!busy || !from || !to} onClick={summarise}>Summarise</button>
        </section>
      )}

      {busy && <p className="status" role="status">{busy}</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </main>
  );
}