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
      reason: "Blockchain, tokens, NFTs ou smart contracts",
    },
    {
      feature: "Autenticação",
      key: "auth",
      recommended: /auth|login|user|usuário|conta|account|perfil|profile|signup|register|logar|entrar|sessão|session|logar|registro/i.test(text),
      reason: "Identidade de usuário",
    },
    {
      feature: "Upload de Arquivos",
      key: "upload",
      recommended: /upload|file|image|imagem|foto|photo|documento|document|anexo|attachment|mídia|media|avatar|thumbnail|miniatura|arquivo|dropbox|drive/i.test(text),
      reason: "Armazenamento de arquivos ou mídia",
    },
    {
      feature: "Tempo Real",
      key: "realtime",
      recommended: /realtime|tempo.real|live|notificação|notification|chat|mensagem|message|websocket|stream|ao.vivo|colaboração|collaboration|cursor|presença|presence|atualização.live|live.update/i.test(text),
      reason: "Funcionalidades em tempo real",
    },
    {
      feature: "Pagamentos",
      key: "payments",
      recommended: /pagamento|payment|pagar|buy|comprar|checkout|cobrança|billing|subscription|plano|plan|stripe|paddle|preço|price|venda|sell|fatura|invoice|transação|transaction|receber|receivable/i.test(text),
      reason: "Transações financeiras ou assinaturas",
    },
    {
      feature: "Inteligência Artificial",
      key: "ai",
      recommended: /ai|ia|inteligência|inteligencia|llm|gpt|chat|claude|openai|recomendação|recommendation|agente|agent|automation|automação|chatbot|assistente|assistant|copilot|analise|análise|anomalia|anomaly/i.test(text),
      reason: "IA, LLMs ou agentes autônomos",
    },
    {
      feature: "Memória para IA",
      key: "aiMemory",
      recommended: /memória|memory|contexto|context|histórico|history|embedding|vector|vetorial|rag|knowledge.graph|grafo.de.conhecimento|recuperação|retrieval/i.test(text),
      reason: "IA precisa de memória persistente ou RAG",
    },
    {
      feature: "Times / Colaboração",
      key: "teams",
      recommended: /team|time|colaboração|collaboration|workspace|espaço.de.trabalho|organização|organization|org|empresa|company|membro|member|convidar|invite|multi.usuário|multi-user|compartilhar|share/i.test(text),
      reason: "Múltiplos usuários colaborando",
    },
    {
      feature: "Multi-tenant",
      key: "multiTenant",
      recommended: /tenant|multi.tenant|saas|assinante|subscriber|cliente|customer|cada.cliente|cada.usuário|isolamento|isolation|white.label|whitelabel|marca.branca/i.test(text),
      reason: "Isolamento de dados entre clientes",
    },
    {
      feature: "API pública",
      key: "apiAccess",
      recommended: /api|api.key|api key|integração|integration|webhook|terceiros|third.party|developer|desenvolvedor|rest|graphql|endpoint|sdk|biblioteca|library|plugin/i.test(text),
      reason: "Integração com terceiros ou API pública",
    },
    {
      feature: "Webhooks",
      key: "webhooks",
      recommended: /webhook|evento|event|callback|notificação|notification|gatilho|trigger|integração|integration|automação|automation|disparar|fire|payload/i.test(text),
      reason: "Eventos disparando ações externas",
    },
    {
      feature: "SSO / SAML",
      key: "sso",
      recommended: /sso|saml|oidc|login.único|single.sign.on|google.login|github.login|enterprise|empresarial|ldap|active.directory|okta|azure.ad|keycloak|identity.provider|federação|federation/i.test(text),
      reason: "Login corporativo ou federação de identidade",
    },
    {
      feature: "Audit Log",
      key: "auditLog",
      recommended: /audit|auditoria|log|rastreamento|tracking|registro|registrar|histórico.de.ações|action.history|compliance|conformidade|trilha|trail|rastro|trace/i.test(text),
      reason: "Rastreamento de ações para compliance",
    },
    {
      feature: "Feature Flags",
      key: "featureFlags",
      recommended: /feature.flag|feature flag|lançamento|release|rollout|beta|experimento|experiment|a.b.test|ab test|canary|toggle|alternar|flag|liberação.gradual|gradual.rollout/i.test(text),
      reason: "Liberação gradual de funcionalidades",
    },
    {
      feature: "Onboarding",
      key: "onboarding",
      recommended: /onboarding|tutorial|wizard|setup|configuração.inicial|initial.setup|primeiros.passos|getting.started|tour|guia|guide|boas.vindas|welcome|introdução|introduction/i.test(text),
      reason: "Experiência de primeiro uso",
    },
    {
      feature: "Notificações",
      key: "notifications",
      recommended: /notificação|notification|email|sms|push|alerta|alert|aviso|warning|lembrete|reminder|newsletter|digest|resumo|in.app|in-app/i.test(text),
      reason: "Comunicação com usuários",
    },
    {
      feature: "Exportação de Dados",
      key: "dataExport",
      recommended: /export|exportação|import|importação|csv|pdf|relatório|report|backup|download.dados|data.portability|portabilidade|extrair|extract|migração|migration|planilha|spreadsheet/i.test(text),
      reason: "Portabilidade e relatórios",
    },
  ]
}

