// 純前端組字：依現有持股資料生成一段「今日投資健診摘要」白話文，
// 不呼叫額外的 AI 服務，避免產生非預期的費用，純粹是把已經算好的數字組成句子。
function buildSummary(summary) {
  const holdings = summary.holdings || []
  if (holdings.length === 0) {
    return '你目前還沒有任何持股紀錄，點下面「新增交易紀錄」開始記錄你的第一筆投資吧。'
  }

  const core = holdings.filter((h) => h.recommendation?.label === '核心')
  const satellite = holdings.filter((h) => h.recommendation?.label === '衛星')
  const watch = holdings.filter((h) => h.recommendation?.label === '觀察中')

  const parts = []

  const pnlPct = summary.unrealizedPnlPct
  if (pnlPct != null) {
    parts.push(
      `你目前持有 ${holdings.length} 檔股票，整體未實現報酬率 ${pnlPct > 0 ? '+' : ''}${pnlPct}%。`
    )
  } else {
    parts.push(`你目前持有 ${holdings.length} 檔股票。`)
  }

  if (core.length > 0) {
    parts.push(
      `其中 ${core.length} 檔（${core.map((h) => h.name || h.companyId).join('、')}）體質強健，建議繼續核心配置；`
    )
  }
  if (watch.length > 0) {
    parts.push(
      `${watch.length} 檔（${watch.map((h) => h.name || h.companyId).join('、')}）健診分數偏低，建議重新檢視體質是否轉弱；`
    )
  }
  if (satellite.length > 0) {
    parts.push(`${satellite.length} 檔屬於衛星配置，體質中等，可持續觀察。`)
  }

  const topIndustry = (summary.industryAllocation || [])[0]
  if (topIndustry && topIndustry.pct >= 50) {
    parts.push(`整體資產配置集中度：${topIndustry.industry} 佔 ${topIndustry.pct}%，建議留意產業過度集中風險。`)
  }

  const priceUnavailableCount = holdings.filter((h) => h.priceUnavailable).length
  if (priceUnavailableCount > 0) {
    parts.push(`（有 ${priceUnavailableCount} 檔股票查無即時股價，可能是上櫃股票，暫不計入市值計算。）`)
  }

  return parts.join('')
}

export default function InsightSummary({ summary }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-900 text-white text-xs">
          ✓
        </span>
        <div className="text-sm font-medium text-gray-800">今日投資健診摘要</div>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{buildSummary(summary)}</p>
    </div>
  )
}
