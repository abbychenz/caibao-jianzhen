import { useEffect, useState } from 'react'
import { fetchStockAnalysis } from '../../lib/api'
import FScoreCard from './FScoreCard'
import ZScoreCard from './ZScoreCard'
import DupontTrendTable from './DupontTrendTable'
import CashFlowDeepDive from './CashFlowDeepDive'
import PeerComparisonCard from './PeerComparisonCard'

export default function DeepAnalysisPanel({ companyId, year, season }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchStockAnalysis(companyId, year, season)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [companyId, year, season])

  if (loading) {
    return <p className="text-gray-500 py-8">深度分析計算中…</p>
  }
  if (error) {
    return (
      <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
        讀取失敗：{error}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {data.financialIndustryWarning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-4">
          ⚠️ 此公司屬於金融保險業。Piotroski F-Score 與 Altman Z-Score
          是設計給一般產業（製造、科技、零售等）用的模型，銀行/保險/證券業高槓桿是正常商業模式，
          套用這兩個模型容易誤判成「財務危機」，以下結果僅供參考，不代表真實體質不佳。
        </div>
      )}

      <FScoreCard fScore={data.fScore} unavailableReason={data.fScoreUnavailableReason} />

      <div className="grid grid-cols-2 gap-4">
        <ZScoreCard zScore={data.zScore} />
        <CashFlowDeepDive cashFlow={data.cashFlow} />
      </div>

      <DupontTrendTable trend={data.dupontTrend} />

      <PeerComparisonCard companyId={companyId} year={year} season={season} />

      <p className="text-xs text-gray-400">
        ※ 分析方法參考「Piotroski F-Score」「Altman Z-Score」等學術財務模型，計算基礎為 MOPS
        公開財報資料，僅供研究與教育用途，不構成投資建議。
      </p>
    </div>
  )
}
