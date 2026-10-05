function fmt(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('zh-TW').format(Math.round(n))
}

const QUALITY_STYLE = {
  優秀: 'text-emerald-700 bg-emerald-50',
  良好: 'text-emerald-700 bg-emerald-50',
  尚可: 'text-amber-600 bg-amber-50',
  需關注: 'text-red-600 bg-red-50',
}

export default function CashFlowDeepDive({ cashFlow }) {
  const qualityStyle = QUALITY_STYLE[cashFlow.qualityLabel] || 'text-gray-600 bg-gray-50'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">現金流深度分析</div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${qualityStyle}`}>
          品質比率 {cashFlow.qualityRatio}x・{cashFlow.qualityLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">自由現金流（FCF）</div>
          <div className="text-lg font-semibold text-gray-900">
            {fmt(cashFlow.freeCashFlow)}
            <span className="text-xs font-normal text-gray-400 ml-1">仟元</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            = 營業現金流 {fmt(cashFlow.operatingCashFlow)} − 資本支出 {fmt(cashFlow.capex)}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">現金流品質比率</div>
          <div className="text-lg font-semibold text-gray-900">{cashFlow.qualityRatio}x</div>
          <div className="text-xs text-gray-400 mt-1">營業現金流 ÷ 本期淨利</div>
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-2">三大現金流結構（新台幣仟元）</div>
      <table className="w-full text-sm">
        <tbody>
          <tr className="border-b border-gray-100">
            <td className="py-2 text-gray-600">營業活動現金流</td>
            <td className="py-2 text-right font-medium text-gray-900">
              {fmt(cashFlow.operatingCashFlow)}
            </td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="py-2 text-gray-600">投資活動現金流</td>
            <td className="py-2 text-right font-medium text-gray-900">
              {fmt(cashFlow.investingCashFlow)}
            </td>
          </tr>
          <tr>
            <td className="py-2 text-gray-600">籌資活動現金流</td>
            <td className="py-2 text-right font-medium text-gray-900">
              {fmt(cashFlow.financingCashFlow)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
