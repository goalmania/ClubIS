'use client'
import dynamic from 'next/dynamic'

// FullCalendar manipola il DOM direttamente e non è SSR-safe: renderizzato lato
// server produce un markup diverso da quello client, causando un mismatch di
// hydration (React error #425/#418/#423). ssr:false lo esclude dal render server,
// niente altro cambia in TeamManagerCalendario.tsx.
const TeamManagerCalendario = dynamic(() => import('./TeamManagerCalendario'), { ssr: false })

export default function CalendarioClientOnly() {
  return <TeamManagerCalendario />
}
