import { Route, Routes } from 'react-router-dom'
import TopNav from './components/TopNav'
import Dashboard from './pages/Dashboard'
import Watchlist from './pages/Watchlist'
import Compare from './pages/Compare'
import Portfolio from './pages/Portfolio'
import Advice from './pages/Advice'

export default function App() {
  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <TopNav />
      <Routes>
        <Route path="/" element={<Portfolio />} />
        <Route path="/stock/:companyId" element={<Dashboard />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/advice" element={<Advice />} />
      </Routes>
    </div>
  )
}
