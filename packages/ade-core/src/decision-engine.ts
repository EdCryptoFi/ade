import type { DecisionRule, ProjectInput } from "./types.ts"

const rules: DecisionRule[] = [
  {
    condition: (i) => !!i.blockchain,
    then: ["Wallet", "RPC Provider", "Indexer", "Transaction Builder", "Signer"],
  },
  {
    condition: (i) => !!i.auth,
    then: ["Auth Provider", "Login Form", "Protected Routes", "Session Manager"],
  },
  {
    condition: (i) => !!i.upload,
    then: ["File Upload Component", "Storage Service", "Image Optimizer", "Virus Scanner"],
  },
  {
    condition: (i) => !!i.realtime,
    then: ["Supabase Realtime", "WebSocket Client", "Live Subscription Manager", "Presence Service"],
  },
  {
    condition: (i) => !!(i.ai && i.aiMemory),
    then: ["Vector Database", "Embeddings Service", "Memory Store", "Graph-based Context"],
  },
  {
    condition: (i) => (i.users ?? 0) > 100000,
    then: ["Redis Cache", "CDN", "Queue System", "Read Replicas"],
  },
  {
    condition: (i) => !!i.payments,
    then: ["Payment Gateway (Stripe/Paddle)", "Webhook Handler", "Subscription Manager", "Invoice Generator", "Reconciliation Service"],
  },
  {
    condition: (i) => !!i.payments && (i.users ?? 0) > 10000,
    then: ["Fraud Detection", "Multi-gateway Fallback"],
  },
  {
    condition: (i) => !!i.blockchain && !!i.payments,
    then: ["On-chain Payment Processor", "Fiat-to-Crypto Bridge"],
  },
  {
    condition: (i) => !!i.teams || !!i.multiTenant,
    then: ["Workspace Switcher", "Role Manager (RBAC)", "Invite System", "Team Dashboard"],
  },
  {
    condition: (i) => !!i.multiTenant,
    then: ["Tenant Isolation Layer", "Tenant Admin Panel", "Per-tenant Analytics", "Branding Config"],
  },
  {
    condition: (i) => !!i.apiAccess,
    then: ["API Key Manager", "Rate Limiter", "API Docs (OpenAPI)", "Developer Portal"],
  },
  {
    condition: (i) => !!i.webhooks,
    then: ["Webhook Dispatcher", "Signature Verifier", "Retry Queue", "Delivery Log"],
  },
  {
    condition: (i) => !!i.sso,
    then: ["SSO Provider Adapter", "SAML/OIDC Config", "Identity Provider Manager"],
  },
  {
    condition: (i) => !!i.auditLog,
    then: ["Audit Trail Service", "Immutable Log Store", "Compliance Reporter"],
  },
  {
    condition: (i) => !!i.featureFlags,
    then: ["Feature Flag Evaluator", "Admin Toggle UI", "Gradual Rollout Engine"],
  },
  {
    condition: (i) => !!i.onboarding,
    then: ["Onboarding Wizard", "Setup Progress Tracker", "Welcome Checklist"],
  },
  {
    condition: (i) => !!i.notifications,
    then: ["Notification Service", "Email Template Engine", "In-app Center", "Push Provider"],
  },
  {
    condition: (i) => !!i.dataExport,
    then: ["Data Export Engine", "Import Parser", "CSV/PDF Generator"],
  },
]

export interface EngineResult {
  components: string[]
  warnings: string[]
}

export function runDecisionEngine(input: ProjectInput): EngineResult {
  const components: string[] = []
  const warnings: string[] = []

  for (const rule of rules) {
    if (rule.condition(input)) {
      const items = Array.isArray(rule.then) ? rule.then : [rule.then]
      components.push(...items)
    }
  }

  if (input.ai && !input.aiMemory) {
    warnings.push("IA sem memória — considere banco vetorial para contexto persistente (RAG)")
  }
  if (input.blockchain && !input.auth) {
    warnings.push("Blockchain sem auth — associe wallets a usuários")
  }
  if (input.payments && !input.auth) {
    warnings.push("Pagamentos sem auth — usuários precisam de identidade")
  }
  if (input.payments && !input.realtime) {
    warnings.push("Pagamentos sem tempo real — considere WebSocket para status ao vivo")
  }
  if (input.blockchain && input.users && input.users > 10000) {
    warnings.push("Blockchain + alta escala — considere L2 ou sidechain para reduzir gas")
  }
  if (input.multiTenant && !input.teams) {
    warnings.push("Multi-tenant sem teams — times são necessários para gerenciar tenants")
  }
  if (input.apiAccess && !input.auth) {
    warnings.push("API pública sem auth — API keys são essenciais")
  }
  if (input.webhooks && !input.realtime) {
    warnings.push("Webhooks sem tempo real — considere WebSocket para baixa latência")
  }
  if (input.sso && !input.auth) {
    warnings.push("SSO sem auth base — configure auth primária primeiro")
  }
  if (input.notifications && !input.auth) {
    warnings.push("Notificações sem auth — usuários precisam estar identificados")
  }
  if (input.dataExport && !input.auth) {
    warnings.push("Exportação de dados sem auth — risco de vazamento")
  }

  return { components, warnings }
}
