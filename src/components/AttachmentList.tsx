import { useEffect, useState } from 'react'
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

type PreviewState = Record<string, { text?: string; error?: boolean }>

export default function AttachmentList({ attachments }: { attachments?: Attachment[] }) {
  const [previews, setPreviews] = useState<PreviewState>({})

  useEffect(() => {
    let cancelled = false
    const load = async (a: Attachment) => {
      if (previews[a.url] || a.type !== 'text') return
      try {
        const res = await fetch(a.url)
        if (!res.ok) throw new Error('fetch failed')
        const text = await res.text()
        if (!cancelled) {
          setPreviews((p) => ({ ...p, [a.url]: { text } }))
        }
      } catch (e) {
        console.error('text preview failed', e)
        if (!cancelled) {
          setPreviews((p) => ({ ...p, [a.url]: { error: true } }))
        }
      }
    }
    attachments?.forEach((a) => {
      if (a.type === 'text') load(a)
    })
    return () => {
      cancelled = true
    }
  }, [attachments, previews])

  if (!attachments || attachments.length === 0) return null

  return (
    <ul className="attachment-list">
      {attachments.map((a) => {
        const preview = previews[a.url]
        return (
          <li key={a.url} className="attachment-item">
            <div className="attachment-meta">
              <span className="attachment-name">
                {a.name ?? '添付ファイル'} <span className="muted">[{labelFor(a)}]</span>
              </span>
              <a className="chip" href={a.url} target="_blank" rel="noreferrer">
                開く
              </a>
            </div>
            {a.type === 'text' && preview?.text && (
              <pre className="attachment-preview">{preview.text}</pre>
            )}
            {a.type === 'text' && preview?.error && (
              <p className="muted small">プレビューを読み込めませんでした</p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
