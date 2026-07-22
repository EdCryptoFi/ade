import "./globals.css"
import type { ReactNode } from "react"

export const metadata = {
  title: "ADE — Architecture Decision Engine",
  description: "Camada de arquitetura para Vibe Coding. Decisões arquiteturais antes da implementação.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-zinc-950 text-zinc-100 antialiased">{children}</body>
    </html>
  )
}
