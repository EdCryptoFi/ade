import type {
  ProjectInput,
  FeatureSuggestion,
  DataRecommendation,
  InfrastructureDecision,
  SecurityDecision,
  TestingDecision,
  MonitoringDecision,
  CostDecision,
  SettingsResult,
} from "./types.ts"

export function recommendFeatures(input: Partial<ProjectInput>): FeatureSuggestion[] {
  const text = `${input.domain ?? ""} ${input.description ?? ""}`.toLowerCase()

  return [
    {
      feature: "Blockchain",
      key: "blockchain",
      recommended: /blockchain|nft|token|wallet|crypto|web3|sui|ethereum|solana|contrato|smart.contract|defi|dex|bridge|stake|mining|mina|onchain|on-chain/i.test(text),
      reason: "Blockchain, tokens, NFTs or smart contracts",
    },
    {
      feature: "Authentication",
      key: "auth",
      recommended: /auth|login|user|usuário|conta|account|perfil|profile|signup|register|logar|entrar|sessão|session|logar|registro/i.test(text),
      reason: "User identity",
    },
    {
      feature: "File Upload",
      key: "upload",
      recommended: /upload|file|image|imagem|foto|photo|documento|document|anexo|attachment|mídia|media|avatar|thumbnail|miniatura|arquivo|dropbox|drive/i.test(text),
      reason: "File or media storage",
    },
    {
      feature: "Realtime",
      key: "realtime",
      recommended: /realtime|tempo.real|live|notificação|notification|chat|mensagem|message|websocket|stream|ao.vivo|colaboração|collaboration|cursor|presença|presence|atualização.live|live.update/i.test(text),
      reason: "Realtime features",
    },
    {
      feature: "Payments",
      key: "payments",
      recommended: /pagamento|payment|pagar|buy|comprar|checkout|cobrança|billing|subscription|plano|plan|stripe|paddle|preço|price|venda|sell|fatura|invoice|transação|transaction|receber|receivable/i.test(text),
      reason: "Financial transactions or subscriptions",
    },
    {
      feature: "Artificial Intelligence",
      key: "ai",
      recommended: /ai|ia|inteligência|inteligencia|llm|gpt|chat|claude|openai|recomendação|recommendation|agente|agent|automation|automação|chatbot|assistente|assistant|copilot|analise|análise|anomalia|anomaly/i.test(text),
      reason: "AI, LLMs or autonomous agents",
    },
    {
      feature: "AI Memory",
      key: "aiMemory",
      recommended: /memória|memory|contexto|context|histórico|history|embedding|vector|vetorial|rag|knowledge.graph|grafo.de.conhecimento|recuperação|retrieval/i.test(text),
      reason: "AI needs persistent memory or RAG",
    },
    {
      feature: "Teams / Collaboration",
      key: "teams",
      recommended: /team|time|colaboração|collaboration|workspace|espaço.de.trabalho|organização|organization|org|empresa|company|membro|member|convidar|invite|multi.usuário|multi-user|compartilhar|share/i.test(text),
      reason: "Multiple users collaborating",
    },
    {
      feature: "Multi-tenant",
      key: "multiTenant",
      recommended: /tenant|multi.tenant|saas|assinante|subscriber|cliente|customer|cada.cliente|cada.usuário|isolamento|isolation|white.label|whitelabel|marca.branca/i.test(text),
      reason: "Data isolation between customers",
    },
    {
      feature: "Public API",
      key: "apiAccess",
      recommended: /api|api.key|api key|integração|integration|webhook|terceiros|third.party|developer|desenvolvedor|rest|graphql|endpoint|sdk|biblioteca|library|plugin/i.test(text),
      reason: "Third-party integration or public API",
    },
    {
      feature: "Webhooks",
      key: "webhooks",
      recommended: /webhook|evento|event|callback|notificação|notification|gatilho|trigger|integração|integration|automação|automation|disparar|fire|payload/i.test(text),
      reason: "Events triggering external actions",
    },
    {
      feature: "SSO / SAML",
      key: "sso",
      recommended: /sso|saml|oidc|login.único|single.sign.on|google.login|github.login|enterprise|empresarial|ldap|active.directory|okta|azure.ad|keycloak|identity.provider|federação|federation/i.test(text),
      reason: "Corporate login or identity federation",
    },
    {
      feature: "Audit Log",
      key: "auditLog",
      recommended: /audit|auditoria|log|rastreamento|tracking|registro|registrar|histórico.de.ações|action.history|compliance|conformidade|trilha|trail|rastro|trace/i.test(text),
      reason: "Action tracking for compliance",
    },
    {
      feature: "Feature Flags",
      key: "featureFlags",
      recommended: /feature.flag|feature flag|lançamento|release|rollout|beta|experimento|experiment|a.b.test|ab test|canary|toggle|alternar|flag|liberação.gradual|gradual.rollout/i.test(text),
      reason: "Gradual feature rollout",
    },
    {
      feature: "Onboarding",
      key: "onboarding",
      recommended: /onboarding|tutorial|wizard|setup|configuração.inicial|initial.setup|primeiros.passos|getting.started|tour|guia|guide|boas.vindas|welcome|introdução|introduction/i.test(text),
      reason: "First-use experience",
    },
    {
      feature: "Notifications",
      key: "notifications",
      recommended: /notificação|notification|email|sms|push|alerta|alert|aviso|warning|lembrete|reminder|newsletter|digest|resumo|in.app|in-app/i.test(text),
      reason: "User communication",
    },
    {
      feature: "Data Export",
      key: "dataExport",
      recommended: /export|exportação|import|importação|csv|pdf|relatório|report|backup|download.dados|data.portability|portabilidade|extrair|extract|migração|migration|planilha|spreadsheet/i.test(text),
      reason: "Portability and reports",
    },
    {
      feature: "Search",
      key: "search",
      recommended: /busca|search|find|pesquisa|procurar|algolia|elasticsearch|meilisearch|typesense|fulltext|full.text|text.search|índice|index|autocomplete|sugestão|suggestion|filtro|filter/i.test(text),
      reason: "Text or full-text search",
    },
    {
      feature: "Background Jobs / Queues",
      key: "backgroundJobs",
      recommended: /fila|queue|job|background|cron|agendamento|scheduling|processamento.assíncrono|async|tarefa|task|workflow|batch|processamento.em.lote|bull|bullmq|temporal|inngest|trigger/i.test(text),
      reason: "Async or scheduled processing",
    },
    {
      feature: "CMS / Content Management",
      key: "cms",
      recommended: /cms|conteúdo|content|blog|blogging|páginas|pages|artigo|article|post|publicação|publishing|headless|cms|sanity|stripe|strapi|contentful|payload/i.test(text),
      reason: "Content management or blog",
    },
  ]
}

