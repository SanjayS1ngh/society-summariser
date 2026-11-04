import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import SummaryPage from './pages/SummaryPage.jsx';

export default function App() {
  return (
    <>

      <img src="/tHi.gif" alt="" className="cartoon-character cartoon-walker" />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/s/:id" element={<SummaryPage />} />
      </Routes>
    </>
  );
}