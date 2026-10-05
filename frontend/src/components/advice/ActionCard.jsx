import { Link } from 'react-router-dom'

const COLOR_STYLE = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  gray: 'bg-gray-50 text-gray-600 border-gray-200',
  red: 'bg-red-50 text-red-700 border-red-200',
}

export default function ActionCard({ holding }) {
  if (holding.action === null) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="font-medium text-gray-900">
          {holding.companyId} {holding.name}
        </div>
        <p className="text-sm text-red-500 mt-2">分析失敗：{holding.error}</p>
      </div>
    )
  }

  const style = COLOR_STYLE[holding.actionColor] || COLOR_STYLE.gray

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <Link
            to={`/stock/${holding.companyId}`}
            className="font-semibold text-gray-900 hover:text-emerald-700"
          >
            {holding.companyId} {holding.name}
          </Link>
          <div className="text-xs text-gray-400 mt-0.5">{holding.industry}</div>
        </div>
        <span className={`text-sm font-medium px-3 py-1.5 rounded-full border ${style}`}>
          {holding.actionLabel}
        </span>
      </div>

      {holding.financialIndustryWarning && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          ⚠️ 金融業，F-Score/Z-Score 模型參考性較低
        </div>
      )}

      <ul className="space-y-1 mb-3">
        {holding.reasonBullets.map((bullet, i) => (
          <li key={i} className="text-sm text-gray-600 flex gap-2">
            <span className="text-gray-300">・</span>
            {bullet}
          </li>
        ))}
      </ul>

      {holding.priceGuidance && (
        <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 mb-2">
          <span className="font-medium">價位參考：</span>
          {holding.priceGuidance}
        </div>
      )}

      {holding.sizingGuidance && (
        <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
          <span className="font-medium">金額參考：</span>
          {holding.sizingGuidance}
        </div>
      )}
    </div>
  )
}
