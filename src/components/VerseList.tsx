import type { Verse } from '../lib/types'

export default function VerseList({
  verses,
  onDelete,
  onEdit,
}: {
  verses: Verse[]
  onDelete?: (id: string) => void
  onEdit?: (id: string) => void
}) {
  if (!verses.length) {
    return <p className="muted">履歴がありません</p>
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
            {v.hidden && <p className="muted small">非表示</p>}
            {v.comment && <p className="muted">{v.comment}</p>}
          </div>
          <div className="link-row">
            {onEdit && (
              <button className="ghost" onClick={() => onEdit(v.id)}>
                編集
              </button>
            )}
            {onDelete && (
              <button className="danger ghost" onClick={() => onDelete(v.id)}>
                削除
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
