import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import VerseCard from '../components/VerseCard'
import { fetchVerseByDate } from '../lib/firestore'
import type { Verse } from '../lib/types'
import { readCache } from '../lib/utils'

export default function HistoryDetail() {
  const { date } = useParams<{ date: string }>()
  const [verse, setVerse] = useState<Verse | null>(() => {
    const cached = readCache<Verse[]>('cached_history') ?? []
    return cached.find((v) => v.id === date) ?? null
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    if (!date) return
    const load = async () => {
      setStatus('loading')
      try {
        const result = await fetchVerseByDate(date)
        setVerse(result)
        setStatus('idle')
      } catch (e) {
        console.error(e)
        setStatus('error')
      }
    }
    load()
  }, [date])

  return (
    <div className="stack page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Detail</p>
          <h1>{date} の詳細</h1>
        </div>
        {status === 'loading' && <span className="pill">更新中</span>}
        {status === 'error' && <span className="pill danger">オフライン</span>}
      </div>
      {verse ? (
        <VerseCard verse={verse} />
      ) : (
        <p className="muted">データが見つかりません（削除済みの可能性）</p>
      )}
    </div>
  )
}
