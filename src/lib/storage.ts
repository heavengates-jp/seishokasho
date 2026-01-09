import JSZip from 'jszip'
import { supabase } from './supabase'
import { parseBdscPreview } from './bdsc'
import type { Attachment, AttachmentType } from './types'

const bucket = import.meta.env.VITE_SUPABASE_BUCKET ?? 'attachments'

const mimeFromName = (name: string) => {
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (/(\.png|jpg|jpeg|gif|webp|bmp|svg)$/.test(lower)) return 'image/*'
  if (/(\.txt|md|csv|json|bdsc)$/.test(lower)) return 'text/plain'
  return 'application/octet-stream'
}

const typeFromName = (name: string): AttachmentType => {
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return 'pdf'
  if (/(\.png|jpg|jpeg|gif|webp|bmp|svg)$/.test(lower)) return 'image'
  if (/(\.txt|md|csv|json|bdsc)$/.test(lower)) return 'text'
  return 'other'
}

const sanitizeName = (name: string) =>
  name
    .replace(/\s+/g, '-')
    // URLに使えない文字をハイフンに置き換える
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .replace(/-+/g, '-')

const extractPathFromUrl = (url: string) => {
  try {
    const parsed = new URL(url)
    const marker = `/storage/v1/object/public/${bucket}/`
    const index = parsed.pathname.indexOf(marker)
    if (index === -1) return ''
    return decodeURIComponent(parsed.pathname.slice(index + marker.length))
  } catch {
    return ''
  }
}

async function uploadBlob(
  blob: Blob,
  originalName: string,
  preview?: string,
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
    path: data?.path ?? path,
    type: typeFromName(safeName),
    name: originalName,
    preview,
  }
}

export async function uploadAttachments(files: File[]): Promise<Attachment[]> {
  const attachments: Attachment[] = []

  for (const file of files) {
    const isZip =
      file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip')

    if (!isZip) {
      const preview = file.name.toLowerCase().endsWith('.bdsc')
        ? parseBdscPreview(await file.text())
        : undefined
      attachments.push(await uploadBlob(file, file.name, preview))
      continue
    }

    const zip = await JSZip.loadAsync(file)
    const entries = Object.values(zip.files).filter((f) => !f.dir)

    for (const entry of entries) {
      const preview = entry.name.toLowerCase().endsWith('.bdsc')
        ? parseBdscPreview(await entry.async('string'))
        : undefined
      const blob = await entry.async('blob')
      const typedBlob = new Blob([blob], {
        type: mimeFromName(entry.name),
      })
      attachments.push(await uploadBlob(typedBlob, entry.name, preview))
    }
  }

  return attachments
}

export async function deleteAttachments(attachments: Attachment[]) {
  const paths = attachments
    .map((a) => a.path || (a.url ? extractPathFromUrl(a.url) : ''))
    .filter(Boolean)

  if (paths.length === 0) return
  const unique = Array.from(new Set(paths))
  const { error } = await supabase.storage.from(bucket).remove(unique)
  if (error) {
    console.error('Delete failed', error)
    throw new Error('添付ファイルの削除に失敗しました')
  }
}
