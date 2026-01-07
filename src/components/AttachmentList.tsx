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

const formatTextPreview = (raw: string) => {
  // XMLなどをパースせず、生のテキストを表示
  const decoded = decodeEntities(raw)
  return decoded.trim()
}

type PreviewState = Record<string, { text?: string; error?: boolean; loading?: boolean }>

export default function AttachmentList({ attachments }: { attachments?: Attachment[] }) {
  const [previews, setPreviews] = useState<PreviewState>({})

  useEffect(() => {
    let cancelled = false
    const load = async (a: Attachment, key: string) => {
      if (a.type !== 'text') return
      const existing = previews[key]
      if (existing?.text || existing?.loading || existing?.error) return
      if (!a.url) {
        setPreviews((p) => ({ ...p, [key]: { error: true } }))
        return
      }
      setPreviews((p) => ({ ...p, [key]: { loading: true } }))
      const fallbackTimer = setTimeout(() => {
        setPreviews((p) => ({
          ...p,
          [key]: p[key]?.text ? p[key]! : { error: true },
        }))
      }, 6000)
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 8000)
        const res = await fetch(a.url, { signal: controller.signal, cache: 'no-store' })
        clearTimeout(timer)
        if (!res.ok) throw new Error('fetch failed')
        const buf = await res.arrayBuffer()
        const tryDecode = (enc: string) => {
          try {
            return new TextDecoder(enc).decode(buf)
          } catch {
            return ''
          }
        }
        // shift_jis と UTF-8 をスコアで選択（� が少ない方）
        const candidates = ['shift_jis', 'windows-31j', 'utf-8']
        let best = ''
        let bestScore = Infinity
        candidates.forEach((enc) => {
          const text = tryDecode(enc)
          if (!text) return
          const score = (text.match(/\uFFFD/g) || []).length
          if (score < bestScore) {
            best = text
            bestScore = score
          }
        })
        const raw = best || tryDecode('utf-8')
        const formatted = formatTextPreview(raw)
        clearTimeout(fallbackTimer)
        if (!cancelled) {
          if (formatted) {
            setPreviews((p) => ({ ...p, [key]: { text: formatted } }))
          } else {
            setPreviews((p) => ({ ...p, [key]: { error: true } }))
          }
        }
      } catch (e) {
        console.error('text preview failed', e)
        clearTimeout(fallbackTimer)
        if (!cancelled) {
          setPreviews((p) => ({ ...p, [key]: { error: true } }))
        }
      }
    }
    attachments?.forEach((a, idx) => {
      const key = a.url || `missing-${idx}`
      load(a, key)
    })
    return () => {
      cancelled = true
    }
  }, [attachments, previews])

  if (!attachments || attachments.length === 0) return null

  return (
    <ul className="attachment-list">
      {attachments.map((a, idx) => {
        const key = a.url || `missing-${idx}`
        const preview = previews[key]
        return (
          <li key={key} className="attachment-item">
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
            {a.type === 'text' && !a.url && (
              <p className="muted small">プレビューを読み込めませんでした</p>
            )}
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
