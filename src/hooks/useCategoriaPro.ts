'use client'
import { useClubCategoria } from '@/lib/club-context'
import { isPro as isCategoriaPro, isSerieD } from '@/lib/categorie-club'

export function useCategoriaPro() {
  const categoria = useClubCategoria()

  const isPro = isCategoriaPro(categoria)
  const isSemiPro = isSerieD(categoria)
  const isDilettante = !isPro && !isSemiPro

  return { isPro, isSemiPro, isDilettante, categoria }
}
