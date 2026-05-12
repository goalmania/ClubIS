import PresenzeList from '@/components/presenze/PresenzeList'

export default function SegretarioPresenzePage() {
  return <PresenzeList basePath="/dashboard/segretario/presenze" soloMie={false} />
}
