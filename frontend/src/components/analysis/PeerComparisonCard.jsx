import { useEffect, useState } from 'react'
import { fetchPeerComparison } from '../../lib/api'
import RadarChart from './RadarChart'

const GRADE_COLOR = {
  A: 'text-emerald-700 bg-emerald-50',
  B: 'text-blue-700 bg-blue-50',
  C: 'text-amber-600 bg-amber-50',
  D: 'text-orange-600 bg-orange-50',
  F: 'text-red-600 bg-red-50',
}

const AXIS_LABELS = {
  valuation: '估值',
  growth: '成長',
  financialHealth: '財務健康',
  profitability: '獲利能力',
}

function AxisRow({ axisKey, axis }) {
  if (!axis.available) {
    return (
      <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
        <span className="text-sm text-gray-500">{AXIS_LABELS[axisKey]}</span>
        <span className="text-xs text-gray-400">資料不足</span>
      </div>
    )
  }

  const detailText = Object.entries(axis.details)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => {
      if (k === 'peX') return `PE ${v}x`
      if (k === 'revenueYoyPct') return `營收YoY ${v > 0 ? '+' : ''}${v}%`
      if (k === 'epsYoyPct') return `EPS YoY ${v > 0 ? '+' : ''}${v}%`
      if (k === 'debtRatioPct') return `負債比 ${v}%`
      if (k === 'currentRatioX') return `流動比 ${v}x`
      if (k === 'roePct') return `ROE ${v}%`
      if (k === 'netMarginPct') return `淨利率 ${v}%`
      return `${k} ${v}`
    })
    .join('・')

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <div>
        <span className="text-sm text-gray-700 font-medium">{AXIS_LABELS[axisKey]}</span>
        <div className="text-xs text-gray-400 mt-0.5">{detailText}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">贏過 {axis.score}%</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${GRADE_COLOR[axis.grade]}`}>
          {axis.grade}
        </span>
      </div>
    </div>
  )
}

export default function PeerComparisonCard({ companyId, year, season }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchPeerComparison(companyId, year, season)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [companyId, year, season])

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-sm text-gray-500 mb-2">四維評分（同業百分位比較）</div>
        <p className="text-sm text-gray-400">計算中，第一次查詢需要抓一大批基準股票財報，可能要 5~10 秒…</p>
      </div>
    )
  }

  if (error || !data.available) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-sm text-gray-500 mb-2">四維評分（同業百分位比較）</div>
        <p className="text-sm text-gray-400">{error || data.reason}</p>
      </div>
    )
  }

  const axes = Object.entries(data.axes).map(([key, axis]) => ({
    label: AXIS_LABELS[key],
    score: axis.available ? axis.score : 0,
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="text-sm text-gray-500 mb-4">四維評分（同業百分位比較）</div>

      <div className="grid grid-cols-2 gap-4 items-center">
        <div className="flex justify-center">
          <RadarChart axes={axes} />
        </div>
        <div>
          {Object.entries(data.axes).map(([key, axis]) => (
            <AxisRow key={key} axisKey={key} axis={axis} />
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        {data.benchmarkNote}（樣本數：{data.benchmarkSize} 檔）
        本益比計算採用 {year} 年第 {season} 季財報 EPS 對比目前股價，非即時本益比，數字僅供相對比較參考。
      </p>
    </div>
  )
}
