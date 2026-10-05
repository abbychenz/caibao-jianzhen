import { useState } from 'react'
import { createTransaction } from '../../lib/api'

const today = () => new Date().toISOString().slice(0, 10)

export default function AddTransactionModal({ onClose, onSaved }) {
  const [companyId, setCompanyId] = useState('')
  const [action, setAction] = useState('buy')
  const [shares, setShares] = useState('')
  const [price, setPrice] = useState('')
  const [tradeDate, setTradeDate] = useState(today())
  const [note, setNote] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!companyId.trim() || !shares || !price || !tradeDate) {
      setError('請填寫股票代號、股數、價格、交易日期')
      return
    }

    setSaving(true)
    try {
      await createTransaction({
        companyId: companyId.trim(),
        action,
        shares: parseFloat(shares),
        price: parseFloat(price),
        tradeDate,
        note,
      })
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">新增交易紀錄</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAction('buy')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                action === 'buy'
                  ? 'bg-emerald-900 text-white border-emerald-900'
                  : 'text-gray-600 border-gray-200'
              }`}
            >
              買進
            </button>
            <button
              type="button"
              onClick={() => setAction('sell')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                action === 'sell'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'text-gray-600 border-gray-200'
              }`}
            >
              賣出
            </button>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">股票代號</label>
            <input
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              placeholder="例如 2330"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">股數</label>
              <input
                type="number"
                min="0"
                step="1"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">成交價</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">交易日期</label>
            <input
              type="date"
              value={tradeDate}
              onChange={(e) => setTradeDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">備註（選填）</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-200"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-emerald-900 hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving ? '儲存中…' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
