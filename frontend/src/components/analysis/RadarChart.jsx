// 簡單的 N 軸雷達圖（不依賴額外圖表套件），用來畫「四維評分」。
// axes: [{ label, score }]，score 是 0~100 的百分位分數。
export default function RadarChart({ axes, size = 220 }) {
  // 用 padding 讓標籤文字（例如「獲利能力」四個字）有足夠空間，不會被 SVG 邊界裁掉
  const padding = 64
  const total = size + padding * 2
  const center = total / 2
  const maxRadius = size / 2 - 10
  const n = axes.length

  const angleFor = (i) => (Math.PI * 2 * i) / n - Math.PI / 2

  const pointFor = (i, valuePct) => {
    const angle = angleFor(i)
    const r = (valuePct / 100) * maxRadius
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)]
  }

  const dataPoints = axes.map((a, i) => pointFor(i, a.score ?? 0))
  const polygonPoints = dataPoints.map((p) => p.join(',')).join(' ')

  // 背景刻度環（25% / 50% / 75% / 100%）
  const gridLevels = [25, 50, 75, 100]

  return (
    <svg width={total} height={total} viewBox={`0 0 ${total} ${total}`}>
      {gridLevels.map((level) => {
        const pts = axes.map((_, i) => pointFor(i, level).join(',')).join(' ')
        return (
          <polygon
            key={level}
            points={pts}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        )
      })}

      {axes.map((_, i) => {
        const [x, y] = pointFor(i, 100)
        return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#e5e7eb" strokeWidth="1" />
      })}

      <polygon points={polygonPoints} fill="rgba(4, 120, 87, 0.2)" stroke="#047857" strokeWidth="2" />

      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="#047857" />
      ))}

      {axes.map((a, i) => {
        const angle = angleFor(i)
        const labelR = maxRadius + 20
        const x = center + labelR * Math.cos(angle)
        const y = center + labelR * Math.sin(angle)
        // 靠左的標籤要往左展開（anchor=end），靠右的往右展開（anchor=start），
        // 正上/正下則置中，不然文字會被 SVG 邊界裁掉。
        let textAnchor = 'middle'
        if (x < center - 5) textAnchor = 'end'
        else if (x > center + 5) textAnchor = 'start'
        return (
          <text
            key={a.label}
            x={x}
            y={y}
            textAnchor={textAnchor}
            dominantBaseline="middle"
            className="fill-gray-600"
            fontSize="12"
          >
            {a.label}
          </text>
        )
      })}
    </svg>
  )
}
