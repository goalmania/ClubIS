import type { ReactNode } from 'react'

// Layout minimale per le pagine di stampa:
// NON renderizza <html>/<head>/<body> perché sono già forniti da app/layout.tsx.
// Aggiunge solo un wrapper che nasconde qualsiasi chrome del dashboard.
export default function PrintLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
