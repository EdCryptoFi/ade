import type { DevelopmentPlan, DomainCategory, ProjectInput } from "./types.ts"

export function generatePlan(input: ProjectInput, domain: DomainCategory): DevelopmentPlan {
  const sprints = [
    {
      name: "Sprint 1",
      focus: "Infraestrutura",
      tasks: [
        "Configurar monorepo (Turborepo + pnpm)",
        "Configurar Next.js + Tailwind + shadcn/ui",
        "Configurar Supabase (banco + auth + storage)",
        "Configurar Vercel (deploy + preview)",
        input.blockchain ? "Configurar wallet adapter + provider" : null,
      ].filter(Boolean) as string[],
    },
    {
      name: "Sprint 2",
      focus: "Layout e navegação",
      tasks: [
        "Implementar layout base (Header, Sidebar, Footer)",
        "Implementar sistema de navegação",
        "Implementar tema (light/dark)",
        "Implementar componentes de UI compartilhados",
        "Implementar página inicial",
      ],
    },
    {
      name: "Sprint 3",
      focus: input.blockchain ? "Blockchain" : "Funcionalidades core",
      tasks: input.blockchain
        ? ["Implementar conexão com wallet", "Implementar transações", "Implementar leitura de contratos"]
        : ["Implementar CRUD das entidades principais", "Implementar formulários e validação", "Implementar busca e filtros"],
    },
    {
      name: "Sprint 4",
      focus: "Negócio",
      tasks: [
        `Implementar funcionalidades de ${domain}`,
        input.auth ? "Implementar autenticação e autorização" : null,
        input.upload ? "Implementar upload de arquivos" : null,
        input.payments ? "Implementar sistema de pagamentos" : null,
        input.realtime ? "Implementar funcionalidades em tempo real" : null,
      ].filter(Boolean) as string[],
    },
    {
      name: "Sprint 5",
      focus: "IA e finalização",
      tasks: [
        input.ai ? "Integrar com LLM" : null,
        input.aiMemory ? "Implementar memória e banco vetorial" : null,
        "Testes end-to-end",
        "Ajustes de performance e SEO",
        "Deploy final e monitoramento",
      ].filter(Boolean) as string[],
    },
  ]

  return { sprints }
}
