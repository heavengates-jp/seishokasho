import { useCallback, useEffect, useState } from 'react'
import VerseCard from '../components/VerseCard'
import { isFirebaseConfigured } from '../lib/firebase'
import { fetchTodayOrLatest } from '../lib/firestore'
import type { Verse } from '../lib/types'
import { readCache, saveCache } from '../lib/utils'

const CACHE_KEY = 'cached_today'

export default function Home() {
  const [verse, setVerse] = useState<Verse | null>(() =>
    readCache<Verse>(CACHE_KEY),
  )
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  const load = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    let alive = true
    const timer = setTimeout(() => {
      if (alive) setStatus('error')
    }, 8000)
    load().finally(() => clearTimeout(timer))
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [load])

  return (
    <div className="stack page">
      <div className="link-row">
        <button type="button" className="ghost" onClick={load}>
          更新
        </button>
      </div>
      {status === 'loading' && !verse && <span className="pill">読み込み中</span>}
      {status === 'error' && (
        <span className="pill danger">
          {isFirebaseConfigured ? 'オフライン表示' : '設定未完了'}
        </span>
      )}
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
