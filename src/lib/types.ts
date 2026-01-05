export type Attachment = {
  url: string
  type: 'pdf' | 'image'
  name?: string
}

export type Verse = {
  id: string
  date: string
  weekday: string
  reference: string
  comment?: string
  attachment?: Attachment | null
  createdAt?: number
  updatedAt?: number
}

export type VerseForm = {
  date: string
  reference: string
  comment: string
}
