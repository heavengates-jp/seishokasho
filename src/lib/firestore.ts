import dayjs from 'dayjs'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import type { Attachment, Verse } from './types'
import { formatWeekday, sortByDateDesc } from './utils'

const versesRef = collection(db, 'verses')

const toMillis = (value: unknown) =>
  typeof value === 'object' && value !== null && 'toMillis' in value
    ? // @ts-expect-error firebase timestamp type guard
      value.toMillis()
    : typeof value === 'number'
      ? value
      : undefined

const mapDoc = (id: string, data: Record<string, unknown>): Verse => {
  const date = (data.date as string) ?? id
  const attachment = data.attachment as Attachment | undefined
  const attachments = (data.attachments as Attachment[] | undefined) ?? []
  const mergedAttachments =
    attachments.length > 0
      ? attachments
      : attachment
        ? [attachment]
        : []

  return {
    id,
    date,
    weekday: (data.weekday as string) ?? formatWeekday(date),
    reference: (data.reference as string) ?? '',
    comment: (data.comment as string) ?? '',
    attachment,
    attachments: mergedAttachments,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  }
}

export async function fetchTodayOrLatest(): Promise<Verse | null> {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase config missing')
  }
  const todayId = dayjs().format('YYYY-MM-DD')
  const todaySnap = await getDoc(doc(versesRef, todayId))
  if (todaySnap.exists()) {
    return mapDoc(todaySnap.id, todaySnap.data())
  }

  const latestSnap = await getDocs(
    query(versesRef, orderBy('date', 'desc'), limit(1)),
  )
  if (!latestSnap.empty) {
    const docSnap = latestSnap.docs[0]
    return mapDoc(docSnap.id, docSnap.data())
  }
  return null
}

export async function fetchVerseByDate(date: string): Promise<Verse | null> {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase config missing')
  }
  const snap = await getDoc(doc(versesRef, date))
  if (!snap.exists()) return null
  return mapDoc(snap.id, snap.data())
}

export async function fetchVerses(): Promise<Verse[]> {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase config missing')
  }
  const snaps = await getDocs(query(versesRef, orderBy('date', 'desc')))
  const verses: Verse[] = snaps.docs.map((d) => mapDoc(d.id, d.data()))
  return sortByDateDesc(verses)
}

export async function saveVerse(
  verse: Omit<Verse, 'id' | 'weekday' | 'createdAt' | 'updatedAt'> & {
    attachment?: Attachment | null
    attachments?: Attachment[]
  },
) {
  const weekday = formatWeekday(verse.date)
  const ref = doc(versesRef, verse.date)
  const existing = await getDoc(ref)
  const payload: Record<string, unknown> = {
    date: verse.date,
    weekday,
    reference: verse.reference,
    comment: verse.comment ?? '',
    attachment: verse.attachment ?? null,
    attachments: verse.attachments ?? (verse.attachment ? [verse.attachment] : []),
    updatedAt: serverTimestamp(),
  }

  if (existing.exists()) {
    await setDoc(ref, payload, { merge: true })
  } else {
    await setDoc(ref, { ...payload, createdAt: serverTimestamp() })
  }
}

export const deleteVerse = (date: string) => deleteDoc(doc(versesRef, date))
