function Card({ children }) {
  return <div className="bg-white rounded-xl border border-gray-200 p-5">{children}</div>
}

function RsiCard({ rsi }) {
  let zone = '中性'
  let color = 'text-amber-600'
  if (rsi == null) {
    zone = '資料不足'
    color = 'text-gray-400'
  } else if (rsi >= 70) {
    zone = '超買'
    color = 'text-red-600'
  } else if (rsi <= 30) {
    zone = '超賣'
    color = 'text-emerald-700'
  }

  return (
    <Card>
      <div className="text-xs text-gray-500 mb-2">RSI (14)</div>
      <div className="text-2xl font-semibold text-gray-900">{rsi ?? '—'}</div>
      <div className={`text-xs font-medium mt-1 ${color}`}>{zone}</div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-2">
        <span>超賣 30</span>
        <span>超買 70</span>
      </div>
    </Card>
  )
}

function KdCard({ kd }) {
  if (!kd) {
    return (
      <Card>
        <div className="text-xs text-gray-500 mb-2">KD 隨機指標</div>
        <div className="text-sm text-gray-400">資料不足</div>
      </Card>
    )
  }
  return (
    <Card>
      <div className="text-xs text-gray-500 mb-2">KD 隨機指標</div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">K 值</span>
        <span className="font-semibold text-gray-900">{kd.k}</span>
      </div>
      <div className="flex items-center justify-between text-sm mt-1">
        <span className="text-gray-500">D 值</span>
        <span className="font-semibold text-gray-900">{kd.d}</span>
      </div>
      <div className={`text-xs font-medium mt-2 px-2 py-0.5 rounded-full inline-block ${kd.bullish ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
        {kd.bullish ? 'K>D 偏多' : 'K<D 偏空'}
      </div>
    </Card>
  )
}

function MacdCard({ macd }) {
  if (!macd) {
    return (
      <Card>
        <div className="text-xs text-gray-500 mb-2">MACD (12,26,9)</div>
        <div className="text-sm text-gray-400">資料不足</div>
      </Card>
    )
  }
  return (
    <Card>
      <div className="text-xs text-gray-500 mb-2">MACD (12,26,9)</div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">MACD 線</span>
        <span className="font-semibold text-gray-900">{macd.macd}</span>
      </div>
      <div className="flex items-center justify-between text-sm mt-1">
        <span className="text-gray-500">訊號線</span>
        <span className="font-semibold text-gray-900">{macd.signal}</span>
      </div>
      <div className="flex items-center justify-between text-sm mt-1">
        <span className="text-gray-500">柱狀圖</span>
        <span className={`font-semibold ${macd.histogram >= 0 ? 'text-red-600' : 'text-emerald-700'}`}>
          {macd.histogram}
        </span>
      </div>
      <div className={`text-xs font-medium mt-2 px-2 py-0.5 rounded-full inline-block ${macd.bullish ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
        {macd.bullish ? '多頭排列' : '空頭排列'}
      </div>
    </Card>
  )
}

function VolumeCard({ volume }) {
  if (!volume) {
    return (
      <Card>
        <div className="text-xs text-gray-500 mb-2">成交量分析</div>
        <div className="text-sm text-gray-400">資料不足</div>
      </Card>
    )
  }
  let label = '正常量'
  if (volume.ratio >= 2) label = '爆量'
  else if (volume.ratio >= 1.5) label = '放量'
  else if (volume.ratio <= 0.5) label = '量縮'

  return (
    <Card>
      <div className="text-xs text-gray-500 mb-2">成交量分析</div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">今日量</span>
        <span className="font-semibold text-gray-900">{Math.round(volume.todayVolume / 1000).toLocaleString()} 張</span>
      </div>
      <div className="flex items-center justify-between text-sm mt-1">
        <span className="text-gray-500">20日均量</span>
        <span className="font-semibold text-gray-900">{Math.round(volume.avgVolume20 / 1000).toLocaleString()} 張</span>
      </div>
      <div className="flex items-center justify-between text-sm mt-1">
        <span className="text-gray-500">量比</span>
        <span className="font-semibold text-gray-900">{volume.ratio}x</span>
      </div>
      <div className="text-xs font-medium mt-2 px-2 py-0.5 rounded-full inline-block bg-gray-100 text-gray-600">
        {label}
      </div>
    </Card>
  )
}

export default function IndicatorCards({ rsi, kd, macd, volume }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <RsiCard rsi={rsi} />
      <KdCard kd={kd} />
      <MacdCard macd={macd} />
      <VolumeCard volume={volume} />
    </div>
  )
}
