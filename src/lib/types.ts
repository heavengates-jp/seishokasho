export type AttachmentType = 'pdf' | 'image' | 'text' | 'other'

export type Attachment = {
  url: string
  type: AttachmentType
  name?: string
  preview?: string
}

export type Verse = {
  id: string
  date: string
  weekday: string
  reference: string
  comment?: string
  attachment?: Attachment | null
  attachments?: Attachment[]
  createdAt?: number
  updatedAt?: number
}

export type VerseForm = {
  date: string
  reference: string
  comment: string
}
