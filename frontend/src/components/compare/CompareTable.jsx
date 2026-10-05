function fmtNumber(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('zh-TW').format(Math.round(n))
}

// rows: [{ label, aValue, bValue, format: 'percent'|'number'|'raw', direction: 'higher'|'lower'|null }]
export default function CompareTable({ title, aLabel, bLabel, rows }) {
  function display(value, format) {
    if (value == null) return '—'
    if (format === 'percent') return `${value}%`
    if (format === 'number') return fmtNumber(value)
    return value
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 text-sm text-gray-500 border-b border-gray-200">{title}</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
            <th className="px-6 py-2 font-normal">指標</th>
            <th className="px-6 py-2 font-normal text-right text-emerald-700">{aLabel}</th>
            <th className="px-6 py-2 font-normal text-right text-blue-700">{bLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            let winner = null
            if (row.direction && typeof row.aValue === 'number' && typeof row.bValue === 'number' && row.aValue !== row.bValue) {
              if (row.direction === 'higher') winner = row.aValue > row.bValue ? 'a' : 'b'
              else winner = row.aValue < row.bValue ? 'a' : 'b'
            }
            return (
              <tr key={row.label} className="border-b border-gray-50 last:border-0">
                <td className="px-6 py-3 text-gray-600">{row.label}</td>
                <td
                  className={`px-6 py-3 text-right ${
                    winner === 'a' ? 'font-medium text-emerald-700' : 'text-gray-700'
                  }`}
                >
                  {display(row.aValue, row.format)} {winner === 'a' && '▲'}
                </td>
                <td
                  className={`px-6 py-3 text-right ${
                    winner === 'b' ? 'font-medium text-blue-700' : 'text-gray-700'
                  }`}
                >
                  {display(row.bValue, row.format)} {winner === 'b' && '▲'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
