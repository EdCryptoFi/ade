import type { DevelopmentPlan, DomainCategory, ProjectInput } from "./types.ts"

export function generatePlan(input: ProjectInput, domain: DomainCategory): DevelopmentPlan {
  const isSaaS = domain === "saas" || input.multiTenant || input.teams

  const task = (cond: unknown, t: string) => cond ? t : null

  const sprints = [
    {
      name: "Sprint 1",
      focus: "Fundação",
      tasks: [
        "Configurar monorepo (Turborepo + pnpm)",
        "Configurar Next.js + Tailwind + shadcn/ui",
        "Configurar Supabase (banco + auth + storage)",
        "Configurar Vercel (deploy + preview)",
        task(input.blockchain, "Configurar wallet adapter + provider"),
        task(isSaaS, "Configurar schema multi-tenant (RLS + tenant_id)"),
        task(input.apiAccess, "Configurar API key + rate limiting"),
      ].filter(Boolean) as string[],
    },
    {
      name: "Sprint 2",
      focus: "Layout e Auth",
      tasks: [
        "Implementar layout base (Header, Sidebar, Footer)",
        "Implementar sistema de navegação",
        "Implementar tema (light/dark)",
        "Implementar componentes de UI compartilhados",
        "Implementar autenticação (login, registro, reset)",
        task(input.sso, "Implementar SSO (Google, GitHub, SAML)"),
        task(input.onboarding, "Implementar wizard de onboarding"),
      ].filter(Boolean) as string[],
    },
    {
      name: "Sprint 3",
      focus: isSaaS ? "Core SaaS" : (input.blockchain ? "Blockchain" : "Funcionalidades Core"),
      tasks: isSaaS ? [
        "Implementar dashboard principal",
        "Implementar gerenciamento de workspace",
        "Implementar convites e roles (RBAC)",
        "Implementar billing e planos",
        "Implementar portal de pagamentos",
        "Implementar página de configurações",
      ].filter(Boolean) : input.blockchain ? [
        "Implementar conexão com wallet",
        "Implementar transações",
        "Implementar leitura de contratos",
      ].filter(Boolean) : [
        "Implementar CRUD das entidades principais",
        "Implementar formulários e validação",
        "Implementar busca e filtros",
      ].filter(Boolean),
    },
    {
      name: "Sprint 4",
      focus: "Funcionalidades Avançadas",
      tasks: [
        task(input.payments, "Implementar sistema de pagamentos com webhooks"),
        task(input.realtime, "Implementar funcionalidades em tempo real (WebSocket)"),
        task(input.upload, "Implementar upload e processamento de arquivos"),
        task(input.ai, "Integrar com LLM"),
        task(input.aiMemory, "Implementar memória e banco vetorial"),
        task(input.teams, "Implementar gestão de times e colaboração"),
        task(input.webhooks, "Implementar sistema de webhooks com retry"),
        task(input.apiAccess, "Implementar API pública com docs"),
        task(input.featureFlags, "Implementar sistema de feature flags"),
        task(input.auditLog, "Implementar audit logging"),
        task(input.notifications, "Implementar central de notificações"),
        task(input.dataExport, "Implementar exportação/importação de dados"),
      ].filter(Boolean) as string[],
    },
    {
      name: "Sprint 5",
      focus: "Finalização e Escala",
      tasks: [
        "Testes end-to-end",
        "Testes de performance e carga",
        "Ajustes de performance e SEO",
        "Documentação da API e arquitetura",
        "Deploy final e monitoramento",
        "Configurar alertas e dashboards",
      ].filter(Boolean) as string[],
    },
  ]

  return { sprints }
}
