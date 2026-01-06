import type { Attachment } from '../lib/types'

const labelFor = (a: Attachment) => {
  switch (a.type) {
    case 'pdf':
      return 'PDF'
    case 'image':
      return '画像'
    case 'text':
      return 'テキスト'
    default:
      return 'ファイル'
  }
}

export default function AttachmentList({ attachments }: { attachments?: Attachment[] }) {
  if (!attachments || attachments.length === 0) return null

  return (
    <div className="link-row">
      {attachments.map((a) => (
        <a key={a.url} className="chip" href={a.url} target="_blank" rel="noreferrer">
          {labelFor(a)}
          {a.name ? ` (${a.name})` : ''}
        </a>
      ))}
    </div>
  )
}
