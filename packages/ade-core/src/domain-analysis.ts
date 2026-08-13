import type { DomainCategory, ProjectInput } from "./types.ts"

const domainPatterns: Record<string, string[]> = {
  marketplace: ["marketplace", "produto", "product", "comprar", "buy", "sell", "vender", "listing", "anúncio", "shop", "loja", "ecommerce", "e-commerce", "carrinho", "cart"],
  dashboard: ["dashboard", "painel", "métrica", "metric", "analytics", "gráfico", "graph", "kpi", "monitor"],
  saas: ["saas", "subscription", "assinatura", "tenant", "multi-tenant", "plano", "plan", "billing", "multitenant"],
  crm: ["crm", "customer", "cliente", "lead", "funil", "funnel", "pipeline", "venda", "sales"],
  "ai-agent": ["agente", "agent", "ia", "llm", "autonomous", "autônomo", "function calling", "chatbot"],
  "landing-page": ["landing", "landing page", "página", "page", "marketing", "lead capture"],
  game: ["game", "jogo", "rpg", "multiplayer", "score", "placar", "leaderboard"],
  "social-network": ["social", "rede", "feed", "post", "seguir", "follow", "like", "comentário", "comment"],
  transportation: ["transporte", "transport", "frete", "freight", "carga", "logística", "logistics", "motorista", "driver", "frota", "fleet", "rotas", "delivery", "entrega", "shipping", "veículo", "vehicle"],
  fintech: ["pagamento", "payment", "fiscal", "nota fiscal", "nfe", "nf-e", "invoice", "contas a receber", "billing", "conciliação", "reconciliação", "recebimento", "receipt", "taxa", "imposto", "tax", "pix", "boleto", "financeiro", "financial", "contabilidade", "bookkeeping", "compliance", "tributário", "tributaria"],
}

// Match whole words (unicode-aware), so short tokens like "ai"/"ia" never
// false-positive inside longer words (e.g. "fiscais", "conciliação").
const TOKEN_RE = (word: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(word)}($|[^\\p{L}\\p{N}])`, "iu")

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function analyzeDomain(input: ProjectInput): DomainCategory {
  const text = `${input.domain} ${input.description} ${input.features.join(" ")}`.toLowerCase()

  let best: DomainCategory = "other"
  let bestScore = 0

  for (const [category, patterns] of Object.entries(domainPatterns)) {
    const score = patterns.reduce((acc, p) => acc + (TOKEN_RE(p).test(text) ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      best = category as DomainCategory
    }
  }

  // Explicit domain hint always wins ties against a weak description match.
  const explicit = domainPatterns["saas"].some((p) => TOKEN_RE(p).test(input.domain ?? ""))
  if (explicit) {
    best = "saas"
  }

  return best
}
