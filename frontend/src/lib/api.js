// 統一放 API 呼叫，之後要換 base URL 或加錯誤處理都改這裡就好
const BASE = '/api'

async function putJson(path, payload) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `API 錯誤 ${res.status}`)
  }
  return res.json()
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API 錯誤 ${res.status}: ${body}`)
  }
  return res.json()
}

async function postJson(path, payload) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `API 錯誤 ${res.status}`)
  }
  return res.json()
}

async function deleteJson(path) {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API 錯誤 ${res.status}: ${body}`)
  }
  return res.json()
}

export function fetchWatchlist(year, season) {
  return getJson(`/watchlist?year=${year}&season=${season}`)
}

export function fetchStock(companyId, year, season) {
  return getJson(`/stock/${companyId}?year=${year}&season=${season}`)
}

export function fetchStockAnalysis(companyId, year, season) {
  return getJson(`/stock/${companyId}/analysis?year=${year}&season=${season}`)
}

export function fetchStockTechnical(companyId, months = 13) {
  return getJson(`/stock/${companyId}/technical?months=${months}`)
}

export function fetchStockNews(companyId, limit = 15) {
  return getJson(`/stock/${companyId}/news?limit=${limit}`)
}

export function fetchPeerComparison(companyId, year, season) {
  return getJson(`/stock/${companyId}/peer-comparison?year=${year}&season=${season}`)
}

export function fetchProfile() {
  return getJson('/profile')
}

export function saveProfile(profile) {
  return putJson('/profile', profile)
}

export function fetchAdvice(year, season) {
  return getJson(`/advice?year=${year}&season=${season}`)
}

export function fetchCompare(a, b, year, season) {
  return getJson(`/compare?a=${a}&b=${b}&year=${year}&season=${season}`)
}

export function fetchPortfolioSummary(year, season) {
  return getJson(`/portfolio/summary?year=${year}&season=${season}`)
}

export function fetchTransactions(companyId) {
  const qs = companyId ? `?company_id=${companyId}` : ''
  return getJson(`/portfolio/transactions${qs}`)
}

export function createTransaction(tx) {
  return postJson('/portfolio/transactions', tx)
}

export function deleteTransaction(id) {
  return deleteJson(`/portfolio/transactions/${id}`)
}
