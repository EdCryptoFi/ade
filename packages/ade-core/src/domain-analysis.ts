import type { DomainCategory, ProjectInput } from "./types.ts"

const domainPatterns: Record<string, string[]> = {
  marketplace: ["marketplace", "produto", "product", "comprar", "buy", "sell", "vender", "listing", "anúncio", "shop", "loja"],
  dashboard: ["dashboard", "painel", "métrica", "metric", "analytics", "gráfico", "chart", "kpi", "monitor"],
  saas: ["saas", "subscription", "assinatura", "tenant", "multi-tenant", "plano", "plan"],
  crm: ["crm", "customer", "cliente", "lead", "funil", "funnel", "pipeline", "venda", "sales"],
  "ai-agent": ["agente", "agent", "ai", "ia", "llm", "autonomous", "autônomo", "tool", "function calling"],
  "landing-page": ["landing", "landing page", "página", "page", "marketing", "lead capture"],
  game: ["game", "jogo", "rpg", "multiplayer", "score", "placar", "leaderboard"],
  "social-network": ["social", "rede", "feed", "post", "seguir", "follow", "like", "comentário", "comment"],
}

export function analyzeDomain(input: ProjectInput): DomainCategory {
  const text = `${input.domain} ${input.description} ${input.features.join(" ")}`.toLowerCase()

  let best: DomainCategory = "other"
  let bestScore = 0

  for (const [category, patterns] of Object.entries(domainPatterns)) {
    const score = patterns.reduce((acc, p) => acc + (text.includes(p) ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      best = category as DomainCategory
    }
  }

  return best
}
