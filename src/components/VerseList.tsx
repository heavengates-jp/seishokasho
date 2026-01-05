import type { Verse } from '../lib/types'

export default function VerseList({
  verses,
  onDelete,
}: {
  verses: Verse[]
  onDelete?: (date: string) => void
}) {
  if (!verses.length) {
    return <p className="muted">登録がありません</p>
  }
  return (
    <ul className="list">
      {verses.map((v) => (
        <li key={v.id} className="list-row">
          <div>
            <p className="eyebrow">
              {v.date}（{v.weekday}）
            </p>
            <p className="list-title">{v.reference}</p>
            {v.comment && <p className="muted">{v.comment}</p>}
          </div>
          {onDelete && (
            <button className="danger ghost" onClick={() => onDelete(v.id)}>
              削除
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
