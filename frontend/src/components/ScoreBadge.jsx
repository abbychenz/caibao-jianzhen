export default function ScoreBadge({ score }) {
  if (score === null || score === undefined) {
    return <span className="text-gray-400">—</span>
  }
  let color = 'text-red-600'
  if (score >= 75) color = 'text-emerald-700'
  else if (score >= 55) color = 'text-amber-600'

  return <span className={`font-semibold ${color}`}>{score}</span>
}
