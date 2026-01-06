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
  const decoded = decodeEntities(text)
  // .bdsc のシナリオXMLを簡易パース
  if (/<scenario[\s>]/i.test(decoded)) {
    const dom = new DOMParser().parseFromString(decoded, 'text/xml')
    const scenes = Array.from(dom.getElementsByTagName('scene'))
    const lines = scenes
      .map((scene) => {
        const pos = scene.getAttribute('PositionText')?.trim() ?? ''
        const yaku = scene.getAttribute('YakuText')?.trim() ?? ''
        return [pos, yaku].filter(Boolean).join('\n')
      })
      .filter(Boolean)
    if (lines.length) {
      return lines.join('\n')
    }
  }
  const looksLikeXml = /<[^>]+>/.test(decoded)
  const stripped = looksLikeXml ? decoded.replace(/<[^>]+>/g, '') : decoded
  return stripped.trim()
}

type PreviewState = Record<string, { text?: string; error?: boolean; loading?: boolean }>

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
        const buf = await res.arrayBuffer()
        const tryDecode = (enc: string) => new TextDecoder(enc).decode(buf)
        let raw = ''
        try {
          raw = tryDecode('shift_jis')
        } catch {
          raw = tryDecode('utf-8')
        }
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
            {a.type !== 'text' && (
              <div className="attachment-meta">
                <span className="attachment-name">
                  {a.name ?? '添付ファイル'} <span className="muted">[{labelFor(a)}]</span>
                </span>
                <a className="chip" href={a.url} target="_blank" rel="noreferrer">
                  開く
                </a>
              </div>
            )}
            {a.type === 'text' && preview?.loading && (
              <p className="muted small">読み込み中...</p>
            )}
            {a.type === 'text' && preview?.text && (
              <pre className="attachment-preview">
                {a.name ? `${a.name}\n\n` : ''}
                {preview.text}
              </pre>
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
