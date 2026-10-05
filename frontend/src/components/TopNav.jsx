import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          isActive
            ? 'bg-emerald-900 text-white'
            : 'text-gray-600 hover:bg-gray-100'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

export default function TopNav() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    const code = query.trim()
    if (!code) return
    navigate(`/stock/${code}`)
  }

  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-2 font-semibold text-lg text-gray-900">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-900 text-white text-sm">
          富
        </span>
        財富管家
      </div>

      <form onSubmit={handleSubmit} className="flex-1 max-w-md mx-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋股票代號，例如 2330，按 Enter 查詢"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm outline-none focus:border-emerald-700"
        />
      </form>

      <nav className="flex items-center gap-1">
        <NavItem to="/">個人資訊</NavItem>
        <NavItem to="/watchlist">觀察名單</NavItem>
        <NavItem to="/compare">財報比較</NavItem>
        <NavItem to="/advice">投資建議</NavItem>
      </nav>

      <div className="ml-6 flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-700 font-medium text-sm">
        陳
      </div>
    </header>
  )
}
