export type HistoryFilter = {
  start: string
  end: string
  query: string
}

export default function Filters({
  value,
  onChange,
}: {
  value: HistoryFilter
  onChange: (next: HistoryFilter) => void
}) {
  return (
    <div className="filters">
      <label>
        開始日
        <input
          type="date"
          value={value.start}
          onChange={(e) => onChange({ ...value, start: e.target.value })}
        />
      </label>
      <label>
        終了日
        <input
          type="date"
          value={value.end}
          onChange={(e) => onChange({ ...value, end: e.target.value })}
        />
      </label>
      <label className="full">
        聖書/語句
        <input
          type="search"
          placeholder="例: ヨハネ"
          value={value.query}
          onChange={(e) => onChange({ ...value, query: e.target.value })}
        />
      </label>
    </div>
  )
}
