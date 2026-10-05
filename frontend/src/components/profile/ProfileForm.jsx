import { useEffect, useState } from 'react'
import { fetchProfile, saveProfile } from '../../lib/api'

const RISK_OPTIONS = ['保守', '穩健', '積極']
const GOAL_OPTIONS = ['長期成長', '股息收入', '短期波段']
const HORIZON_OPTIONS = ['短期（<1年）', '中期（1-3年）', '長期（3年以上）']

function toCsv(arr) {
  return (arr || []).join('、')
}
function fromCsv(str) {
  return str
    .split(/[,，、\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export default function ProfileForm() {
  const [profile, setProfile] = useState(null)
  const [industriesInput, setIndustriesInput] = useState('')
  const [tickersInput, setTickersInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetchProfile().then((p) => {
      setProfile(p)
      setIndustriesInput(toCsv(p.preferredIndustries))
      setTickersInput(toCsv(p.preferredTickers))
    })
  }, [])

  if (!profile) return null

  function update(field, value) {
    setProfile({ ...profile, [field]: value })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        ...profile,
        preferredIndustries: fromCsv(industriesInput),
        preferredTickers: fromCsv(tickersInput),
      }
      const saved = await saveProfile(payload)
      setProfile(saved)
      setSavedAt(new Date())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div>
          <div className="text-sm font-medium text-gray-800">投資偏好設定</div>
          <div className="text-xs text-gray-400 mt-0.5">
            填寫你的投資偏好，「投資建議」頁會依此給你更貼身的建議
          </div>
        </div>
        <span className="text-gray-400 text-sm">{expanded ? '收合 ▲' : '展開 ▼'}</span>
      </button>

      {expanded && (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">偏好產業（用頓號或逗號分隔）</label>
              <input
                value={industriesInput}
                onChange={(e) => setIndustriesInput(e.target.value)}
                placeholder="例如：半導體業、金融保險業"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">關注股票代號（用頓號或逗號分隔）</label>
              <input
                value={tickersInput}
                onChange={(e) => setTickersInput(e.target.value)}
                placeholder="例如：2330、2454"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">風險偏好</label>
              <div className="flex gap-2">
                {RISK_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => update('riskTolerance', opt)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border ${
                      profile.riskTolerance === opt
                        ? 'bg-emerald-900 text-white border-emerald-900'
                        : 'text-gray-600 border-gray-200'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">投資目標</label>
              <select
                value={profile.investmentGoal}
                onChange={(e) => update('investmentGoal', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              >
                {GOAL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">投資期限</label>
              <select
                value={profile.investmentHorizon}
                onChange={(e) => update('investmentHorizon', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
              >
                {HORIZON_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">單筆習慣投入金額（新台幣，選填）</label>
            <input
              type="number"
              min="0"
              value={profile.typicalBudget ?? ''}
              onChange={(e) => update('typicalBudget', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="例如 100000"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              其他想讓系統知道的事（自由填寫，例如特別在意的公司特質、想避開的產業等）
            </label>
            <textarea
              value={profile.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-900 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving ? '儲存中…' : '儲存偏好設定'}
            </button>
            {savedAt && <span className="text-xs text-gray-400">已儲存</span>}
          </div>
        </div>
      )}
    </div>
  )
}
