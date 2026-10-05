import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchCompare } from '../lib/api'
import { useDefaultPeriod } from '../lib/period'
import MetricCompareCard from '../components/compare/MetricCompareCard'
import ScoreBarCompare from '../components/compare/ScoreBarCompare'
import CompareTable from '../components/compare/CompareTable'

export default function Compare() {
  const period = useDefaultPeriod()
  const [params, setParams] = useSearchParams()
  const [inputA, setInputA] = useState(params.get('a') || '2330')
  const [inputB, setInputB] = useState(params.get('b') || '2454')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function runCompare(a, b) {
    if (!a || !b || !period) return
    if (a === b) {
      setError('請輸入兩支不同的股票代號')
      setData(null)
      return
    }
    setLoading(true)
    setError(null)
    fetchCompare(a, b, period.year, period.season)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setParams({ a: inputA, b: inputB })
    runCompare(inputA.trim(), inputB.trim())
  }

  // 第一次進頁面（或 period 載入完成後）自動比較預設（或網址帶入）的兩支股票
  useEffect(() => {
    runCompare(inputA, inputB)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">財報比較</h1>
        <p className="text-sm text-gray-500 mt-1">選擇兩家公司，逐項比對財務體質</p>
      </div>

      {/* 選股表單 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-6">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">公司 A（股票代號）</label>
            <input
              value={inputA}
              onChange={(e) => setInputA(e.target.value)}
              placeholder="例如 2330"
              className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-lg font-medium outline-none focus:border-emerald-500"
            />
          </div>
          <div className="text-gray-300 font-bold text-xl pb-3">VS</div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">公司 B（股票代號）</label>
            <input
              value={inputB}
              onChange={(e) => setInputB(e.target.value)}
              placeholder="例如 2454"
              className="w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-lg font-medium outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 bg-emerald-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-emerald-800"
        >
          開始比較
        </button>
      </form>

      {loading && <p className="text-gray-500">資料讀取中，需要比對兩家公司的完整財報，可能要幾秒鐘…</p>}
      {error && (
        <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
          {error}
        </p>
      )}

      {data && !loading && <CompareResult data={data} />}
    </div>
  )
}

function CompareResult({ data }) {
  const { a, b } = data
  const aLabel = `${a.companyId} ${a.name}`
  const bLabel = `${b.companyId} ${b.name}`

  const aWarning = a.analysis?.financialIndustryWarning
  const bWarning = b.analysis?.financialIndustryWarning

  return (
    <div className="space-y-6">
      {(aWarning || bWarning) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-4">
          ⚠️ {aWarning && aLabel} {aWarning && bWarning && '、'} {bWarning && bLabel}{' '}
          屬於金融保險業，Piotroski F-Score 與 Altman Z-Score 是設計給一般產業用的模型，
          套用在金融業身上容易誤判，以下該公司的體質分數僅供參考。
        </div>
      )}

      {/* 三張核心指標卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCompareCard
          label="獲利能力・ROE"
          aLabel={aLabel}
          bLabel={bLabel}
          aValue={a.roe}
          bValue={b.roe}
          unit="%"
          direction="higher"
        />
        <MetricCompareCard
          label="財務結構・負債比"
          aLabel={aLabel}
          bLabel={bLabel}
          aValue={a.debtRatio}
          bValue={b.debtRatio}
          unit="%"
          direction="lower"
        />
        <MetricCompareCard
          label="現金流品質"
          aLabel={aLabel}
          bLabel={bLabel}
          aValue={a.cashFlowQuality}
          bValue={b.cashFlowQuality}
          unit="x"
          direction="higher"
        />
      </div>

      {/* 綜合評分比較 */}
      <ScoreBarCompare
        title="綜合評分比較"
        aLabel={aLabel}
        bLabel={bLabel}
        aScore={a.score}
        bScore={b.score}
        maxScore={100}
      />

      {/* Piotroski F-Score 比較 */}
      {a.analysis?.fScore && b.analysis?.fScore && (
        <ScoreBarCompare
          title="Piotroski F-Score 比較（財務體質健檢，滿分 9）"
          aLabel={aLabel}
          bLabel={bLabel}
          aScore={a.analysis.fScore.totalScore}
          bScore={b.analysis.fScore.totalScore}
          maxScore={9}
          unit=" / 9"
        />
      )}

      {/* 詳細指標比較表 */}
      <CompareTable
        title="詳細指標比較表"
        aLabel={aLabel}
        bLabel={bLabel}
        rows={[
          { label: '淨利率', aValue: a.netMargin, bValue: b.netMargin, format: 'percent', direction: 'higher' },
          {
            label: '總資產週轉率',
            aValue: a.assetTurnover,
            bValue: b.assetTurnover,
            format: 'raw',
            direction: 'higher',
          },
          {
            label: '權益乘數',
            aValue: a.equityMultiplier,
            bValue: b.equityMultiplier,
            format: 'raw',
            direction: null,
          },
          {
            label: 'Piotroski F-Score',
            aValue: a.analysis?.fScore?.totalScore ?? null,
            bValue: b.analysis?.fScore?.totalScore ?? null,
            format: 'raw',
            direction: 'higher',
          },
          {
            label: "Altman Z''-Score",
            aValue: a.analysis?.zScore?.score ?? null,
            bValue: b.analysis?.zScore?.score ?? null,
            format: 'raw',
            direction: 'higher',
          },
          {
            label: '自由現金流（仟元）',
            aValue: a.analysis?.cashFlow?.freeCashFlow ?? null,
            bValue: b.analysis?.cashFlow?.freeCashFlow ?? null,
            format: 'number',
            direction: 'higher',
          },
          { label: '營業收入（仟元）', aValue: a.revenue, bValue: b.revenue, format: 'number', direction: null },
          { label: '本期淨利（仟元）', aValue: a.netIncome, bValue: b.netIncome, format: 'number', direction: 'higher' },
        ]}
      />

      <p className="text-xs text-gray-400">
        ※ 本頁數字皆計算自 MOPS 公開資訊觀測站財報原始資料，「Piotroski
        F-Score」「Altman Z-Score」為學術財務模型，僅供研究與教育用途，不構成投資建議。
      </p>
    </div>
  )
}
