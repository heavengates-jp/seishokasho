import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from './firebase'
import type { Attachment } from './types'

export async function uploadAttachment(file: File): Promise<Attachment> {
  const safeName = file.name.replace(/\s+/g, '-')
  const path = `attachments/${Date.now()}-${safeName}`
  const storageRef = ref(storage, path)
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type,
  })
  const url = await getDownloadURL(snapshot.ref)
  const type = file.type.includes('pdf') ? 'pdf' : 'image'
  return { url, type, name: file.name }
}
