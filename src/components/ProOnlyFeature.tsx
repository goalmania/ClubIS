'use client'
import { useCategoriaPro } from '@/hooks/useCategoriaPro'

export function ProOnlyFeature({ children, fallback }: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { isPro } = useCategoriaPro()
  if (!isPro) return fallback ? <>{fallback}</> : null
  return <>{children}</>
}
