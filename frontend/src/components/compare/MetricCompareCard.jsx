// direction: 'higher' 代表數字越大越好（如 ROE），'lower' 代表數字越小越好（如負債比）
export default function MetricCompareCard({ label, aLabel, bLabel, aValue, bValue, unit, direction }) {
  let winner = null
  if (direction && aValue !== bValue) {
    if (direction === 'higher') winner = aValue > bValue ? 'a' : 'b'
    else winner = aValue < bValue ? 'a' : 'b'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="text-sm text-gray-500 mb-3">{label}</div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-xs text-emerald-700 mb-1 truncate max-w-[8rem]">{aLabel}</div>
          <div className={`text-2xl font-semibold ${winner === 'a' ? 'text-emerald-700' : 'text-gray-700'}`}>
            {aValue}
            {unit}
          </div>
        </div>

        {winner && (
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full mb-1 shrink-0 ${
              winner === 'a' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
            }`}
          >
            {winner === 'a' ? '◀ 領先' : '領先 ▶'}
          </span>
        )}

        <div className="text-right">
          <div className="text-xs text-blue-700 mb-1 truncate max-w-[8rem]">{bLabel}</div>
          <div className={`text-2xl font-semibold ${winner === 'b' ? 'text-blue-700' : 'text-gray-700'}`}>
            {bValue}
            {unit}
          </div>
        </div>
      </div>
    </div>
  )
}
