export default function ScoreBarCompare({ title, aLabel, bLabel, aScore, bScore, maxScore = 100, unit = ' 分' }) {
  const aPct = Math.max(0, Math.min((aScore / maxScore) * 100, 100))
  const bPct = Math.max(0, Math.min((bScore / maxScore) * 100, 100))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="text-sm text-gray-500 mb-4">{title}</div>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-emerald-700 font-medium">{aLabel}</span>
            <span className="font-semibold text-gray-900">
              {aScore}
              {unit}
            </span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-3 bg-emerald-600 rounded-full" style={{ width: `${aPct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-blue-700 font-medium">{bLabel}</span>
            <span className="font-semibold text-gray-900">
              {bScore}
              {unit}
            </span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-3 bg-blue-600 rounded-full" style={{ width: `${bPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
