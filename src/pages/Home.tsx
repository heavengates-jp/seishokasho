import { useEffect, useState } from 'react'
import VerseCard from '../components/VerseCard'
import { fetchTodayOrLatest } from '../lib/firestore'
import type { Verse } from '../lib/types'
import { readCache, saveCache } from '../lib/utils'

const CACHE_KEY = 'cached_today'

export default function Home() {
  const [verse, setVerse] = useState<Verse | null>(() =>
    readCache<Verse>(CACHE_KEY),
  )
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    const load = async () => {
      setStatus('loading')
      try {
        const latest = await fetchTodayOrLatest()
        setVerse(latest)
        if (latest) saveCache(CACHE_KEY, latest)
        setStatus('idle')
      } catch (e) {
        console.error(e)
        setStatus('error')
      }
    }
    load()
  }, [])

  return (
    <div className="stack page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Today</p>
          <h1>今日の聖書箇所</h1>
        </div>
        {status === 'loading' && <span className="pill">読み込み中</span>}
        {status === 'error' && <span className="pill danger">オフライン表示</span>}
      </div>
      {verse ? (
        <VerseCard verse={verse} />
      ) : (
        <p className="muted">まだ登録がありません</p>
      )}
      <div className="notice">
        <p className="eyebrow">オフライン対応</p>
        <p className="muted">
          直近に開いた「今日」の内容はキャッシュされ、オフラインでも再表示できます。
        </p>
      </div>
    </div>
  )
}
