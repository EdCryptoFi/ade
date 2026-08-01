import type { InfrastructureDecision, ProjectInput } from "./types.ts"

export function decideInfrastructure(input: ProjectInput): InfrastructureDecision {
  const reasoning: Record<string, string> = {}

  const frontend = input.features.some(f => /dashboard|chart|gráfico|admin/i.test(f))
    ? { value: "Next.js + shadcn/ui", reason: "Dashboard with charts → Next.js + shadcn/ui" }
    : { value: "Next.js", reason: "Default stack → Next.js" }
  reasoning.frontend = frontend.reason

  const backend = "Next.js API Routes"
  reasoning.backend = "Simplified architecture → Next.js API Routes"

  const database = input.blockchain
    ? { value: "Supabase PostgreSQL + Own indexer", reason: "Blockchain needs indexing → Supabase + Indexer" }
    : { value: "Supabase PostgreSQL", reason: "Default database → Supabase PostgreSQL" }
  reasoning.database = database.reason

  const storage = input.upload
    ? { value: "Supabase Storage", reason: "Upload detected → Supabase Storage" }
    : { value: "Supabase Storage (if needed)", reason: "Default storage" }
  reasoning.storage = storage.reason

  const auth = input.auth
    ? { value: "Supabase Auth", reason: "Login needed → Supabase Auth" }
    : { value: "None (public)", reason: "No authentication needed" }
  reasoning.auth = auth.reason

  const analytics = input.features.some(f => /analytics|métrica|metric|evento|event|tracking/i.test(f))
    ? { value: "PostHog", reason: "Analytics + Events → PostHog" }
    : { value: "PostHog (optional)", reason: "Default analytics" }
  reasoning.analytics = analytics.reason

  const emails = input.features.some(f => /email|notificação|notification|newsletter/i.test(f))
    ? { value: "Resend", reason: "Transactional emails → Resend" }
    : { value: "Resend (if needed)", reason: "Default email" }
  reasoning.emails = emails.reason

  const blockchain = input.blockchain
    ? { value: "Sui", reason: "Blockchain detected → Sui + Walrus" }
    : { value: null, reason: "No blockchain" }
  reasoning.blockchain = blockchain.reason

  const ai = input.ai
    ? { value: "OpenAI", reason: "AI detected → OpenAI" }
    : { value: null, reason: "No AI" }
  reasoning.ai = ai.reason

  const memory = input.aiMemory
    ? { value: "Walrus + Vector DB", reason: "AI memory → Walrus + Vector Database" }
    : { value: null, reason: "No memory needed" }
  reasoning.memory = memory.reason

  const search = input.search
    ? { value: "Meilisearch / Typesense (self-hosted) or Algolia (SaaS)", reason: "Text search → Meilisearch / Typesense / Algolia" }
    : { value: "None", reason: "No text search" }
  reasoning.search = search.reason

  const backgroundJobs = input.backgroundJobs
    ? { value: "BullMQ + Redis (self-hosted) or Inngest / Trigger.dev (SaaS)", reason: "Async jobs → BullMQ + Redis / Inngest" }
    : { value: "None", reason: "No background jobs" }
  reasoning.backgroundJobs = backgroundJobs.reason

  const cms = input.cms
    ? { value: "Sanity / Strapi (headless CMS)", reason: "Content management → Sanity / Strapi" }
    : { value: "None", reason: "No CMS" }
  reasoning.cms = cms.reason

  return {
    frontend: frontend.value,
    backend,
    database: database.value,
    storage: storage.value,
    deploy: "Vercel",
    auth: auth.value,
    analytics: analytics.value,
    emails: emails.value,
    blockchain: blockchain.value,
    ai: ai.value,
    memory: memory.value,
    search: search.value,
    backgroundJobs: backgroundJobs.value,
    cms: cms.value,
    reasoning,
  }
}
