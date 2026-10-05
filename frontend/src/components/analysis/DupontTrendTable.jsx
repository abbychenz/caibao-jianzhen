export default function DupontTrendTable({ trend }) {
  if (!trend || trend.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-sm text-gray-500 mb-2">杜邦三年趨勢分析</div>
        <p className="text-sm text-gray-400">查無足夠的歷史資料。</p>
      </div>
    )
  }

  const cols = [
    { key: 'netMargin', label: '淨利率', unit: '%' },
    { key: 'assetTurnover', label: '總資產週轉率', unit: '' },
    { key: 'equityMultiplier', label: '權益乘數', unit: '' },
    { key: 'roe', label: 'ROE', unit: '%' },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="text-sm text-gray-500 mb-4">
        杜邦三年趨勢分析
        <span className="block text-xs text-gray-400 mt-0.5">
          觀察 ROE 的成長主要是「賺得多」（淨利率↑）、「轉得快」（週轉率↑）還是「借得多」（權益乘數↑）
        </span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 text-xs border-b border-gray-200">
            <th className="pb-2 font-normal">年度</th>
            {cols.map((c) => (
              <th key={c.key} className="pb-2 font-normal text-right">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trend.map((row, idx) => {
            const prev = trend[idx - 1]
            return (
              <tr key={row.year} className="border-b border-gray-50 last:border-0">
                <td className="py-2 text-gray-700">{row.year} 年 Q{row.season}</td>
                {cols.map((c) => {
                  const value = row[c.key]
                  const delta = prev ? value - prev[c.key] : null
                  return (
                    <td key={c.key} className="py-2 text-right">
                      <span className="font-medium text-gray-900">
                        {value}
                        {c.unit}
                      </span>
                      {delta !== null && (
                        <span
                          className={`ml-1 text-xs ${
                            delta > 0
                              ? 'text-emerald-600'
                              : delta < 0
                                ? 'text-red-500'
                                : 'text-gray-400'
                          }`}
                        >
                          {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
