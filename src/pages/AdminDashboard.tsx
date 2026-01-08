import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import JSZip from 'jszip'
import dayjs from 'dayjs'
import VerseList from '../components/VerseList'
import { useAuth } from '../contexts/AuthContext'
import { deleteVerse, fetchVerses, saveVerse } from '../lib/firestore'
import type { Attachment, Verse } from '../lib/types'
import { parseBdscPreview } from '../lib/bdsc'
import { uploadAttachments } from '../lib/storage'
import { formatWeekday, saveCache } from '../lib/utils'

const emptyForm = () => ({
  date: dayjs().format('YYYY-MM-DD'),
  reference: '',
  comment: '',
})

export default function AdminDashboard() {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [files, setFiles] = useState<File[]>([])
  const [verses, setVerses] = useState<Verse[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [previewText, setPreviewText] = useState<string>('')
  const [previewFileName, setPreviewFileName] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      setStatus('loading')
      try {
        const data = await fetchVerses()
        setVerses(data)
        saveCache('cached_history', data)
        setStatus('idle')
      } catch (e) {
        console.error(e)
        setStatus('error')
      }
    }
    load()
  }, [])

  useEffect(() => {
    let cancelled = false
    const buildPreview = async (targets: File[]) => {
      if (!targets.length) {
        if (!cancelled) {
          setPreviewText('')
          setPreviewFileName('')
        }
        return
      }

      const first = targets[0]
      if (first.name.toLowerCase().endsWith('.bdsc')) {
        const raw = await first.text()
        const parsed = parseBdscPreview(raw)
        if (!cancelled) {
          setPreviewText(parsed)
          setPreviewFileName(first.name)
        }
        return
      }

      if (first.name.toLowerCase().endsWith('.zip')) {
        const zip = await JSZip.loadAsync(first)
        const entries = Object.values(zip.files).filter((f) => !f.dir)
        for (const entry of entries) {
          if (!entry.name.toLowerCase().endsWith('.bdsc')) continue
          const raw = await entry.async('string')
          const parsed = parseBdscPreview(raw)
          if (!cancelled) {
            setPreviewText(parsed)
            setPreviewFileName(entry.name)
          }
          return
        }
      }

      if (!cancelled) {
        setPreviewText('')
        setPreviewFileName(first.name)
      }
    }

    buildPreview(files)
    return () => {
      cancelled = true
    }
  }, [files])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (previewText && !window.confirm('上記の内容で保存しますか？')) {
      return
    }
    setMessage(null)
    setStatus('loading')
    try {
      let attachments: Attachment[] = []
      if (files.length) {
        attachments = await uploadAttachments(files)
      }

      await saveVerse({
        date: form.date,
        reference: form.reference,
        comment: form.comment,
        attachments,
      })
      const updated = await fetchVerses()
      setVerses(updated)
      saveCache('cached_history', updated)
      setMessage('保存しました（公開済み）')
      setFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      setPreviewText('')
      setPreviewFileName('')
      setForm(emptyForm())
      setStatus('idle')
    } catch (err) {
      console.error(err)
      setMessage('保存に失敗しました。権限とネットワークを確認してください。')
      setStatus('error')
    }
  }

  const handleDelete = async (id: string) => {
    const target = verses.find((v) => v.id === id)
    const label = target ? `${target.date} ${target.reference}` : id
    if (!window.confirm(`${label} を削除しますか？`)) return
    try {
      await deleteVerse(id)
      const updated = verses.filter((v) => v.id !== id)
      setVerses(updated)
      saveCache('cached_history', updated)
    } catch (err) {
      console.error(err)
      alert('削除に失敗しました')
    }
  }

  return (
    <div className="stack page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>管理ダッシュボード</h1>
        </div>
        {status === 'loading' && <span className="pill">処理中</span>}
        {status === 'error' && (
          <span className="pill danger">エラーが発生しました</span>
        )}
      </div>

      <form className="card form" onSubmit={handleSubmit}>
        <div className="split">
          <label>
            日付
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </label>
          <label>
            曜日
            <input type="text" value={formatWeekday(form.date)} readOnly />
          </label>
        </div>
        <label>
          メッセージタイトル（参照文字列）
          <input
            type="text"
            placeholder="例: ヨハネ3:16"
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
            required
          />
        </label>
        <label>
          コメント（任意）
          <textarea
            rows={3}
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
          />
        </label>
        <label>
          添付資料（PDF/画像/テキスト/ZIP可・複数選択可）
          <input
            type="file"
            multiple
            accept=".pdf,image/*,.zip,.bdsc,.txt,.md,.csv"
            ref={fileInputRef}
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </label>
        {previewFileName && (
          <div className="card" style={{ background: '#f8fafc' }}>
            <p className="muted small">プレビュー（保存前の確認）</p>
            <p className="muted small">日付: {form.date}</p>
            <p className="muted small">曜日: {formatWeekday(form.date)}</p>
            <p className="muted small">メッセージタイトル: {form.reference}</p>
            {form.comment && <p className="muted small">コメント: {form.comment}</p>}
            <p className="muted small">ファイル名: {previewFileName}</p>
            {previewText ? (
              <pre className="attachment-preview">{previewText}</pre>
            ) : (
              <p className="muted small">プレビューが作成できませんでした</p>
            )}
          </div>
        )}
        {message && <p className="muted">{message}</p>}
        <button type="submit" disabled={status === 'loading'}>
          保存＝公開
        </button>
      </form>

      <section className="stack">
        <div className="section-head">
          <h2>履歴一覧</h2>
          <p className="muted small">管理者のみ削除可能</p>
        </div>
        <VerseList verses={verses} onDelete={handleDelete} />
      </section>
    </div>
  )
}
