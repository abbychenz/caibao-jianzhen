export default function StatCard({ label, value, unit, note }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="text-sm text-gray-500 mb-2">{label}</div>
      <div className="text-2xl font-semibold text-gray-900">
        {value}
        <span className="text-base font-normal text-gray-500 ml-1">
          {unit}
        </span>
      </div>
      {note && <div className="text-xs text-gray-400 mt-2">{note}</div>}
    </div>
  )
}
