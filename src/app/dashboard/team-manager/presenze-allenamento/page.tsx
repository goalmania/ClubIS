import PresenzeList from '@/components/presenze/PresenzeList'

export default function TMPresenzeAllenamentoPage() {
  return (
    <div data-onboarding="section-presenze">
      <PresenzeList basePath="/dashboard/team-manager/presenze-allenamento" soloMie={false} />
    </div>
  )
}
