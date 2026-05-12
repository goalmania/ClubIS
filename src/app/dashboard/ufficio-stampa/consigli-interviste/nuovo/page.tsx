'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NuovoConsiglioRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/ufficio-stampa/consigli-interviste')
  }, [router])
  return null
}
