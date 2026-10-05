export default function BollingerAndSupportCard({ bollinger, supportResistance }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-500">布林通道 (20, 2σ)</div>
          {bollinger && (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{bollinger.zone}</span>
          )}
        </div>
        {bollinger ? (
          <>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">
                  <span className="text-red-500">●</span> 上軌（壓力）
                </span>
                <span className="font-medium text-gray-900">{bollinger.upper}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">
                  <span className="text-blue-500">●</span> 中軌（20MA）
                </span>
                <span className="font-medium text-gray-900">{bollinger.mid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">
                  <span className="text-emerald-600">●</span> 下軌（支撐）
                </span>
                <span className="font-medium text-gray-900">{bollinger.lower}</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>下軌</span>
                <span>中軌</span>
                <span>上軌</span>
              </div>
              <div className="relative h-2 rounded-full bg-gradient-to-r from-blue-400 to-red-400">
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-white border-2 border-gray-700"
                  style={{ left: `${bollinger.positionPct}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-2">帶寬：{bollinger.bandwidthPct}%</div>
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-400">資料不足</div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-sm text-gray-500 mb-3">近期支撐壓力位 (20日)</div>
        {supportResistance ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs text-red-500">▲ 壓力位（近期高點）</div>
                <div className="text-lg font-semibold text-gray-900">{supportResistance.resistance}</div>
              </div>
              <div className="text-xs text-red-500 text-right">
                距壓力
                <div className="font-medium">{supportResistance.distanceToResistancePct}%</div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs text-emerald-600">▼ 支撐位（近期低點）</div>
                <div className="text-lg font-semibold text-gray-900">{supportResistance.support}</div>
              </div>
              <div className="text-xs text-emerald-600 text-right">
                距支撐
                <div className="font-medium">{supportResistance.distanceToSupportPct}%</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-400">資料不足</div>
        )}
      </div>
    </div>
  )
}
