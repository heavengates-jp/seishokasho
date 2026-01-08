import { useEffect, useMemo, useState } from 'react'
import VerseCard from '../components/VerseCard'
import Filters, { type HistoryFilter } from '../components/Filters'
import { fetchVerses } from '../lib/firestore'
import type { Verse } from '../lib/types'
import { readCache, saveCache } from '../lib/utils'

const CACHE_KEY = 'cached_history'

const defaultFilter: HistoryFilter = { start: '', end: '', query: '' }

export default function History() {
  const [verses, setVerses] = useState<Verse[]>(() =>
    readCache<Verse[]>(CACHE_KEY) ?? [],
  )
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [filter, setFilter] = useState<HistoryFilter>(defaultFilter)

  useEffect(() => {
    const load = async () => {
      setStatus('loading')
      try {
        const result = await fetchVerses()
        setVerses(result)
        saveCache(CACHE_KEY, result)
        setStatus('idle')
      } catch (e) {
        console.error(e)
        setStatus('error')
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    return verses.filter((v) => {
      const inStart = filter.start ? v.date >= filter.start : true
      const inEnd = filter.end ? v.date <= filter.end : true
      const matchesQuery = filter.query
        ? [v.reference, v.comment].some((field) =>
            field?.toLowerCase().includes(filter.query.toLowerCase()),
          )
        : true
      return inStart && inEnd && matchesQuery
    })
  }, [filter.end, filter.query, filter.start, verses])

  return (
    <div className="stack page">
      <div className="page-head">
        <div>
          <p className="eyebrow">History</p>
          <h1>履歴</h1>
        </div>
        {status === 'loading' && <span className="pill">読み込み中</span>}
        {status === 'error' && <span className="pill danger">オフライン</span>}
      </div>
      <Filters value={filter} onChange={setFilter} />
      <div className="grid">
        {filtered.map((verse) => (
          <VerseCard key={verse.id} verse={verse} showDetailLink />
        ))}
      </div>
      {!filtered.length && (
        <p className="muted">該当する履歴がありません（期間を変更してください）</p>
      )}
    </div>
  )
}
