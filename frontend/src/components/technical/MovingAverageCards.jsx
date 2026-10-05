const LABELS = { ma5: 'MA5', ma10: 'MA10', ma20: 'MA20', ma60: 'MA60', ma120: 'MA120', ma240: 'MA240' }

export default function MovingAverageCards({ movingAverages }) {
  const entries = Object.entries(movingAverages)
  const validEntries = entries.filter(([, v]) => v !== null)
  const aboveCount = validEntries.filter(([, v]) => v.aboveMa).length

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">均線系統</div>
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${
            aboveCount > validEntries.length / 2
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-red-50 text-red-600'
          }`}
        >
          {aboveCount > validEntries.length / 2 ? '偏多' : '偏空'}
        </span>
      </div>

      <div className="grid grid-cols-6 gap-3">
        {entries.map(([key, v]) => (
          <div key={key} className="rounded-lg bg-gray-50 p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">{LABELS[key]}</div>
            {v ? (
              <>
                <div className="text-sm font-semibold text-gray-900">{v.value}</div>
                <div className={`text-xs mt-1 ${v.aboveMa ? 'text-red-600' : 'text-emerald-700'}`}>
                  {v.aboveMa ? '▲ 站上' : '▼ 跌破'}
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-300 mt-2">—</div>
            )}
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-400 mt-3">
        站上均線數：{aboveCount}/{validEntries.length}（紅色 = 股價站上該均線，綠色 = 跌破）
      </div>
    </div>
  )
}
