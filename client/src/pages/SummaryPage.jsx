import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import SummaryView from '../components/SummaryView.jsx';

export default function SummaryPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/summaries/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Could not load this summary'));
  }, [id]);

  return (
    <main className="page">
      <div className="toolbar no-print">
        <Link to="/">New summary</Link>
        {data && <button className="primary" onClick={() => window.print()}>Print or save as PDF</button>}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {!data && !error && <p className="muted">Loading...</p>}
      {data && <SummaryView data={data} />}
    </main>
  );
}