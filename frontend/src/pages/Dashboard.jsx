import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchStock } from '../lib/api'
import { useDefaultPeriod } from '../lib/period'
import StatCard from '../components/StatCard'
import ScoreRing from '../components/ScoreRing'
import DeepAnalysisPanel from '../components/analysis/DeepAnalysisPanel'
import TechnicalPanel from '../components/technical/TechnicalPanel'
import NewsPanel from '../components/NewsPanel'

function fmtNumber(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('zh-TW').format(Math.round(n))
}

function recommendation(score) {
  if (score == null) return null
  if (score >= 75) return { label: '建議：核心配置', color: 'bg-emerald-50 text-emerald-700' }
  if (score >= 55) return { label: '建議：衛星配置', color: 'bg-amber-50 text-amber-700' }
  return { label: '建議：觀察中', color: 'bg-red-50 text-red-700' }
}

export default function Dashboard() {
  const { companyId = '2330' } = useParams()
  const period = useDefaultPeriod()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    if (!period) return
    setLoading(true)
    setError(null)
    setTab('overview')
    fetchStock(companyId, period.year, period.season)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [companyId, period])

  if (loading) {
    return <div className="max-w-6xl mx-auto px-8 py-8 text-gray-500">資料讀取中…</div>
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-8 py-8">
        <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
          讀取失敗：{error}
        </p>
      </div>
    )
  }

  const rec = recommendation(data.score)

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
      {/* 標題列 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">
            {data.name || data.companyId}
          </h1>
          <span className="text-gray-400">{data.companyId}.TW</span>
          {data.industry && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {data.industry}
            </span>
          )}
        </div>
        {rec && (
          <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${rec.color}`}>
            {rec.label}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-400 -mt-4">
        {data.year} 年第 {data.season} 季財報（資料來源：MOPS 公開資訊觀測站）
      </p>

      {/* 頁籤切換 */}
      <div className="flex gap-1 border-b border-gray-200">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
          總覽
        </TabButton>
        <TabButton active={tab === 'deep'} onClick={() => setTab('deep')}>
          深度財務分析
        </TabButton>
        <TabButton active={tab === 'technical'} onClick={() => setTab('technical')}>
          技術分析
        </TabButton>
        <TabButton active={tab === 'news'} onClick={() => setTab('news')}>
          相關新聞
        </TabButton>
      </div>

      {tab === 'overview' && (
        <>
          {/* 三張核心指標卡片 */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              label="獲利能力・ROE"
              value={data.roe}
              unit="%"
              note={`驗證值 ${data.roeDirect}%（杜邦分解與直接計算一致）`}
            />
            <StatCard
              label="財務結構・負債比"
              value={data.debtRatio}
              unit="%"
              note={data.debtRatio < 50 ? '財務結構穩健' : '負債比偏高，留意財務槓桿'}
            />
            <StatCard
              label="現金流品質"
              value={data.cashFlowQuality}
              unit="x"
              note={
                data.cashFlowQuality >= 1
                  ? '營業現金流 / 淨利，獲利含金量高'
                  : '淨利含金量偏低，留意應收/存貨變化'
              }
            />
          </div>

          {/* 杜邦分解 + 綜合評分 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
              <div className="text-sm text-gray-500 mb-4">ROE 杜邦分解</div>
              <div className="flex items-center gap-3">
                <DupontBox label="淨利率" value={`${data.netMargin}%`} />
                <span className="text-gray-300 text-xl">×</span>
                <DupontBox label="總資產週轉率" value={`${data.assetTurnover}`} />
                <span className="text-gray-300 text-xl">×</span>
                <DupontBox label="權益乘數" value={`${data.equityMultiplier}`} />
                <span className="text-gray-300 text-xl">=</span>
                <DupontBox label="ROE" value={`${data.roe}%`} highlight />
              </div>
              <p className="text-xs text-gray-400 mt-4">
                淨利率、總資產週轉率、權益乘數三者相乘即為 ROE，可以看出獲利成長主要是靠「賺得多」還是「借得多」。
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center">
              <div className="text-sm text-gray-500 mb-3">綜合評分</div>
              <ScoreRing score={data.score} />
              {rec && (
                <span className={`mt-3 text-xs px-3 py-1 rounded-full font-medium ${rec.color}`}>
                  {rec.label}
                </span>
              )}
            </div>
          </div>

          {/* 財報原始數字 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="text-sm text-gray-500 mb-4">財報原始數字（新台幣仟元）</div>
            <div className="grid grid-cols-3 gap-y-3 text-sm">
              <RawRow label="營業收入" value={fmtNumber(data.revenue)} />
              <RawRow label="本期淨利" value={fmtNumber(data.netIncome)} />
              <RawRow label="營業活動現金流" value={fmtNumber(data.operatingCashFlow)} />
              <RawRow label="資產總額" value={fmtNumber(data.totalAssets)} />
              <RawRow label="負債總額" value={fmtNumber(data.totalLiabilities)} />
              <RawRow label="權益總額" value={fmtNumber(data.totalEquity)} />
            </div>
          </div>

          <p className="text-xs text-gray-400">
            ※ 本頁數字皆計算自 MOPS 公開資訊觀測站財報原始資料，非投資建議。
            本益比、ESG 評等尚未串接資料源。
          </p>
        </>
      )}

      {tab === 'deep' && (
        <DeepAnalysisPanel companyId={data.companyId} year={data.year} season={data.season} />
      )}

      {tab === 'technical' && <TechnicalPanel companyId={data.companyId} />}

      {tab === 'news' && <NewsPanel companyId={data.companyId} />}
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? 'border-emerald-700 text-emerald-800'
          : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      {children}
    </button>
  )
}

function DupontBox({ label, value, highlight }) {
  return (
    <div
      className={`flex-1 rounded-lg px-4 py-3 text-center ${
        highlight ? 'bg-emerald-50' : 'bg-gray-50'
      }`}
    >
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div
        className={`text-lg font-semibold ${
          highlight ? 'text-emerald-700' : 'text-gray-900'
        }`}
      >
        {value}
      </div>
    </div>
  )
}

function RawRow({ label, value }) {
  return (
    <div className="flex justify-between border-b border-gray-100 pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}