export function recommendDataStructures(input: Partial<ProjectInput>): DataRecommendation[] {
  const text = `${input.domain ?? ""} ${input.description ?? ""} ${(input.features ?? []).join(" ")}`.toLowerCase()

  return [
    {
      structure: "array",
      selected: /list|coleção|collection|feed|dashboard|produtos?|products?|histórico|history|grid|table|tabela|resultados|results|logs/i.test(text) || (input.features?.length ?? 0) > 0,
      reason: "Lists and collections are universal",
    },
    {
      structure: "hash-map",
      selected: /usuário|user|wallet|sessão|session|token|config|settings|cache|key.value|busca|lookup|dicionário|dictionary/i.test(text) || !!input.auth,
      reason: "Key lookup needed",
    },
    {
      structure: "graph",
      selected: /relacionamento|relationship|conexão|connection|fluxo|flow|agente|agent|permissão|permission|blockchain|rede|network|social|seguir|follow|recomendação|recommendation|conhecimento|knowledge|grafo/i.test(text) || !!input.blockchain,
      reason: "Relationships and connections between entities",
    },
    {
      structure: "tree",
      selected: /categoria|category|organograma|hierarquia|hierarchy|árvore|tree|menu|navegação|navigation|diretório|directory|subcategoria|subcategory|tag|comentário|comment|thread|reply/i.test(text),
      reason: "Hierarchical data or navigation",
    },
    {
      structure: "stack-queue",
      selected: /undo|redo|histórico|history|pilha|stack|fila|queue|processamento|processing|job|task|webhook|pipeline|rate.limit|scheduling|agendamento|retry|dead.letter/i.test(text),
      reason: "Sequential processing or task queues",
    },
    {
      structure: "set",
      selected: /permissão|permission|tag|unique|único|whitelist|blacklist|filtro|filter|duplicata|duplicate|interseção|intersection|união|union|dedup|role|grupo|group|distinct/i.test(text),
      reason: "Uniqueness guarantee or set operations",
    },
    {
      structure: "heap",
      selected: /prioridade|priority|notificação|notification|timer|agendamento|scheduling|leaderboard|ranking|top|maior|menor|urgente|deadline|priority.queue/i.test(text),
      reason: "Element prioritization",
    },
    {
      structure: "linked-list",
      selected: /playlist|editor|navegação.entre.elementos|blockchain.chain|bloco|fragmentação|sequência|sequencia|encadeada|linked|undo.redo.chain|histórico.navegação/i.test(text),
      reason: "Frequent insertion/removal in the middle of the collection",
    },
    {
      structure: "trie",
      selected: /autocomplete|sugestão|suggestion|busca.texto|text.search|prefixo|prefix|search.suggest|palavra|word|routing|roteamento|url.match|path/i.test(text),
      reason: "Prefix search and autocomplete",
    },
    {
      structure: "bloom-filter",
      selected: /spam|cache|dedup|deduplicação|filtro|filter|membership|existe|exists|fast.lookup|prevenção|prevention|blockchain.light|light.client/i.test(text),
      reason: "Probabilistic membership test (fast)",
    },
    {
      structure: "lru-cache",
      selected: /cache|lru|session|temp|temporary|hot.data|dados.quentes|frequente|frequent|recent|api.rate|rate.limit|thumbnail|miniatura/i.test(text) || (input.users ?? 0) > 10000,
      reason: "Cache of frequently accessed data",
    },
    {
      structure: "segment-tree",
      selected: /range|intervalo|interval|analytics|métrica|metric|agregação|aggregation|sum|soma|média|average|mediana|median|percentil|percentile|kpi|chart|gráfico|histograma|dashboard/i.test(text),
      reason: "Range queries and aggregation",
    },
    {
      structure: "disjoint-set",
      selected: /permissão|permission|grupo|group|clustering|social.graph|rede.social|amigo|friend|conexão|connection|rbac|role|acesso|access|comunidade|community|permissoes|permicoes/i.test(text) || !!input.featureFlags,
      reason: "Grouping and connectivity",
    },
    {
      structure: "circular-buffer",
      selected: /log|logging|stream|evento|event|telemetria|telemetry|sensor|rolling.window|janela.deslizante|buffer|recent|últimos|ultimos|realtime.analytics/i.test(text) || !!input.realtime,
      reason: "Buffers for realtime streaming and logs",
    },
    {
      structure: "merkle-tree",
      selected: /blockchain|nft|integridade|integrity|verificação|verification|prova|proof|merkle|consistência|consistency|snapshot|sync|sincronização|data.verification|file.integrity|versão|version/i.test(text) || !!input.blockchain,
      reason: "Data integrity verification",
    },
    {
      structure: "skip-list",
      selected: /leaderboard|ranking|ordenação|sorting|sorted|score|pontuação|nível|level|game|rank|classe|grade|tier|concorrência|concurrency/i.test(text),
      reason: "Concurrent sorted lists",
    },
  ]
}

