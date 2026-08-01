import type { DevelopmentPlan, DomainCategory, ProjectInput } from "./types.ts"

export function generatePlan(input: ProjectInput, domain: DomainCategory): DevelopmentPlan {
  const isSaaS = domain === "saas" || input.multiTenant || input.teams

  const task = (cond: unknown, t: string) => cond ? t : null

  const sprints = [
    {
      name: "Sprint 1",
      focus: "Foundation",
      tasks: [
        "Set up monorepo (Turborepo + pnpm)",
        "Set up Next.js + Tailwind + shadcn/ui",
        "Set up Supabase (database + auth + storage)",
        "Set up Vercel (deploy + preview)",
        task(input.blockchain, "Set up wallet adapter + provider"),
        task(isSaaS, "Set up multi-tenant schema (RLS + tenant_id)"),
        task(input.apiAccess, "Set up API key + rate limiting"),
      ].filter(Boolean) as string[],
    },
    {
      name: "Sprint 2",
      focus: "Layout and Auth",
      tasks: [
        "Implement base layout (Header, Sidebar, Footer)",
        "Implement navigation system",
        "Implement theme (light/dark)",
        "Implement shared UI components",
        "Implement authentication (login, register, reset)",
        task(input.sso, "Implement SSO (Google, GitHub, SAML)"),
        task(input.onboarding, "Implement onboarding wizard"),
      ].filter(Boolean) as string[],
    },
    {
      name: "Sprint 3",
      focus: isSaaS ? "Core SaaS" : (input.blockchain ? "Blockchain" : "Core Features"),
      tasks: isSaaS ? [
        "Implement main dashboard",
        "Implement workspace management",
        "Implement invites and roles (RBAC)",
        "Implement billing and plans",
        "Implement payments portal",
        "Implement settings page",
      ].filter(Boolean) : input.blockchain ? [
        "Implement wallet connection",
        "Implement transactions",
        "Implement contract reading",
      ].filter(Boolean) : [
        "Implement CRUD of main entities",
        "Implement forms and validation",
        "Implement search and filters",
      ].filter(Boolean),
    },
    {
      name: "Sprint 4",
      focus: "Advanced Features",
      tasks: [
        task(input.payments, "Implement payment system with webhooks"),
        task(input.realtime, "Implement realtime features (WebSocket)"),
        task(input.upload, "Implement file upload and processing"),
        task(input.ai, "Integrate with LLM"),
        task(input.aiMemory, "Implement memory and vector database"),
        task(input.teams, "Implement team management and collaboration"),
        task(input.webhooks, "Implement webhook system with retry"),
        task(input.apiAccess, "Implement public API with docs"),
        task(input.featureFlags, "Implement feature flag system"),
        task(input.auditLog, "Implement audit logging"),
        task(input.notifications, "Implement notifications center"),
        task(input.dataExport, "Implement data export/import"),
      ].filter(Boolean) as string[],
    },
    {
      name: "Sprint 5",
      focus: "Finishing and Scale",
      tasks: [
        "End-to-end tests",
        "Performance and load tests",
        "Performance and SEO tweaks",
        "API and architecture documentation",
        "Final deploy and monitoring",
        "Set up alerts and dashboards",
      ].filter(Boolean) as string[],
    },
  ]

  return { sprints }
}
