import { useEffect, useState } from 'react'
import { fetchStockNews } from '../lib/api'

function fmtRelativeTime(pubDate) {
  const d = new Date(pubDate)
  if (isNaN(d.getTime())) return pubDate
  const diffMs = Date.now() - d.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 1) return '剛剛'
  if (diffHours < 24) return `${diffHours} 小時前`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} 天前`
  return new Intl.DateTimeFormat('zh-TW', { month: 'long', day: 'numeric' }).format(d)
}

export default function NewsPanel({ companyId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchStockNews(companyId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [companyId])

  if (loading) {
    return <p className="text-gray-500 py-8">新聞讀取中…</p>
  }
  if (error) {
    return (
      <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">讀取失敗：{error}</p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-400">「{data.query}」相關新聞</div>

      {data.items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-400">
          目前查無相關新聞
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {data.items.map((item, idx) => (
            <a
              key={idx}
              href={item.link}
              target="_blank"
              rel="noreferrer"
              className="block px-6 py-4 hover:bg-gray-50"
            >
              <div className="text-sm font-medium text-gray-900 mb-1">{item.title}</div>
              <div className="text-xs text-gray-400">
                {item.source} · {fmtRelativeTime(item.pubDate)}
              </div>
            </a>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        ※ 新聞資料來源：Google 新聞，點擊會另開新分頁前往原始新聞網站。內容為第三方媒體報導，不代表本站立場，僅供參考。
      </p>
    </div>
  )
}
