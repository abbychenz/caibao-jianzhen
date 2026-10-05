const VERDICT_COLOR = {
  強烈看多: '#047857',
  偏多: '#059669',
  中性: '#d97706',
  偏空: '#ea580c',
  強烈看空: '#dc2626',
}

export default function TechnicalScoreBar({ technicalScore, latestClose, latestDate }) {
  const { score, verdict } = technicalScore
  const color = VERDICT_COLOR[verdict] || '#6b7280'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-2xl font-semibold text-gray-900">
            {latestClose}
            <span className="text-sm font-normal text-gray-400 ml-2">現價・{latestDate}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold" style={{ color }}>
            {score}
            <span className="text-sm font-normal text-gray-400">/100</span>
          </div>
          <div className="text-xs font-medium" style={{ color }}>
            {verdict}
          </div>
        </div>
      </div>

      <div className="relative h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>強烈看空</span>
        <span>中性</span>
        <span>強烈看多</span>
      </div>
    </div>
  )
}
