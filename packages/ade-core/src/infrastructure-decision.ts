import type { InfrastructureDecision, ProjectInput } from "./types.ts"

export function decideInfrastructure(input: ProjectInput): InfrastructureDecision {
  const reasoning: Record<string, string> = {}

  const frontend = input.features.some(f => /dashboard|chart|gráfico|admin/i.test(f))
    ? { value: "Next.js + shadcn/ui", reason: "Dashboard com gráficos → Next.js + shadcn/ui" }
    : { value: "Next.js", reason: "Stack padrão → Next.js" }
  reasoning.frontend = frontend.reason

  const backend = "Next.js API Routes"
  reasoning.backend = "Arquitetura simplificada → API Routes do Next.js"

  const database = input.blockchain
    ? { value: "Supabase PostgreSQL + Indexer próprio", reason: "Blockchain precisa de indexação → Supabase + Indexer" }
    : { value: "Supabase PostgreSQL", reason: "Banco padrão → Supabase PostgreSQL" }
  reasoning.database = database.reason

  const storage = input.upload
    ? { value: "Supabase Storage", reason: "Upload detectado → Supabase Storage" }
    : { value: "Supabase Storage (se necessário)", reason: "Storage padrão" }
  reasoning.storage = storage.reason

  const auth = input.auth
    ? { value: "Supabase Auth", reason: "Login necessário → Supabase Auth" }
    : { value: "Nenhum (público)", reason: "Sem autenticação necessária" }
  reasoning.auth = auth.reason

  const analytics = input.features.some(f => /analytics|métrica|metric|evento|event|tracking/i.test(f))
    ? { value: "PostHog", reason: "Analytics + Eventos → PostHog" }
    : { value: "PostHog (opcional)", reason: "Analytics padrão" }
  reasoning.analytics = analytics.reason

  const emails = input.features.some(f => /email|notificação|notification|newsletter/i.test(f))
    ? { value: "Resend", reason: "Emails transacionais → Resend" }
    : { value: "Resend (se necessário)", reason: "Email padrão" }
  reasoning.emails = emails.reason

  const blockchain = input.blockchain
    ? { value: "Sui", reason: "Blockchain detectado → Sui + Walrus" }
    : { value: null, reason: "Sem blockchain" }
  reasoning.blockchain = blockchain.reason

  const ai = input.ai
    ? { value: "OpenAI", reason: "IA detectada → OpenAI" }
    : { value: null, reason: "Sem IA" }
  reasoning.ai = ai.reason

  const memory = input.aiMemory
    ? { value: "Walrus + Vector DB", reason: "Memória para IA → Walrus + Vector Database" }
    : { value: null, reason: "Sem necessidade de memória" }
  reasoning.memory = memory.reason

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
    reasoning,
  }
}
