import dayjs from 'dayjs'

const weekdayTable = ['日', '月', '火', '水', '木', '金', '土']

export const formatWeekday = (date: string) => {
  const dayIndex = dayjs(date).day()
  return weekdayTable[dayIndex] ?? ''
}

export const toPrsLink = (reference: string) =>
  `https://prs.app/ja/search?q=${encodeURIComponent(reference)}`

export const toBibleComLink = (reference: string) =>
  `https://www.bible.com/search/bible?q=${encodeURIComponent(reference)}`

export function saveCache(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.warn('cache write failed', e)
  }
}

export function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch (e) {
    console.warn('cache read failed', e)
    return null
  }
}

export function sortByDateDesc<T extends { date: string }>(items: T[]) {
  return [...items].sort((a, b) => (a.date > b.date ? -1 : 1))
}
