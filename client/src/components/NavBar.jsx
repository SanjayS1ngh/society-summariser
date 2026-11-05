import { Link, useLocation } from 'react-router-dom';

export default function NavBar() {
  const { pathname, hash } = useLocation();
  const onHistory = pathname === '/' && hash === '#history';
  const onNew = pathname === '/' && !onHistory;
  const onSummary = pathname.startsWith('/s/');

  return (
    <header className="nav no-print">
      <nav className="nav-inner" aria-label="Main">
        <Link to="/" className="brand">
          <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="currentColor" />
            <path d="M9 10.5h14M9 15.5h14M9 20.5h8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </svg>
          <span>Society Summariser</span>
        </Link>

        <ul className="nav-links">
          <li>
            <Link to="/" className="nav-link" aria-current={onNew ? 'page' : undefined}>New summary</Link>
          </li>
          <li>
            <Link to="/#history" className="nav-link" aria-current={onHistory ? 'page' : undefined}>Past summaries</Link>
          </li>
          {onSummary && (
            <li>
              <span className="nav-link" aria-current="page">Summary</span>
            </li>
          )}
        </ul>

        <span className="nav-note">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2M3.5 7h9v6.5h-9z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          Phone numbers are masked
        </span>
      </nav>
    </header>
  );
}