export function recommendInfrastructure(input: Partial<ProjectInput>): InfrastructureDecision {
  const hasDashboard = /dashboard|chart|gráfico|graph|analytics|kpi|métrica|metric|admin/i.test(`${input.domain} ${input.description ?? ""}`)
  const isSaaS = input.multiTenant || input.teams || /saas|assinatura|subscription|tenant|billing/i.test(`${input.domain} ${input.description ?? ""}`)

  const searchService = input.search
    ? "Meilisearch / Typesense (self-hosted) or Algolia (SaaS)"
    : "None"

  const jobsService = input.backgroundJobs
    ? "BullMQ + Redis (self-hosted) or Inngest / Trigger.dev (SaaS)"
    : "None"

  const cmsService = input.cms
    ? "Sanity / Strapi (headless CMS)"
    : "None"

  return {
    frontend: hasDashboard ? "Next.js + shadcn/ui" : "Next.js",
    backend: isSaaS ? "Next.js API Routes + tRPC" : "Next.js API Routes",
    database: input.blockchain ? "Supabase PostgreSQL + Own indexer" : "Supabase PostgreSQL",
    storage: input.upload ? "Supabase Storage" : "Supabase Storage (if needed)",
    deploy: "Vercel",
    auth: input.auth ? "Supabase Auth + NextAuth (if SSO)" : "None (public)",
    analytics: "PostHog",
    emails: "Resend",
    blockchain: input.blockchain ? "Sui" : null,
    ai: input.ai ? "OpenAI" : null,
    memory: input.aiMemory ? "Walrus + Vector DB" : null,
    search: searchService,
    backgroundJobs: jobsService,
    cms: cmsService,
    reasoning: {
      frontend: hasDashboard ? "Dashboard with charts → Next.js + shadcn/ui" : "Default stack → Next.js",
      backend: isSaaS ? "Standard SaaS API → Next.js + tRPC" : "Simplified architecture → API Routes",
      database: input.blockchain ? "Blockchain needs indexing → Supabase + Indexer" : "Default database → Supabase PostgreSQL",
      storage: input.upload ? "Upload detected → Supabase Storage" : "Default storage",
      deploy: "Default deploy → Vercel",
      auth: input.sso ? "SSO detected → NextAuth with providers" : input.auth ? "Login needed → Supabase Auth" : "No authentication",
      analytics: "Default analytics → PostHog",
      emails: "Default email → Resend",
      blockchain: input.blockchain ? "Blockchain detected → Sui + Walrus" : "No blockchain",
      ai: input.ai ? "AI detected → OpenAI" : "No AI",
      memory: input.aiMemory ? "AI memory → Walrus + Vector Database" : "No memory needed",
      search: input.search ? `Text search → ${searchService}` : "No text search",
      backgroundJobs: input.backgroundJobs ? `Async jobs → ${jobsService}` : "No background jobs",
      cms: input.cms ? `CMS → ${cmsService}` : "No CMS",
    },
  }
}

