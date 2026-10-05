import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchWatchlist } from '../lib/api'
import ScoreBadge from '../components/ScoreBadge'

const YEAR = '113'
const SEASON = '4'

export default function Watchlist() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchWatchlist(YEAR, SEASON)
      .then((data) => setItems(data.items))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const sorted = [...items].sort(
    (a, b) => (b['綜合評分'] ?? -1) - (a['綜合評分'] ?? -1)
  )

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">觀察名單</h1>
          <p className="text-sm text-gray-500 mt-1">
            {YEAR} 年第 {SEASON} 季財報，資料來源：公開資訊觀測站 (MOPS)
          </p>
        </div>
      </div>

      {loading && <p className="text-gray-500">資料讀取中…</p>}
      {error && (
        <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
          讀取失敗：{error}
        </p>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="px-6 py-3 font-medium">股票</th>
                <th className="px-6 py-3 font-medium">ROE</th>
                <th className="px-6 py-3 font-medium">負債比</th>
                <th className="px-6 py-3 font-medium">現金流品質</th>
                <th className="px-6 py-3 font-medium">淨利率</th>
                <th className="px-6 py-3 font-medium">綜合評分</th>
                <th className="px-6 py-3 font-medium">狀態</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr
                  key={row['股票代號']}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    {row['狀態'] === 'OK' ? (
                      <Link
                        to={`/stock/${row['股票代號']}`}
                        className="font-medium text-gray-900 hover:text-emerald-700"
                      >
                        {row['股票代號']} {row.name}
                      </Link>
                    ) : (
                      <span className="font-medium text-gray-900">
                        {row['股票代號']}
                      </span>
                    )}
                    <div className="text-xs text-gray-400">{row.industry}</div>
                  </td>
                  <td className="px-6 py-4">
                    {row['ROE'] != null ? `${row['ROE']}%` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {row['負債比'] != null ? `${row['負債比']}%` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {row['現金流品質'] != null ? `${row['現金流品質']}x` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {row['淨利率'] != null ? `${row['淨利率']}%` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <ScoreBadge score={row['綜合評分']} />
                  </td>
                  <td className="px-6 py-4">
                    {row['狀態'] === 'OK' ? (
                      <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                        正常
                      </span>
                    ) : (
                      <span
                        className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full"
                        title={row['狀態']}
                      >
                        失敗
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        ※
        本頁 ROE、負債比、現金流品質、淨利率為真實財報數字，直接計算自
        MOPS 公開資料；綜合評分為示範用簡易加權公式，僅供參考，不構成投資建議。
        本益比、ESG 評等因需另接股價與永續報告資料源，尚未串接。
      </p>
    </div>
  )
}
