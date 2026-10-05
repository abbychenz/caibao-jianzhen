import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPortfolioSummary } from '../lib/api'
import { useDefaultPeriod } from '../lib/period'
import SummaryCards from '../components/portfolio/SummaryCards'
import InsightSummary from '../components/portfolio/InsightSummary'
import HoldingsTable from '../components/portfolio/HoldingsTable'
import IndustryPieChart from '../components/portfolio/IndustryPieChart'
import AddTransactionModal from '../components/portfolio/AddTransactionModal'
import ProfileForm from '../components/profile/ProfileForm'

function todayLabel() {
  return new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())
}

export default function Portfolio() {
  const period = useDefaultPeriod()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  function load() {
    if (!period) return
    setLoading(true)
    setError(null)
    fetchPortfolioSummary(period.year, period.season)
      .then(setSummary)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [period])

  if (!period || loading) {
    return <div className="max-w-6xl mx-auto px-8 py-8 text-gray-500">資料讀取中…</div>
  }
  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-8 py-8">
        <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">讀取失敗：{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">個人資訊</h1>
        <p className="text-sm text-gray-500 mt-1">{todayLabel()}・讓系統更了解你，給你更貼身的投資建議</p>
      </div>

      <ProfileForm />

      <SummaryCards summary={summary} />

      <InsightSummary summary={summary} />

      <HoldingsTable holdings={summary.holdings} onAddClick={() => setShowAddModal(true)} />

      <div className="grid grid-cols-3 gap-4">
        <IndustryPieChart allocation={summary.industryAllocation} />
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-sm text-gray-500 mb-3">快速動作</div>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/compare"
              className="border border-gray-200 rounded-lg px-4 py-3 text-sm text-left hover:bg-gray-50"
            >
              📊 比較兩檔持股體質
            </Link>
            <Link
              to="/watchlist"
              className="border border-gray-200 rounded-lg px-4 py-3 text-sm text-left hover:bg-gray-50"
            >
              🔍 查看觀察名單
            </Link>
            <button
              onClick={() => setShowAddModal(true)}
              className="border border-gray-200 rounded-lg px-4 py-3 text-sm text-left hover:bg-gray-50"
            >
              💰 記一筆買賣交易
            </button>
            {summary.holdings[0] && (
              <Link
                to={`/stock/${summary.holdings[0].companyId}`}
                className="border border-gray-200 rounded-lg px-4 py-3 text-sm text-left hover:bg-gray-50"
              >
                📈 查看深度財務分析
              </Link>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        ※ 股價資料來源：台灣證交所 OpenAPI（僅涵蓋上市股票，上櫃股票暫查無報價）。
        持股健診分數計算自 MOPS 公開財報資料，非投資建議，請自行判斷投資決策。
      </p>

      {showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false)
            load()
          }}
        />
      )}
    </div>
  )
}
