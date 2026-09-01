import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/impersonation'
import { ProOnlyFeature } from '@/components/ProOnlyFeature'
import ContrattiProView from '@/components/features/ContrattiProView'

export default async function DsContrattiProPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  if (ctx.ruolo === 'presidente') redirect('/dashboard/presidente')
  return (
    <ProOnlyFeature
      fallback={
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--grigio-3)', fontFamily: 'var(--font-display)', fontSize: 14 }}>
          I contratti professionisti sono disponibili solo per club Serie C, B e A.
        </div>
      }
    >
      <ContrattiProView clubId={ctx.clubId} ruolo={ctx.ruolo} />
    </ProOnlyFeature>
  )
}
