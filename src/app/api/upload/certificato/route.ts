import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/impersonation'

const MIME_CONSENTITI = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  const formData = await req.formData()
  const file       = formData.get('file')       as File | null
  const giocatoreId = formData.get('giocatoreId') as string | null

  if (!file || !giocatoreId) {
    return NextResponse.json({ error: 'file e giocatoreId sono obbligatori' }, { status: 400 })
  }

  if (!MIME_CONSENTITI.includes(file.type)) {
    return NextResponse.json(
      { error: 'Formato non supportato. Usa PDF, JPG, PNG o WEBP' },
      { status: 400 },
    )
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'File troppo grande. Massimo 5 MB' },
      { status: 400 },
    )
  }

  const ext       = file.name.split('.').pop() ?? 'bin'
  const timestamp = Date.now()
  const path      = `certificati/${ctx.clubId}/${giocatoreId}/${timestamp}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const supabase = createAdminClient()

  const { error: uploadErr } = await supabase.storage
    .from('club-assets')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  const { data: publicData } = supabase.storage
    .from('club-assets')
    .getPublicUrl(path)

  return NextResponse.json({ url: publicData.publicUrl, path })
}
