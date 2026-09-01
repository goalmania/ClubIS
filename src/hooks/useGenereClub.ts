'use client'
import { useClubGenere } from '@/lib/club-context'
import { isFemminile as isGenereFemminile } from '@/lib/categorie-club'

export function useGenereClub() {
  const genere = useClubGenere()

  return { genere, isFemminile: isGenereFemminile(genere) }
}