export function recommendSecurity(input: Partial<ProjectInput>): SecurityDecision {
  const hasSensitive = !!input.auth || !!input.payments || !!input.upload
  const needsCompliance = !!input.payments || !!input.auditLog || !!input.multiTenant

  return {
    auth: {
      required: !!input.auth,
      method: input.sso ? "NextAuth (OAuth + SAML + OIDC)" : input.auth ? "Supabase Auth / NextAuth / Clerk" : "None",
      reason: input.sso ? "Corporate SSO with external providers" : input.auth ? "User authentication" : "No authentication",
    },
    mfa: {
      required: !!input.payments || !!input.blockchain || !!input.sso,
      reason: input.payments || input.blockchain ? "Financial or blockchain transactions" : input.sso ? "Corporate security" : "Not needed",
    },
    encryption: {
      required: hasSensitive,
      scope: hasSensitive ? "TLS 1.3 (in transit) + AES-256 (at rest) + field encryption for PII" : "TLS 1.3 (default)",
    },
    rateLimit: {
      required: true,
      limit: input.apiAccess ? "100 req/min per IP, 1000 req/min per user, 10000 req/h per API key" : "100 req/min per IP, 1000 req/min per user",
    },
    audit: {
      required: !!input.auditLog || needsCompliance,
      reason: input.auditLog ? "Audit requested" : needsCompliance ? "Compliance requires audit trail" : "Recommended",
    },
    recommendations: [
      ...(input.multiTenant ? ["Implement Row Level Security (RLS) in Supabase for tenant isolation", "Each tenant has its own schema or prefix"] : input.auth ? ["Implement Row Level Security (RLS) in Supabase"] : []),
      ...(input.upload ? ["Sanitize files (type, size, virus scan)", "Use signed URLs for access"] : []),
      ...(input.payments ? ["Never trust the frontend for validation", "Verify webhook signatures", "PCI-DSS compliance"] : []),
      ...(input.blockchain ? ["Audit smart contracts", "Multi-sig wallet for admin"] : []),
      ...(input.apiAccess ? ["API Keys with permission scopes", "Rate limiting per key", "API call logging"] : []),
      ...(input.webhooks ? ["Verify HMAC signature of webhooks", "Retry with backoff + dead letter queue"] : []),
      ...(input.auditLog ? ["Log all admin actions", "Immutable logs (append-only)"] : []),
      ...(input.sso ? ["Validate token issuer (iss)", "Support multiple IdPs"] : []),
      ...(input.search ? ["Protect search endpoint against abuse (rate limit)", "Never expose indexes directly to the client"] : []),
      ...(input.backgroundJobs ? ["Validate job payloads", "Implement retry with exponential backoff + dead letter queue"] : []),
      ...(input.cms ? ["Sanitize HTML of user-generated content", "Protect CMS admin routes"] : []),
      "Validate all inputs with Zod",
      "Configure CORS per origin",
    ],
  }
}

export function recommendTesting(input: Partial<ProjectInput>): TestingDecision {
  const hasIntegrations = input.auth || input.payments || input.blockchain || input.webhooks || input.apiAccess
  const needsLoad = (input.users ?? 0) > 10000 || !!input.realtime || !!input.multiTenant

  return {
    unit: true,
    integration: !!hasIntegrations,
    e2e: true,
    load: needsLoad,
    framework: "Vitest + Playwright",
    recommendations: [
      "Unit tests for all business logic (Vitest)",
      ...(input.auth ? ["Integration tests for the authentication flow"] : []),
      ...(input.multiTenant ? ["Tenant isolation tests"] : []),
      ...(input.payments ? ["Webhook tests in sandbox", "Billing cycle tests"] : []),
      ...(input.blockchain ? ["Contract tests in testnet"] : []),
      ...(input.webhooks ? ["Webhook delivery and retry tests"] : []),
      ...(input.apiAccess ? ["Rate limiting and API key scope tests"] : []),
      ...(input.search ? ["Search relevance tests", "Indexing and sync tests"] : []),
      ...(input.backgroundJobs ? ["Queue tests: chaining, retry, dead letter", "Job concurrency tests"] : []),
      ...(input.cms ? ["Content workflow tests (draft → review → publish)", "Content role permission tests"] : []),
      ...(needsLoad ? ["Load tests with k6"] : []),
      ...(input.auditLog ? ["Audit log integrity tests"] : []),
      "E2E with Playwright for critical flows",
      "Minimum coverage: 80%",
    ],
  }
}

