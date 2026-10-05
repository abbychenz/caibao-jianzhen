import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdvice } from '../lib/api'
import { useDefaultPeriod } from '../lib/period'
import ActionCard from '../components/advice/ActionCard'

export default function Advice() {
  const period = useDefaultPeriod()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!period) return
    setLoading(true)
    setError(null)
    fetchAdvice(period.year, period.season)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [period])

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">投資建議</h1>
        <p className="text-sm text-gray-500 mt-1">
          規則式引擎產生，非 AI 生成，僅供參考，不構成專業投資建議
        </p>
      </div>

      {loading && (
        <p className="text-gray-500">
          正在分析你的持股，需要抓取財報、技術指標、同業比較資料，可能要 10~20 秒…
        </p>
      )}
      {error && (
        <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">讀取失敗：{error}</p>
      )}

      {data && !loading && (
        <>
          {data.holdings.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-400">
              你目前還沒有任何持股紀錄，先到「
              <Link to="/" className="text-emerald-700 hover:underline">
                個人資訊
              </Link>
              」頁新增交易紀錄，才能產生投資建議。
            </div>
          ) : (
            <div className="space-y-4">
              {data.holdings.map((h) => (
                <ActionCard key={h.companyId} holding={h} />
              ))}
            </div>
          )}

          {data.candidates.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="text-sm text-gray-500 mb-4">你關注但尚未持有的標的</div>
              <div className="space-y-3">
                {data.candidates.map((c) => (
                  <div key={c.companyId} className="flex items-center justify-between border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                    <div>
                      <Link
                        to={`/stock/${c.companyId}`}
                        className="font-medium text-gray-900 hover:text-emerald-700"
                      >
                        {c.companyId} {c.name}
                      </Link>
                      <div className="text-xs text-gray-400 mt-0.5">{c.note}</div>
                    </div>
                    <span
                      className={`text-sm font-semibold px-2 py-1 rounded-full ${
                        c.fundamentalScore >= 75
                          ? 'bg-emerald-50 text-emerald-700'
                          : c.fundamentalScore >= 55
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {c.fundamentalScore}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400">
            ※ 本頁所有建議都是規則式邏輯（if/else）產生，根據 Piotroski F-Score、Altman
            Z''-Score、技術分數、同業估值百分位、你的個人偏好設定組合判斷，
            完全沒有使用 AI/LLM，邏輯公開透明可查證。僅供研究參考，不構成專業投資建議，
            實際投資決策請自行判斷並承擔風險。
          </p>
        </>
      )}
    </div>
  )
}
