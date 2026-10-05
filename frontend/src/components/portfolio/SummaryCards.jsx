function fmtMoney(n) {
  if (n == null) return '—'
  const sign = n > 0 ? '+ ' : n < 0 ? '- ' : ''
  return `${sign}NT$ ${new Intl.NumberFormat('zh-TW').format(Math.round(Math.abs(n)))}`
}

export default function SummaryCards({ summary }) {
  const pnlPositive = (summary.unrealizedPnl ?? 0) >= 0
  const realizedPositive = (summary.realizedPnl ?? 0) >= 0

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="text-sm text-gray-500 mb-2">總投入成本</div>
        <div className="text-2xl font-semibold text-gray-900">
          NT$ {new Intl.NumberFormat('zh-TW').format(Math.round(summary.totalCost))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="text-sm text-gray-500 mb-2">目前市值</div>
        <div className="text-2xl font-semibold text-gray-900">
          NT$ {new Intl.NumberFormat('zh-TW').format(Math.round(summary.totalMarketValue))}
        </div>
      </div>
      <div
        className={`rounded-xl border p-5 ${
          pnlPositive ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
        }`}
      >
        <div className={`text-sm mb-2 ${pnlPositive ? 'text-emerald-700' : 'text-red-700'}`}>未實現損益</div>
        <div className={`text-2xl font-semibold ${pnlPositive ? 'text-emerald-700' : 'text-red-700'}`}>
          {fmtMoney(summary.unrealizedPnl)}
        </div>
        {summary.unrealizedPnlPct != null && (
          <div className={`text-xs mt-1 ${pnlPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {summary.unrealizedPnlPct > 0 ? '+' : ''}
            {summary.unrealizedPnlPct}%
          </div>
        )}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="text-sm text-gray-500 mb-2">已實現損益（累積）</div>
        <div className={`text-2xl font-semibold ${realizedPositive ? 'text-gray-900' : 'text-red-600'}`}>
          {fmtMoney(summary.realizedPnl)}
        </div>
      </div>
    </div>
  )
}
