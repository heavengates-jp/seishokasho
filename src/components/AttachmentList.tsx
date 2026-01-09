import { useEffect, useState } from 'react'
import type { Attachment } from '../lib/types'
import { decodeEntities, parseBdscPreview } from '../lib/bdsc'

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

const isBdsc = (a: Attachment) => {
  const hint = `${a.url ?? ''} ${a.name ?? ''}`.toLowerCase()
  return hint.includes('.bdsc')
}

const shouldPreviewText = (a: Attachment) => a.type === 'text' || isBdsc(a)

const formatTextPreview = (raw: string) => {
  // XMLなどをパースせず、生のテキストを表示
  const decoded = decodeEntities(raw)
  return decoded.trim()
}

type PreviewState = Record<string, { text?: string; error?: boolean; loading?: boolean }>

const decodeWithBom = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf)
  if (bytes.length >= 2) {
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      return new TextDecoder('utf-16le').decode(bytes)
    }
    if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      return new TextDecoder('utf-16be').decode(bytes)
    }
  }
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes)
  }
  return ''
}

const decodeBestText = (buf: ArrayBuffer) => {
  const bom = decodeWithBom(buf)
  if (bom) return bom
  const tryDecode = (enc: string) => {
    try {
      return new TextDecoder(enc).decode(buf)
    } catch {
      return ''
    }
  }
  const candidates = ['utf-8', 'utf-16le', 'utf-16be', 'shift_jis', 'windows-31j']
  let best = ''
  let bestScene = -1
  let bestScore = Infinity
  candidates.forEach((enc) => {
    const text = tryDecode(enc)
    if (!text) return
    const sceneCount = (text.match(/<scene\b/g) || []).length
    const score = (text.match(/\uFFFD/g) || []).length
    if (sceneCount > bestScene || (sceneCount === bestScene && score < bestScore)) {
      best = text
      bestScene = sceneCount
      bestScore = score
    }
  })
  return best || tryDecode('utf-8')
}

const formatBdscPreview = (raw: string) => {
  const sceneTags = raw.match(/<scene\b[^>]*>/g) ?? []
  if (sceneTags.length === 0) return ''

  const readAttrs = (tag: string) => {
    const attrs: Record<string, string> = {}
    tag.replace(/(\w+)="([^"]*)"/g, (_, key, value) => {
      attrs[key] = value
      return ''
    })
    return attrs
  }

  const scenes = sceneTags.map(readAttrs)

  type Entry = { bookChapter: string; verse: string; message: string; yakuText: string }
  const entries: Entry[] = []

  scenes.forEach((scene) => {
    const yakuText = scene.YakuText ?? ''
    const position = scene.PositionText ?? ''
    const message = scene.MainMessage ?? ''
    if (!position || !message) return
    const normalized = decodeEntities(position).replace(/\s+/g, ' ').trim()
    const match = normalized.match(/^(.*?)[：:]\s*(\d+)\s*$/)
    const bookChapter = match ? match[1] : normalized
    const verse = match ? match[2] : ''
    const decodedMessage = decodeEntities(message).trim()
    if (!decodedMessage) return
    entries.push({ bookChapter, verse, message: decodedMessage, yakuText })
  })

  if (entries.length === 0) return ''

  const lines: string[] = []

  let i = 0
  let currentYaku = ''
  let firstInYaku = true
  while (i < entries.length) {
    const yakuText = entries[i].yakuText || ''
    if (yakuText && yakuText !== currentYaku) {
      if (lines.length) lines.push('')
      lines.push(yakuText)
      currentYaku = yakuText
      firstInYaku = true
    }

    const current = entries[i]
    const bookChapter = current.bookChapter
    const section: Entry[] = []
    while (
      i < entries.length &&
      entries[i].bookChapter === bookChapter &&
      (entries[i].yakuText || '') === yakuText
    ) {
      section.push(entries[i])
      i += 1
    }

    if (!firstInYaku) lines.push('')
    firstInYaku = false

    const verses = section.map((e) => e.verse).filter(Boolean)
    const header =
      verses.length > 0
        ? `${bookChapter}:${verses[0]}${verses.length > 1 ? `-${verses[verses.length - 1]}` : ''}`
        : bookChapter
    lines.push(header)
    if (section.length === 1) {
      lines.push(section[0].message)
    } else {
      section.forEach((entry) => {
        lines.push(entry.verse ? `${entry.verse}. ${entry.message}` : entry.message)
      })
    }
  }

  return lines.join('\n')
}

export default function AttachmentList({ attachments }: { attachments?: Attachment[] }) {
  const [previews, setPreviews] = useState<PreviewState>({})
  const canShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const copyToClipboard = async (text: string) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch (e) {
      console.error('copy failed', e)
    }
  }

  const shareText = async (text: string) => {
    if (!text) return
    try {
      if (canShare) {
        await navigator.share({ text })
      } else {
        await navigator.clipboard.writeText(text)
      }
    } catch (e) {
      console.error('share failed', e)
    }
  }

  useEffect(() => {
    let cancelled = false
    const load = async (a: Attachment, key: string) => {
      if (!shouldPreviewText(a) || a.preview) return
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
        let formatted = ''
        if (isBdsc(a)) {
          const rawText = decodeBestText(buf)
          formatted =
            parseBdscPreview(rawText) ||
            formatBdscPreview(rawText) ||
            formatTextPreview(rawText)
        } else {
          formatted = formatTextPreview(decodeBestText(buf))
        }
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
        const isPreviewable = shouldPreviewText(a)
        const inlinePreview = (a.preview || '').trim()
        const previewText = inlinePreview || preview?.text || ''
        const hasPreview = Boolean(inlinePreview || preview?.text)
        return (
          <li key={key} className="attachment-item">
            {!hasPreview && !isPreviewable && (
              <div className="attachment-meta">
                <span className="attachment-name">
                  {a.name ?? '添付ファイル'} <span className="muted">[{labelFor(a)}]</span>
                </span>
                <a className="chip" href={a.url} target="_blank" rel="noreferrer">
                  開く
                </a>
              </div>
            )}
            {isPreviewable && !hasPreview && a.name && (
              <div className="attachment-meta">
                <span className="attachment-name">
                  {a.name} <span className="muted">[{labelFor(a)}]</span>
                </span>
              </div>
            )}
            {isPreviewable && !a.url && (
              <p className="muted small">プレビューを読み込めませんでした</p>
            )}
            {isPreviewable && !hasPreview && !preview?.error && (
              <p className="muted small">読み込み中…</p>
            )}
            {hasPreview && (
              <>
                <div className="attachment-meta">
                  <span className="attachment-name">テキスト操作</span>
                  <div className="attachment-actions">
                    <button
                      type="button"
                      className="chip"
                      onClick={() => copyToClipboard(previewText)}
                    >
                      コピー
                    </button>
                    {canShare && (
                      <button
                        type="button"
                        className="chip"
                        onClick={() => shareText(previewText)}
                      >
                        共有
                      </button>
                    )}
                  </div>
                </div>
                <pre className="attachment-preview">{previewText}</pre>
              </>
            )}
            {isPreviewable && preview?.error && (
              <p className="muted small">プレビューを読み込めませんでした</p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
