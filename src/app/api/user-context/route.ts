import { getUserContext } from '@/lib/impersonation'

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return Response.json({ error: 'Non autorizzato' }, { status: 401 })

  return Response.json({
    userId:  ctx.userId,
    clubId:  ctx.clubId,
    ruolo:   ctx.ruolo,
  })
}