export function recommendMonitoring(input: Partial<ProjectInput>): MonitoringDecision {
  return {
    logs: true,
    metrics: true,
    alerts: true,
    tracing: !!input.blockchain || !!input.realtime || !!input.ai || !!input.multiTenant,
    dashboard: true,
    stack: [
      "PostHog (analytics + session replay)",
      "Sentry (error tracking)",
      "Vercel Analytics (performance)",
      ...(input.search ? ["Search performance monitoring (P50/P95/P99 latency)"] : []),
      ...(input.backgroundJobs ? ["Queue metrics: size, processing rate, failure rate", "Growing queue alert (backlog)"] : []),
      ...(input.cms ? ["Content metrics: publications, versions, average updates"] : []),
      ...(input.blockchain || input.realtime || input.ai || input.multiTenant ? ["OpenTelemetry + Grafana (tracing + metrics)"] : []),
      ...(input.auditLog ? ["Structured logs + SIEM (optional)"] : []),
      ...(input.payments ? ["Payment failure monitoring", "Revenue drop alert"] : []),
      ...(input.multiTenant ? ["Per-tenant metrics", "Alert for tenant with anomalous usage"] : []),
    ],
  }
}

export function recommendCost(input: Partial<ProjectInput>): CostDecision {
  const base = 20
  const items: Record<string, number> = {
    Hosting: 20,
    Database: 25,
  }
  if (input.auth) items.Auth = input.sso ? 50 : 25
  if (input.blockchain) items["Blockchain (RPC + Indexer)"] = 50
  if (input.ai) items["AI API"] = 100
  if (input.aiMemory) items["Vector DB"] = 30
  if (input.payments) items["Payment Fees"] = 30
  if (input.upload) items.Storage = 10
  if (input.realtime) items.Realtime = 20
  if (input.multiTenant) items["Multi-tenant Infra"] = 50
  if (input.apiAccess) items["API Gateway"] = 25
  if (input.webhooks) items["Webhook Infrastructure"] = 15
  if (input.auditLog) items["Audit Log Storage"] = 10
  if (input.notifications) items.Emails = 20
  if (input.search) items["Search Service"] = 30
  if (input.backgroundJobs) items["Background Jobs (Redis + Worker)"] = 25
  if (input.cms) items["Headless CMS"] = 30
  if (input.featureFlags) items["Feature Flags"] = 0
  if ((input.users ?? 0) > 100000) items["Scale (Redis + CDN)"] = 200
  else if ((input.users ?? 0) > 10000) items["Scale (Redis)"] = 100

  const total = Object.values(items).reduce((a, b) => a + b, 0)

  return {
    estimatedMonthly: `$${total}/month (initial estimate)`,
    breakdown: items,
    recommendations: [
      ...(total > 300 ? ["Consider reserved instances to reduce costs"] : []),
      ...(input.ai ? ["Cache AI responses to reduce calls"] : []),
      ...(input.blockchain ? ["Use testnet for development"] : []),
      ...(input.multiTenant && (input.users ?? 0) > 50000 ? ["Consider dedicated infra per enterprise tenant"] : []),
      ...(input.notifications ? ["Batch emails to reduce costs"] : []),
      "Set budget alerts",
      "Review costs monthly",
    ],
  }
}

export function generateSettings(input: Partial<ProjectInput>): SettingsResult {
  return {
    features: recommendFeatures(input),
    dataStructures: recommendDataStructures(input),
    infrastructure: recommendInfrastructure(input),
    security: recommendSecurity(input),
    testing: recommendTesting(input),
    monitoring: recommendMonitoring(input),
    cost: recommendCost(input),
  }
}

export function inputFromSettings(features: FeatureSuggestion[]): Partial<ProjectInput> {
  const result: Partial<ProjectInput> = {}
  for (const f of features) {
    if (f.recommended) {
      (result as Record<string, unknown>)[f.key] = true
    }
  }
  return result
}

export { analyzeAll as analyzeTradeoffs } from "./tradeoffs.ts"
