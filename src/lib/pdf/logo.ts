import { createAdminClient } from '@/lib/supabase/admin'

const IMG_STYLE = (size: number) =>
  `width:${size}px;height:${size}px;object-fit:contain;margin-right:14px;flex-shrink:0`

export async function fetchLogoHtml(
  logoUrl: string | null | undefined,
  size = 52,
): Promise<string> {
  if (!logoUrl) return ''

  // Try Supabase admin storage download (works for both public and private buckets)
  const supabaseMatch = logoUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/?]+)\/(.+?)(?:\?|$)/)
  if (supabaseMatch) {
    try {
      const bucket = supabaseMatch[1]
      const path = decodeURIComponent(supabaseMatch[2])
      const admin = createAdminClient()
      const { data, error } = await admin.storage.from(bucket).download(path)
      if (!error && data) {
        const buffer = await data.arrayBuffer()
        const mime = (data.type || 'image/png').split(';')[0].trim()
        const base64 = Buffer.from(buffer).toString('base64')
        return `<img src="data:${mime};base64,${base64}" alt="Logo" style="${IMG_STYLE(size)}"/>`
      }
    } catch {
      // fall through to next attempt
    }
  }

  // Fallback: plain fetch (public URL)
  try {
    const res = await fetch(logoUrl, { cache: 'no-store' })
    if (res.ok) {
      const buffer = await res.arrayBuffer()
      const mime = (res.headers.get('content-type') ?? 'image/png').split(';')[0].trim()
      const base64 = Buffer.from(buffer).toString('base64')
      return `<img src="data:${mime};base64,${base64}" alt="Logo" style="${IMG_STYLE(size)}"/>`
    }
  } catch {
    // fall through
  }

  // Last resort: raw URL — browser loads it with session cookies; window.onload waits before print
  return `<img src="${logoUrl}" alt="Logo" style="${IMG_STYLE(size)}"/>`
}
