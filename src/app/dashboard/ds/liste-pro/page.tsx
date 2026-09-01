import { ProOnlyFeature } from '@/components/ProOnlyFeature'
import ListeProfessionisticheView from '@/components/features/ListeProfessionisticheView'

export default function DSListeProPage() {
  return (
    <ProOnlyFeature fallback={
      <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--grigio-3)' }}>
        Le Liste Campionato sono disponibili solo per i club di Serie C e superiori.
      </div>
    }>
      <ListeProfessionisticheView />
    </ProOnlyFeature>
  )
}
