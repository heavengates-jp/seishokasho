import { Link } from 'react-router-dom'
import type { Verse } from '../lib/types'
import { toBibleComLink, toPrsLink } from '../lib/utils'
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
          <Link className="ghost" to={`/history/${verse.date}`}>
            詳細
          </Link>
        )}
      </div>
      {verse.comment && <p className="body">{verse.comment}</p>}
      <div className="stack">
        <AttachmentList attachments={attachments} />
        <div className="link-row">
          <a
            className="chip"
            href={toPrsLink(verse.reference)}
            target="_blank"
            rel="noreferrer"
          >
            新改訳2017で開く
          </a>
          <a
            className="chip"
            href={toBibleComLink(verse.reference)}
            target="_blank"
            rel="noreferrer"
          >
            Bible.com で開く
          </a>
        </div>
      </div>
    </article>
  )
}