export function recommendDataStructures(input: Partial<ProjectInput>): DataRecommendation[] {
  const text = `${input.domain ?? ""} ${input.description ?? ""} ${(input.features ?? []).join(" ")}`.toLowerCase()

  return [
    {
      structure: "array",
      selected: /list|coleção|collection|feed|dashboard|produtos?|products?|histórico|history|grid|table|tabela|resultados|results|logs/i.test(text) || (input.features?.length ?? 0) > 0,
      reason: "Listas e coleções são universais",
    },
    {
      structure: "hash-map",
      selected: /usuário|user|wallet|sessão|session|token|config|settings|cache|key.value|busca|lookup|dicionário|dictionary/i.test(text) || !!input.auth,
      reason: "Busca por chave necessária",
    },
    {
      structure: "graph",
      selected: /relacionamento|relationship|conexão|connection|fluxo|flow|agente|agent|permissão|permission|blockchain|rede|network|social|seguir|follow|recomendação|recommendation|conhecimento|knowledge|grafo/i.test(text) || !!input.blockchain,
      reason: "Relacionamentos e conexões entre entidades",
    },
    {
      structure: "tree",
      selected: /categoria|category|organograma|hierarquia|hierarchy|árvore|tree|menu|navegação|navigation|diretório|directory|subcategoria|subcategory|tag|comentário|comment|thread|reply/i.test(text),
      reason: "Dados hierárquicos ou navegação",
    },
    {
      structure: "stack-queue",
      selected: /undo|redo|histórico|history|pilha|stack|fila|queue|processamento|processing|job|task|webhook|pipeline|rate.limit|scheduling|agendamento|retry|dead.letter/i.test(text),
      reason: "Processamento sequencial ou filas de tarefas",
    },
    {
      structure: "set",
      selected: /permissão|permission|tag|unique|único|whitelist|blacklist|filtro|filter|duplicata|duplicate|interseção|intersection|união|union|dedup|role|grupo|group|distinct/i.test(text),
      reason: "Garantia de unicidade ou operações de conjunto",
    },
    {
      structure: "heap",
      selected: /prioridade|priority|notificação|notification|timer|agendamento|scheduling|leaderboard|ranking|top|maior|menor|urgente|deadline|priority.queue/i.test(text),
      reason: "Priorização de elementos",
    },
    {
      structure: "linked-list",
      selected: /playlist|editor|navegação.entre.elementos|blockchain.chain|bloco|fragmentação|sequência|sequencia|encadeada|linked|undo.redo.chain|histórico.navegação/i.test(text),
      reason: "Inserção/remoção frequente no meio da coleção",
    },
    {
      structure: "trie",
      selected: /autocomplete|sugestão|suggestion|busca.texto|text.search|prefixo|prefix|search.suggest|palavra|word|routing|roteamento|url.match|path/i.test(text),
      reason: "Busca por prefixo e autocomplete",
    },
    {
      structure: "bloom-filter",
      selected: /spam|cache|dedup|deduplicação|filtro|filter|membership|existe|exists|fast.lookup|prevenção|prevention|blockchain.light|light.client/i.test(text),
      reason: "Membership test probabilístico (rápido)",
    },
    {
      structure: "lru-cache",
      selected: /cache|lru|session|temp|temporary|hot.data|dados.quentes|frequente|frequent|recent|api.rate|rate.limit|thumbnail|miniatura/i.test(text) || (input.users ?? 0) > 10000,
      reason: "Cache de dados frequentemente acessados",
    },
    {
      structure: "segment-tree",
      selected: /range|intervalo|interval|analytics|métrica|metric|agregação|aggregation|sum|soma|média|average|mediana|median|percentil|percentile|kpi|chart|gráfico|histograma|dashboard/i.test(text),
      reason: "Consultas de range e agregação",
    },
    {
      structure: "disjoint-set",
      selected: /permissão|permission|grupo|group|clustering|social.graph|rede.social|amigo|friend|conexão|connection|rbac|role|acesso|access|comunidade|community|permissoes|permicoes/i.test(text) || !!input.featureFlags,
      reason: "Agrupamento e conectividade",
    },
    {
      structure: "circular-buffer",
      selected: /log|logging|stream|evento|event|telemetria|telemetry|sensor|rolling.window|janela.deslizante|buffer|recent|últimos|ultimos|realtime.analytics/i.test(text) || !!input.realtime,
      reason: "Buffers para streaming e logs em tempo real",
    },
    {
      structure: "merkle-tree",
      selected: /blockchain|nft|integridade|integrity|verificação|verification|prova|proof|merkle|consistência|consistency|snapshot|sync|sincronização|data.verification|file.integrity|versão|version/i.test(text) || !!input.blockchain,
      reason: "Verificação de integridade de dados",
    },
    {
      structure: "skip-list",
      selected: /leaderboard|ranking|ordenação|sorting|sorted|score|pontuação|nível|level|game|rank|classe|grade|tier|concorrência|concurrency/i.test(text),
      reason: "Listas ordenadas concorrentes",
    },
  ]
}

