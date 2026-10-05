// 簡單類別色票（非資料視覺化正式規格，先求可用；之後若要精修配色可再調整）
const COLORS = ['#065f46', '#2563eb', '#d97706', '#7c3aed', '#db2777', '#0891b2']

export default function IndustryPieChart({ allocation }) {
  if (!allocation || allocation.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center text-sm text-gray-400">
        產業配置
        <div className="mt-3">尚無資料</div>
      </div>
    )
  }

  let cumulative = 0
  const stops = allocation.map((item, idx) => {
    const start = cumulative
    cumulative += item.pct
    return `${COLORS[idx % COLORS.length]} ${start}% ${cumulative}%`
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center">
      <div className="text-sm text-gray-500 mb-3">產業配置</div>
      <div
        className="w-32 h-32 rounded-full"
        style={{ background: `conic-gradient(${stops.join(', ')})` }}
      />
      <div className="text-xs text-gray-500 mt-3 space-y-1 w-full">
        {allocation.map((item, idx) => (
          <div key={item.industry} className="flex justify-between">
            <span>
              <span style={{ color: COLORS[idx % COLORS.length] }}>●</span> {item.industry}
            </span>
            <span>{item.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
