import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cis.app'
  const url = `${baseUrl}/iscriviti/${encodeURIComponent(slug)}`

  return NextResponse.redirect(
    `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}&format=svg&margin=1`
  )
}
