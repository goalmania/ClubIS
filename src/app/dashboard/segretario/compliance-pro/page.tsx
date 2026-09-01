import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/impersonation'
import { ProOnlyFeature } from '@/components/ProOnlyFeature'
import ComplianceProView from '@/components/features/ComplianceProView'

export default async function ComplianceProPage() {
  const ctx = await getUserContext()
  if (!ctx) redirect('/auth/login')
  return (
    <ProOnlyFeature
      fallback={
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--grigio-3)', fontFamily: 'var(--font-display)', fontSize: 14 }}>
          Il modulo Compliance COVISOC è disponibile solo per club Serie C, B e A.
        </div>
      }
    >
      <ComplianceProView />
    </ProOnlyFeature>
  )
}
