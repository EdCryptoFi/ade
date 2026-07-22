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
    then: ["File Upload Component", "Storage Service", "Image Optimizer"],
  },
  {
    condition: (i) => !!i.realtime,
    then: ["Supabase Realtime", "WebSocket Client", "Live Subscription Manager"],
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
    warnings.push("IA detectada sem memória — considere adicionar banco vetorial para contexto persistente")
  }
  if (input.blockchain && !input.auth) {
    warnings.push("Blockchain detectado sem auth — considere autenticação para associar wallets a usuários")
  }
  if (input.payments && !input.auth) {
    warnings.push("Pagamentos detectados sem auth — usuários precisam de identidade para associar transações")
  }
  if (input.payments && !input.realtime) {
    warnings.push("Pagamentos sem tempo real — webhooks podem atrasar, considere WebSocket para status de pagamento")
  }
  if (input.blockchain && input.users && input.users > 10000) {
    warnings.push("Blockchain + alta escala — considere L2 ou sidechain para reduzir custos de gas")
  }

  return { components, warnings }
}
