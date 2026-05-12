import PresenzeList from '@/components/presenze/PresenzeList'

export default function DSPresenzePage() {
  return <PresenzeList basePath="/dashboard/ds/presenze" soloMie={false} />
}
