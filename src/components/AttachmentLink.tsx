import type { Attachment } from '../lib/types'

export default function AttachmentLink({
  attachment,
}: {
  attachment?: Attachment | null
}) {
  if (!attachment) return null
  const label = attachment.type === 'pdf' ? 'PDFを見る' : '画像を見る'
  return (
    <a
      className="chip"
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
    >
      {label}
      {attachment.name ? ` (${attachment.name})` : ''}
    </a>
  )
}
