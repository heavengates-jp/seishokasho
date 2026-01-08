import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import VerseCard from '../components/VerseCard'
import { fetchVerseById } from '../lib/firestore'
import type { Verse } from '../lib/types'
import { readCache } from '../lib/utils'

export default function HistoryDetail() {
  const { id } = useParams<{ id: string }>()
  const [verse, setVerse] = useState<Verse | null>(() => {
    if (!id) return null
    const cached = readCache<Verse[]>('cached_history') ?? []
    return cached.find((v) => v.id === id) ?? null
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setStatus('loading')
      try {
        const result = await fetchVerseById(id)
        setVerse(result)
        setStatus('idle')
      } catch (e) {
        console.error(e)
        setStatus('error')
      }
    }
    load()
  }, [id])

  return (
    <div className="stack page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Detail</p>
          <h1>{verse?.date ?? '詳細'} の詳細</h1>
        </div>
        <div className="link-row">
          <Link className="ghost" to="/history">
            履歴に戻る
          </Link>
          {status === 'loading' && <span className="pill">読み込み中</span>}
          {status === 'error' && <span className="pill danger">エラー</span>}
        </div>
      </div>
      {verse ? (
        <VerseCard verse={verse} />
      ) : (
        <p className="muted">データが見つかりません（削除済みの可能性）</p>
      )}
    </div>
  )
}
