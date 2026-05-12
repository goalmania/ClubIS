import PresenzeList from '@/components/presenze/PresenzeList'

export default function AllenatorePresenzePage() {
  return (
    <PresenzeList
      basePath="/dashboard/allenatore/presenze"
      nuovoAllenamentoPath="/dashboard/allenatore/allenamenti/nuovo"
      soloMie={true}
    />
  )
}
