import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'
import { NextResponse } from 'next/server'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

export async function POST(req: Request) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Nessun file allegato' }, { status: 400 })

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Formato non supportato. Usa JPG, PNG, WEBP o SVG' },
      { status: 400 },
    )
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'File troppo grande. Dimensione massima: 2 MB' },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const path = `logos/${ctx.clubId}/logo.${ext}`

  const buffer = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('club-assets')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error('[upload/logo-club]', uploadError.message)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('club-assets')
    .getPublicUrl(path)

  // Aggiorna logo_url nella tabella clubs
  const { error: updateError } = await supabase
    .from('clubs')
    .update({ logo_url: publicUrl })
    .eq('id', ctx.clubId)

  if (updateError) {
    console.error('[upload/logo-club] update clubs:', updateError.message)
    // Non bloccare: l'upload è già avvenuto — la pagina può salvarlo con l'update principale
  }

  return NextResponse.json({ url: publicUrl })
}
