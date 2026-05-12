'use client'
import { useParams } from 'next/navigation'
import PresenzeSessioneDetail from '@/components/presenze/PresenzeSessioneDetail'

export default function AllenatorePresenzeSessionePage() {
  const { sessioneId } = useParams<{ sessioneId: string }>()
  return <PresenzeSessioneDetail sessioneId={sessioneId} />
}
