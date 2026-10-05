function ItemRow({ item }) {
  const pass = item.score === 1
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div>
        <div className="text-sm text-gray-800">{item.label}</div>
        <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>
      </div>
      <span
        className={`shrink-0 ml-4 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
          pass ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
        }`}
      >
        {pass ? '✓' : '✕'}
      </span>
    </div>
  )
}

function Group({ title, items }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-1">{title}</div>
      {items.map((item) => (
        <ItemRow key={item.key} item={item} />
      ))}
    </div>
  )
}

export default function FScoreCard({ fScore, unavailableReason }) {
  if (!fScore) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-sm text-gray-500 mb-2">Piotroski F-Score</div>
        <p className="text-sm text-gray-400">
          {unavailableReason || '缺少可比較的前一年度資料，暫時無法計算。'}
        </p>
      </div>
    )
  }

  const { totalScore, maxScore, profitabilityItems, leverageItems, efficiencyItems } = fScore

  let level = { label: '體質偏弱', color: 'text-red-600' }
  if (totalScore >= 7) level = { label: '體質強健', color: 'text-emerald-700' }
  else if (totalScore >= 4) level = { label: '體質中等', color: 'text-amber-600' }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">
          Piotroski F-Score
          <span className="block text-xs text-gray-400 mt-0.5">
            9 項體質檢查：今年 vs 去年同期，越多打勾代表財務體質越在變好
          </span>
        </div>
        <div className="text-right shrink-0 ml-4">
          <div className="text-2xl font-semibold text-gray-900">
            {totalScore}
            <span className="text-sm font-normal text-gray-400">/{maxScore}</span>
          </div>
          <div className={`text-xs font-medium ${level.color}`}>{level.label}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Group title="獲利能力（4 項）" items={profitabilityItems} />
        <Group title="槓桿與流動性（3 項）" items={leverageItems} />
        <Group title="營運效率（2 項）" items={efficiencyItems} />
      </div>
    </div>
  )
}
