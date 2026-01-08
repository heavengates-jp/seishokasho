import { Link } from 'react-router-dom'
import type { Verse } from '../lib/types'
import AttachmentList from './AttachmentList'

export default function VerseCard({
  verse,
  showDetailLink = false,
}: {
  verse: Verse
  showDetailLink?: boolean
}) {
  const attachments =
    verse.attachments && verse.attachments.length
      ? verse.attachments
      : verse.attachment
        ? [verse.attachment]
        : []

  return (
    <article className="card">
      <div className="card-header">
        <div>
          <p className="eyebrow">
            {verse.date}（{verse.weekday}）
          </p>
          <h2 className="card-title">{verse.reference}</h2>
        </div>
        {showDetailLink && (
          <Link className="ghost" to={`/history/item/${verse.id}`}>
            詳細
          </Link>
        )}
      </div>
      {verse.comment && <p className="body">{verse.comment}</p>}
      <div className={`stack${showDetailLink ? ' attachment-desktop-only' : ''}`}>
        <AttachmentList attachments={attachments} />
      </div>
    </article>
  )
}
