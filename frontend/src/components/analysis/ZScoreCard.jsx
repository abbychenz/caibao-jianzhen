const ZONE_STYLE = {
  safe: { color: 'text-emerald-700', bg: 'bg-emerald-50', bar: 'bg-emerald-600' },
  grey: { color: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-500' },
  distress: { color: 'text-red-600', bg: 'bg-red-50', bar: 'bg-red-600' },
}

export default function ZScoreCard({ zScore }) {
  const style = ZONE_STYLE[zScore.zone] || ZONE_STYLE.grey
  // 把分數映射到 0~100% 的量尺方便畫長條，8 分封頂只是視覺上的參考刻度
  const pct = Math.max(0, Math.min(zScore.score / 8, 1)) * 100

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm text-gray-500">
          Altman Z''-Score
          <span className="block text-xs text-gray-400 mt-0.5">
            財務危機預警模型（私人企業版，帳面權益取代市值）
          </span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-gray-900">{zScore.score}</div>
          <div className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-1 ${style.bg} ${style.color}`}>
            {zScore.zoneLabel}
          </div>
        </div>
      </div>

      {/* 量尺條：危險 / 灰色 / 安全 三段參考區 */}
      <div className="relative h-2 rounded-full bg-gray-100 mt-4 mb-1 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-red-200"
          style={{ width: `${(1.1 / 8) * 100}%` }}
        />
        <div
          className="absolute inset-y-0 bg-amber-200"
          style={{ left: `${(1.1 / 8) * 100}%`, width: `${((2.6 - 1.1) / 8) * 100}%` }}
        />
        <div
          className="absolute inset-y-0 bg-emerald-200"
          style={{ left: `${(2.6 / 8) * 100}%`, right: 0 }}
        />
        <div
          className={`absolute inset-y-0 w-1 ${style.bar}`}
          style={{ left: `calc(${pct}% - 2px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mb-4">
        <span>危險 &lt;1.1</span>
        <span>灰色 1.1~2.6</span>
        <span>安全 &gt;2.6</span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 text-xs">
            <th className="pb-1 font-normal">組成項目</th>
            <th className="pb-1 font-normal text-right">比率值</th>
            <th className="pb-1 font-normal text-right">加權後</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(zScore.components).map(([key, c]) => (
            <tr key={key} className="border-t border-gray-100">
              <td className="py-1.5 text-gray-700">{c.label}</td>
              <td className="py-1.5 text-right text-gray-500">{c.value}</td>
              <td className="py-1.5 text-right font-medium text-gray-900">{c.weighted}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-xs text-gray-400 mt-3">{zScore.note}</p>
    </div>
  )
}
