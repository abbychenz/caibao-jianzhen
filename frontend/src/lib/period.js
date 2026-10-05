// 統一取得「目前應該顯示的最新一季財報」(民國年/季)，
// 由後端 /api/default-period 動態計算，避免前端寫死年份導致資料越來越舊。
import { useEffect, useState } from 'react'
import { fetchDefaultPeriod } from './api'

// 後端打不通時的保底值（儘量跟後端 api/main.py 的推算邏輯同步更新）
const FALLBACK_PERIOD = { year: '115', season: '2' }

export function useDefaultPeriod() {
  const [period, setPeriod] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchDefaultPeriod()
      .then((data) => {
        if (!cancelled) setPeriod(data)
      })
      .catch(() => {
        if (!cancelled) setPeriod(FALLBACK_PERIOD)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return period // 載入中是 null，之後是 { year, season }
}
