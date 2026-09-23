import { supabase, PHOTO_BUCKET } from './supabase'

const MAX_EDGE = 1600

// Shrink phone photos before upload so they load fast and stay under the 5MB limit
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read that photo'))), 'image/jpeg', 0.85),
  )
}

export async function uploadPhoto(file: File): Promise<string> {
  const blob = await compress(file)
  const path = `${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return path
}

const cache = new Map<string, { url: string; expires: number }>()
const TTL = 60 * 60

export async function signPhotos(paths: string[]): Promise<Record<string, string>> {
  const now = Date.now()
  const missing = [...new Set(paths)].filter((p) => (cache.get(p)?.expires ?? 0) < now + 60_000)
  if (missing.length) {
    const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(missing, TTL)
    for (const row of data ?? []) {
      if (row.signedUrl && row.path) cache.set(row.path, { url: row.signedUrl, expires: now + TTL * 1000 })
    }
  }
  return Object.fromEntries(paths.filter((p) => cache.has(p)).map((p) => [p, cache.get(p)!.url]))
}