export function recommendInfrastructure(input: Partial<ProjectInput>): InfrastructureDecision {
  const hasDashboard = /dashboard|chart|gráfico|graph|analytics|kpi|métrica|metric|admin/i.test(`${input.domain} ${input.description ?? ""}`)
  const isSaaS = input.multiTenant || input.teams || /saas|assinatura|subscription|tenant|billing/i.test(`${input.domain} ${input.description ?? ""}`)

  return {
    frontend: hasDashboard ? "Next.js + shadcn/ui" : "Next.js",
    backend: isSaaS ? "Next.js API Routes + tRPC" : "Next.js API Routes",
    database: input.blockchain ? "Supabase PostgreSQL + Indexer próprio" : "Supabase PostgreSQL",
    storage: input.upload ? "Supabase Storage" : "Supabase Storage (se necessário)",
    deploy: "Vercel",
    auth: input.auth ? "Supabase Auth + NextAuth (se SSO)" : "Nenhum (público)",
    analytics: "PostHog",
    emails: "Resend",
    blockchain: input.blockchain ? "Sui" : null,
    ai: input.ai ? "OpenAI" : null,
    memory: input.aiMemory ? "Walrus + Vector DB" : null,
    reasoning: {
      frontend: hasDashboard ? "Dashboard com gráficos → Next.js + shadcn/ui" : "Stack padrão → Next.js",
      backend: isSaaS ? "API padrão SaaS → Next.js + tRPC" : "Arquitetura simplificada → API Routes",
      database: input.blockchain ? "Blockchain precisa de indexação → Supabase + Indexer" : "Banco padrão → Supabase PostgreSQL",
      storage: input.upload ? "Upload detectado → Supabase Storage" : "Storage padrão",
      deploy: "Deploy padrão → Vercel",
      auth: input.sso ? "SSO detectado → NextAuth com providers" : input.auth ? "Login necessário → Supabase Auth" : "Sem autenticação",
      analytics: "Analytics padrão → PostHog",
      emails: "Email padrão → Resend",
      blockchain: input.blockchain ? "Blockchain detectado → Sui + Walrus" : "Sem blockchain",
      ai: input.ai ? "IA detectada → OpenAI" : "Sem IA",
      memory: input.aiMemory ? "Memória para IA → Walrus + Vector Database" : "Sem necessidade de memória",
    },
  }
}

