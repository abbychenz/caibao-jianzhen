import { useEffect, useState } from 'react'
import { fetchStockTechnical } from '../../lib/api'
import CandlestickChart from './CandlestickChart'
import TechnicalScoreBar from './TechnicalScoreBar'
import IndicatorCards from './IndicatorCards'
import MovingAverageCards from './MovingAverageCards'
import BollingerAndSupportCard from './BollingerAndSupportCard'

export default function TechnicalPanel({ companyId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchStockTechnical(companyId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [companyId])

  if (loading) {
    return <p className="text-gray-500 py-8">技術指標計算中…</p>
  }
  if (error) {
    return (
      <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
        讀取失敗：{error}
        {error.includes('404') && '（可能是上櫃股票，目前技術分析僅支援上市股票）'}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <TechnicalScoreBar
        technicalScore={data.technicalScore}
        latestClose={data.latestClose}
        latestDate={data.latestDate}
      />

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-sm text-gray-500 mb-3">互動 K 線圖</div>
        <CandlestickChart candles={data.candles} />
        <p className="text-xs text-gray-400 mt-2">滾輪縮放、拖曳平移可看每日 OHLC 與成交量。</p>
      </div>

      <IndicatorCards rsi={data.rsi} kd={data.kd} macd={data.macd} volume={data.volume} />

      <MovingAverageCards movingAverages={data.movingAverages} />

      <BollingerAndSupportCard bollinger={data.bollinger} supportResistance={data.supportResistance} />

      <p className="text-xs text-gray-400">
        ※ 技術分析僅反映歷史價格統計規律，不保證未來走勢，僅供參考，不構成投資建議。
        資料來源：台灣證交所（僅支援上市股票）。
      </p>
    </div>
  )
}
