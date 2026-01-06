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

const decodeEntities = (text: string) =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

const formatTextPreview = (text: string) => {
  const looksLikeXml = /<[^>]+>/.test(text)
  const stripped = looksLikeXml
    ? decodeEntities(text).replace(/<[^>]+>/g, '')
    : text
  return stripped.trim()
}

type PreviewState = Record<
  string,
  { text?: string; error?: boolean; loading?: boolean }
>

export default function AttachmentList({ attachments }: { attachments?: Attachment[] }) {
  const [previews, setPreviews] = useState<PreviewState>({})

  useEffect(() => {
    let cancelled = false
    const load = async (a: Attachment) => {
      if (a.type !== 'text') return
      if (previews[a.url]?.text || previews[a.url]?.loading) return
      setPreviews((p) => ({ ...p, [a.url]: { loading: true } }))
      try {
        const res = await fetch(a.url)
        if (!res.ok) throw new Error('fetch failed')
        const raw = await res.text()
        const formatted = formatTextPreview(raw)
        if (!cancelled) {
          setPreviews((p) => ({ ...p, [a.url]: { text: formatted } }))
        }
      } catch (e) {
        console.error('text preview failed', e)
        if (!cancelled) {
          setPreviews((p) => ({ ...p, [a.url]: { error: true } }))
        }
      }
    }
    attachments?.forEach(load)
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
              {a.type !== 'text' && (
                <a className="chip" href={a.url} target="_blank" rel="noreferrer">
                  開く
                </a>
              )}
            </div>
            {a.type === 'text' && preview?.loading && (
              <p className="muted small">読み込み中...</p>
            )}
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
