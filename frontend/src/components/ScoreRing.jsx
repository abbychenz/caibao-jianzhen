export default function ScoreRing({ score }) {
  const radius = 46
  const circumference = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(100, score ?? 0)) / 100
  const offset = circumference * (1 - pct)

  let color = '#dc2626' // red
  if (score >= 75) color = '#047857' // emerald
  else if (score >= 55) color = '#d97706' // amber

  return (
    <div className="relative w-32 h-32">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#f0f0ee"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold text-gray-900">
          {score ?? '—'}
        </span>
        <span className="text-xs text-gray-400">/ 100</span>
      </div>
    </div>
  )
}
