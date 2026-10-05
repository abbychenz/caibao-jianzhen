import { Link } from 'react-router-dom'

function fmtNumber(n, digits = 0) {
  if (n == null) return '—'
  return new Intl.NumberFormat('zh-TW', { maximumFractionDigits: digits }).format(n)
}

const REC_STYLE = {
  核心: 'bg-emerald-50 text-emerald-700',
  衛星: 'bg-amber-50 text-amber-700',
  觀察中: 'bg-red-50 text-red-700',
}

export default function HoldingsTable({ holdings, onAddClick }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 text-sm text-gray-500 border-b border-gray-200">我的持股</div>

      {holdings.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-gray-400">
          還沒有任何持股，點下方按鈕新增第一筆交易紀錄
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
              <th className="px-6 py-2 font-normal">股票</th>
              <th className="px-6 py-2 font-normal text-right">股數</th>
              <th className="px-6 py-2 font-normal text-right">平均成本</th>
              <th className="px-6 py-2 font-normal text-right">現價</th>
              <th className="px-6 py-2 font-normal text-right">損益</th>
              <th className="px-6 py-2 font-normal text-right">健診分數</th>
              <th className="px-6 py-2 font-normal text-right">建議配置</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => {
              const pnlPositive = (h.unrealizedPnl ?? 0) >= 0
              return (
                <tr key={h.companyId} className="border-b border-gray-50 last:border-0">
                  <td className="px-6 py-3">
                    <Link to={`/stock/${h.companyId}`} className="font-medium text-gray-900 hover:text-emerald-700">
                      {h.companyId} {h.name}
                    </Link>
                    <div className="text-xs text-gray-400">{h.industry}</div>
                  </td>
                  <td className="px-6 py-3 text-right text-gray-700">{fmtNumber(h.shares)}</td>
                  <td className="px-6 py-3 text-right text-gray-700">{fmtNumber(h.avgCost, 2)}</td>
                  <td className="px-6 py-3 text-right text-gray-700">
                    {h.priceUnavailable ? (
                      <span className="text-gray-400" title="查無即時股價（可能是上櫃股票）">
                        查無報價
                      </span>
                    ) : (
                      fmtNumber(h.currentPrice, 2)
                    )}
                  </td>
                  <td className={`px-6 py-3 text-right font-medium ${h.priceUnavailable ? 'text-gray-400' : pnlPositive ? 'text-emerald-700' : 'text-red-600'}`}>
                    {h.priceUnavailable
                      ? '—'
                      : `${pnlPositive ? '+' : ''}${fmtNumber(h.unrealizedPnl)} (${h.unrealizedPnlPct > 0 ? '+' : ''}${h.unrealizedPnlPct}%)`}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {h.score != null ? (
                      <span
                        className={`font-semibold ${
                          h.score >= 75 ? 'text-emerald-700' : h.score >= 55 ? 'text-amber-600' : 'text-red-600'
                        }`}
                      >
                        {h.score}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {h.recommendation ? (
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${REC_STYLE[h.recommendation.label] || 'bg-gray-50 text-gray-600'}`}
                      >
                        {h.recommendation.label}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <div className="px-6 py-3 border-t border-gray-100 text-right">
        <button onClick={onAddClick} className="text-sm text-emerald-700 font-medium hover:text-emerald-800">
          + 新增交易紀錄（買進 / 賣出）
        </button>
      </div>
    </div>
  )
}