export function recommendSecurity(input: Partial<ProjectInput>): SecurityDecision {
  const hasSensitive = !!input.auth || !!input.payments || !!input.upload
  const needsCompliance = !!input.payments || !!input.auditLog || !!input.multiTenant

  return {
    auth: {
      required: !!input.auth,
      method: input.sso ? "NextAuth (OAuth + SAML + OIDC)" : input.auth ? "Supabase Auth / NextAuth / Clerk" : "Nenhum",
      reason: input.sso ? "SSO corporativo com provedores externos" : input.auth ? "Autenticação de usuários" : "Sem autenticação",
    },
    mfa: {
      required: !!input.payments || !!input.blockchain || !!input.sso,
      reason: input.payments || input.blockchain ? "Transações financeiras ou blockchain" : input.sso ? "Segurança corporativa" : "Não necessário",
    },
    encryption: {
      required: hasSensitive,
      scope: hasSensitive ? "TLS 1.3 (trânsito) + AES-256 (repouso) + criptografia de campo para PII" : "TLS 1.3 (padrão)",
    },
    rateLimit: {
      required: true,
      limit: input.apiAccess ? "100 req/min por IP, 1000 req/min por usuário, 10000 req/h por API key" : "100 req/min por IP, 1000 req/min por usuário",
    },
    audit: {
      required: !!input.auditLog || needsCompliance,
      reason: input.auditLog ? "Auditoria solicitada" : needsCompliance ? "Compliance requer trilha de auditoria" : "Recomendado",
    },
    recommendations: [
      ...(input.multiTenant ? ["Implementar Row Level Security (RLS) no Supabase para isolamento de tenants", "Cada tenant tem schema ou prefixo próprio"] : input.auth ? ["Implementar Row Level Security (RLS) no Supabase"] : []),
      ...(input.upload ? ["Sanitizar arquivos (tipo, tamanho, virus scan)", "Usar URLs assinadas para acesso"] : []),
      ...(input.payments ? ["Nunca confiar no frontend para validação", "Verificar assinatura de webhooks", "PCI-DSS compliance"] : []),
      ...(input.blockchain ? ["Auditar smart contracts", "Multi-sig wallet para admin"] : []),
      ...(input.apiAccess ? ["API Keys com scopes de permissão", "Rate limiting por key", "Registro de chamadas de API"] : []),
      ...(input.webhooks ? ["Verificar assinatura HMAC dos webhooks", "Retry com backoff + dead letter queue"] : []),
      ...(input.auditLog ? ["Registrar todas as ações de admin", "Logs imutáveis (append-only)"] : []),
      ...(input.sso ? ["Validar emissor do token (iss)", "Suportar múltiplos IdPs"] : []),
      "Validar todas as entradas com Zod",
      "Configurar CORS por origem",
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
      "Testes unitários para toda lógica de negócio (Vitest)",
      ...(input.auth ? ["Testes de integração para fluxo de autenticação"] : []),
      ...(input.multiTenant ? ["Testes de isolamento entre tenants"] : []),
      ...(input.payments ? ["Testes de webhook em sandbox", "Testes de ciclo de faturamento"] : []),
      ...(input.blockchain ? ["Testes de contrato em testnet"] : []),
      ...(input.webhooks ? ["Testes de entrega e retry de webhooks"] : []),
      ...(input.apiAccess ? ["Testes de rate limiting e scopes de API key"] : []),
      ...(needsLoad ? ["Testes de carga com k6"] : []),
      ...(input.auditLog ? ["Testes de integridade do audit log"] : []),
      "E2E com Playwright para fluxos críticos",
      "Cobertura mínima: 80%",
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
      ...(input.blockchain || input.realtime || input.ai || input.multiTenant ? ["OpenTelemetry + Grafana (tracing + métricas)"] : []),
      ...(input.auditLog ? ["Logs estruturados + SIEM (opcional)"] : []),
      ...(input.payments ? ["Monitoramento de falhas de pagamento", "Alerta de queda de receita"] : []),
      ...(input.multiTenant ? ["Métricas por tenant", "Alerta de tenant com uso anômalo"] : []),
    ],
  }
}

export function recommendCost(input: Partial<ProjectInput>): CostDecision {
  const base = 20
  const items: Record<string, number> = {
    Hospedagem: 20,
    Banco: 25,
  }
  if (input.auth) items.Auth = input.sso ? 50 : 25
  if (input.blockchain) items["Blockchain (RPC + Indexer)"] = 50
  if (input.ai) items["API IA"] = 100
  if (input.aiMemory) items["Vector DB"] = 30
  if (input.payments) items["Taxas de Pagamento"] = 30
  if (input.upload) items.Storage = 10
  if (input.realtime) items.Realtime = 20
  if (input.multiTenant) items["Infra Multi-tenant"] = 50
  if (input.apiAccess) items["API Gateway"] = 25
  if (input.webhooks) items["Webhook Infrastructure"] = 15
  if (input.auditLog) items["Audit Log Storage"] = 10
  if (input.notifications) items.Emails = 20
  if (input.featureFlags) items["Feature Flags"] = 0
  if ((input.users ?? 0) > 100000) items["Escala (Redis + CDN)"] = 200
  else if ((input.users ?? 0) > 10000) items["Escala (Redis)"] = 100

  const total = Object.values(items).reduce((a, b) => a + b, 0)

  return {
    estimatedMonthly: `$${total}/mês (estimativa inicial)`,
    breakdown: items,
    recommendations: [
      ...(total > 300 ? ["Considere reserved instances para reduzir custos"] : []),
      ...(input.ai ? ["Cache de respostas de IA para reduzir chamadas"] : []),
      ...(input.blockchain ? ["Usar testnet para desenvolvimento"] : []),
      ...(input.multiTenant && (input.users ?? 0) > 50000 ? ["Considerar dedicated infra por tenant enterprise"] : []),
      ...(input.notifications ? ["Usar batch de emails para reduzir custos"] : []),
      "Configurar alertas de budget",
      "Revisar custos mensalmente",
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
