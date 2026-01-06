import JSZip from 'jszip'
import { supabase } from './supabase'
import type { Attachment, AttachmentType } from './types'

const bucket = import.meta.env.VITE_SUPABASE_BUCKET ?? 'attachments'

const mimeFromName = (name: string) => {
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(lower)) return 'image/*'
  if (/\.(txt|md|csv|json)$/.test(lower)) return 'text/plain'
  return 'application/octet-stream'
}

const typeFromName = (name: string): AttachmentType => {
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return 'pdf'
  if (/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(lower)) return 'image'
  if (/\.(txt|md|csv|json)$/.test(lower)) return 'text'
  return 'other'
}

const sanitizeName = (name: string) => name.replace(/\s+/g, '-')

async function uploadBlob(
  blob: Blob,
  originalName: string,
): Promise<Attachment> {
  const safeName = sanitizeName(originalName)
  const path = `${Date.now()}-${safeName}`
  const contentType = (blob.type && blob.type !== 'application/octet-stream'
    ? blob.type
    : mimeFromName(safeName)) as string

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { upsert: true, contentType })

  if (error) {
    console.error('Upload failed', error)
    throw new Error('アップロードに失敗しました')
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data?.path ?? path)

  return {
    url: publicUrlData.publicUrl,
    type: typeFromName(safeName),
    name: originalName,
  }
}

export async function uploadAttachments(files: File[]): Promise<Attachment[]> {
  const attachments: Attachment[] = []

  for (const file of files) {
    const isZip =
      file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip')

    if (!isZip) {
      attachments.push(await uploadBlob(file, file.name))
      continue
    }

    const zip = await JSZip.loadAsync(file)
    const entries = Object.values(zip.files).filter((f) => !f.dir)

    for (const entry of entries) {
      const blob = await entry.async('blob')
      const typedBlob = new Blob([blob], {
        type: mimeFromName(entry.name),
      })
      attachments.push(await uploadBlob(typedBlob, entry.name))
    }
  }

  return attachments
}
