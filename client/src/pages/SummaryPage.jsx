import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import NavBar from '../components/NavBar.jsx';
import SummaryView from '../components/SummaryView.jsx';

export default function SummaryPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    setError('');
    api
      .get(`/summaries/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Could not load this summary'));
  }, [id]);

  return (
    <>
      <NavBar />
      <main className="page reading">
        <div className="toolbar no-print">
          <Link to="/" className="btn ghost small">&lsaquo; New summary</Link>
          {data && <button className="primary small" onClick={() => window.print()}>Print or save as PDF</button>}
        </div>

        {error && (
          <div className="error" role="alert">
            <p>{error}</p>
            <p className="small">Go back and create the summary again, or check that the server is running.</p>
          </div>
        )}
        {!data && !error && <p className="status" role="status">Loading summary</p>}
        {data && <SummaryView data={data} />}
      </main>
    </>
  );
}