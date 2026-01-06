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
  const decoded = decodeEntities(raw)

  const parsePos = (pos: string) => {
    // 例: "創世記 44:14"
    const m = pos.match(/^(.+?)\\s+(\\d+):?(\\d+)?$/)
    if (!m) return null
    const [, book, chapter, verse] = m
    return { book: book.trim(), chapter: chapter.trim(), verse: verse?.trim() ?? '' }
  }

  // .bdsc（シナリオXML）をパースして本文を抽出
  if (/<scenario[\s>]/i.test(decoded)) {
    const dom = new DOMParser().parseFromString(decoded, 'text/xml')
    const scenes = Array.from(dom.getElementsByTagName('scene')).map((scene) => ({
      version: scene.getAttribute('YakuText')?.trim() ?? '',
      pos: parsePos(scene.getAttribute('PositionText')?.trim() ?? ''),
      message: scene.getAttribute('MainMessage')?.trim() ?? '',
    }))

    // 書名＋章ごとにまとめ、節は連続で表示
    const groups: Record<string, { book: string; chapter: string; version?: string; verses: { v: string; text: string }[] }> = {}
    scenes.forEach((s) => {
      if (!s.pos) return
      const key = `${s.pos.book}-${s.pos.chapter}`
      if (!groups[key]) {
        groups[key] = { book: s.pos.book, chapter: s.pos.chapter, version: s.version, verses: [] }
      }
      groups[key].verses.push({ v: s.pos.verse || '?', text: s.message })
    })

    const lines: string[] = []
    Object.values(groups).forEach((g) => {
      const header = [g.version, `${g.book} ${g.chapter}`].filter(Boolean).join(' ')
      if (header) lines.push(header)
      g.verses.forEach((v) => {
        lines.push(`${v.v} ${v.text}`.trim())
      })
      lines.push('') // blank line between groups
    })

    const text = lines.join('\n').trim()
    if (text) return text
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
