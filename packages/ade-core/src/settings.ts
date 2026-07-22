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
      recommended: /blockchain|nft|token|wallet|crypto|web3|sui|ethereum|solana|contrato|smart.contract|defi|dex|nft|bridge|stake/i.test(text),
      reason: "Identificado por menção a blockchain, tokens, NFTs ou smart contracts",
    },
    {
      feature: "Autenticação",
      key: "auth",
      recommended: /auth|login|user|usuário|conta|account|perfil|profile|signup|register|logar|entrar|sessão|session/i.test(text),
      reason: "Sistema precisa de identidade de usuário",
    },
    {
      feature: "Upload de Arquivos",
      key: "upload",
      recommended: /upload|upload de arquivo|file|image|imagem|foto|photo|documento|document|anexo|attachment|mídia|media/i.test(text),
      reason: "Projeto menciona arquivos ou mídia",
    },
    {
      feature: "Tempo Real",
      key: "realtime",
      recommended: /realtime|tempo.real|live|notificação|notification|chat|mensagem|message|websocket|stream|ao.vivo/i.test(text),
      reason: "Funcionalidades em tempo real detectadas",
    },
    {
      feature: "Pagamentos",
      key: "payments",
      recommended: /pagamento|payment|pagar|buy|comprar|checkout|cobrança|billing|subscription|plano|plan|stripe|paddle|checkout|preço|price|vend|sell/i.test(text),
      reason: "Transações financeiras ou assinaturas",
    },
    {
      feature: "Inteligência Artificial",
      key: "ai",
      recommended: /ai|ia|inteligência|inteligencia|llm|gpt|chat|claude|openai|recomendação|recommendation|agente|agent|automation|automação|chatbot/i.test(text),
      reason: "IA, LLMs ou agentes autônomos",
    },
    {
      feature: "Memória para IA",
      key: "aiMemory",
      recommended: /memória|memory|contexto|context|histórico|history|embedding|vector|vetorial|rag|knowledge.graph|grafo.de.conhecimento/i.test(text),
      reason: "IA precisa de memória persistente ou RAG",
    },
  ]
}

export function recommendDataStructures(input: Partial<ProjectInput>): DataRecommendation[] {
  const text = `${input.domain ?? ""} ${input.description ?? ""} ${(input.features ?? []).join(" ")}`.toLowerCase()

  return [
    {
      structure: "array",
      selected: /list|coleção|collection|feed|dashboard|produtos?|products?|histórico|history|grid|table|tabela/i.test(text) || (input.features?.length ?? 0) > 0,
      reason: "Listas e coleções são universais",
    },
    {
      structure: "hash-map",
      selected: /usuário|user|wallet|sessão|session|token|config|settings|cache|lookup|busca|chave|key.value/i.test(text) || !!input.auth,
      reason: "Busca por chave necessária",
    },
    {
      structure: "graph",
      selected: /relacionamento|relationship|conexão|connection|fluxo|flow|agente|agent|permissão|permission|blockchain|rede|network|social|seguir|follow|recommendation|recomendação|conhecimento|knowledge/i.test(text) || !!input.blockchain,
      reason: "Relacionamentos e conexões entre entidades",
    },
    {
      structure: "tree",
      selected: /categoria|category|organograma|hierarquia|hierarchy|árvore|tree|menu|navegação|navigation|diretório|directory|subcategoria|subcategory|tag/i.test(text),
      reason: "Dados hierárquicos ou navegação em árvore",
    },
    {
      structure: "stack-queue",
      selected: /undo|redo|histórico|history|pilha|stack|fila|queue|processamento|processing|job|task|webhook|pipeline|fifo|lifo|rate.limit|scheduling|agendamento/i.test(text),
      reason: "Processamento sequencial ou filas de tarefas",
    },
    {
      structure: "set",
      selected: /permissão|permission|tag|unique|único|única|whitelist|blacklist|filtro|filter|intersecção|duplicata|duplicate|união|union/i.test(text),
      reason: "Garantia de unicidade ou operações de conjunto",
    },
    {
      structure: "heap",
      selected: /prioridade|priority|notificação|notification|timer|agendamento|scheduling|leaderboard|ranking|top|maior|menor|urgente/i.test(text),
      reason: "Priorização de elementos",
    },
    {
      structure: "linked-list",
      selected: /playlist|editor.de.texto|text.editor|navegação|navigation|elementos.conectados|blockchain.chain|bloco|block|fragmentação|fragmentation|sequência|sequence|lista.encadeada/i.test(text),
      reason: "Inserção/remoção frequente no meio da coleção",
    },
  ]
}

export function recommendInfrastructure(input: Partial<ProjectInput>): InfrastructureDecision {
  const hasDashboard = /dashboard|chart|gráfico|graph|analytics|kpi|métrica|metric|admin/i.test(`${input.domain} ${input.description ?? ""}`)

  return {
    frontend: hasDashboard ? "Next.js + shadcn/ui" : "Next.js",
    backend: "Next.js API Routes",
    database: input.blockchain ? "Supabase PostgreSQL + Indexer próprio" : "Supabase PostgreSQL",
    storage: input.upload ? "Supabase Storage" : "Supabase Storage (se necessário)",
    deploy: "Vercel",
    auth: input.auth ? "Supabase Auth" : "Nenhum (público)",
    analytics: "PostHog",
    emails: "Resend",
    blockchain: input.blockchain ? "Sui" : null,
    ai: input.ai ? "OpenAI" : null,
    memory: input.aiMemory ? "Walrus + Vector DB" : null,
    reasoning: {
      frontend: hasDashboard ? "Dashboard com gráficos → Next.js + shadcn/ui" : "Stack padrão → Next.js",
      backend: "Arquitetura simplificada → API Routes do Next.js",
      database: input.blockchain ? "Blockchain precisa de indexação → Supabase + Indexer" : "Banco padrão → Supabase PostgreSQL",
      storage: input.upload ? "Upload detectado → Supabase Storage" : "Storage padrão",
      deploy: "Deploy padrão → Vercel",
      auth: input.auth ? "Login necessário → Supabase Auth" : "Sem autenticação necessária",
      analytics: "Analytics padrão → PostHog",
      emails: "Email padrão → Resend",
      blockchain: input.blockchain ? "Blockchain detectado → Sui + Walrus" : "Sem blockchain",
      ai: input.ai ? "IA detectada → OpenAI" : "Sem IA",
      memory: input.aiMemory ? "Memória para IA → Walrus + Vector Database" : "Sem necessidade de memória",
    },
  }
}

export function recommendSecurity(input: Partial<ProjectInput>): SecurityDecision {
  const hasSensitiveData = input.auth || input.payments || !!input.upload

  return {
    auth: {
      required: !!input.auth,
      method: input.auth ? "Supabase Auth / NextAuth / Clerk" : "Nenhum",
      reason: input.auth ? "Autenticação de usuários necessária" : "Sem autenticação",
    },
    mfa: {
      required: !!input.payments || !!input.blockchain,
      reason: input.payments || input.blockchain ? "Transações financeiras ou blockchain exigem MFA" : "Não necessário para este escopo",
    },
    encryption: {
      required: hasSensitiveData,
      scope: hasSensitiveData ? "TLS 1.3 (trânsito) + AES-256 (repouso)" : "TLS 1.3 (padrão)",
    },
    rateLimit: {
      required: true,
      limit: "100 req/min por IP, 1000 req/min por usuário autenticado",
    },
    audit: {
      required: !!input.payments || !!input.blockchain,
      reason: input.payments || input.blockchain ? "Auditoria obrigatória para transações financeiras/blockchain" : "Recomendado mas não obrigatório",
    },
    recommendations: [
      ...(input.auth ? ["Implementar Row Level Security (RLS) no Supabase"] : []),
      ...(input.upload ? ["Sanitizar arquivos uploadados (tipo, tamanho, virus scan)", "Usar URLs assinadas para acesso a arquivos"] : []),
      ...(input.payments ? ["Nunca confiar no frontend para validação de pagamento", "Verificar assinatura de webhooks", "PCI-DSS compliance se aplicável"] : []),
      ...(input.blockchain ? ["Auditar smart contracts antes do deploy", "Usar multi-sig wallet para administração"] : []),
      "Validar todas as entradas com Zod",
      "Configurar CORS por origem",
      "Implementar logging de ações sensíveis",
    ],
  }
}

export function recommendTesting(input: Partial<ProjectInput>): TestingDecision {
  return {
    unit: true,
    integration: !!input.auth || !!input.payments || !!input.blockchain,
    e2e: true,
    load: (input.users ?? 0) > 10000 || !!input.realtime,
    framework: "Vitest + Playwright",
    recommendations: [
      "Testes unitários para toda lógica de negócio (Vitest)",
      ...(input.auth ? ["Testes de integração para fluxo de autenticação"] : []),
      ...(input.payments ? ["Testes de integração para webhooks de pagamento em sandbox"] : []),
      ...(input.blockchain ? ["Testes de integração para contratos em testnet"] : []),
      ...((input.users ?? 0) > 10000 ? ["Testes de carga com k6 simulando pico de usuários"] : []),
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
    tracing: !!input.blockchain || !!input.realtime || !!input.ai,
    dashboard: true,
    stack: [
      "PostHog (analytics + session replay)",
      "Sentry (error tracking)",
      "Vercel Analytics (performance)",
      ...(input.blockchain || input.realtime || input.ai ? ["OpenTelemetry + Grafana (tracing + métricas customizadas)"] : []),
    ],
  }
}

export function recommendCost(input: Partial<ProjectInput>): CostDecision {
  const base = 20
  const auth = input.auth ? 25 : 0
  const block = input.blockchain ? 50 : 0
  const ai = input.ai ? 100 : 0
  const mem = input.aiMemory ? 30 : 0
  const pay = input.payments ? 30 : 0
  const upload = input.upload ? 10 : 0
  const real = input.realtime ? 20 : 0
  const users = input.users && input.users > 100000 ? 200 : input.users && input.users > 10000 ? 100 : 0
  const total = base + auth + block + ai + mem + pay + upload + real + users

  return {
    estimatedMonthly: `$${total}/mês (estimativa inicial)`,
    breakdown: {
      Hospedagem: "$20 (Vercel Pro)",
      Banco: "$25 (Supabase Pro)",
      ...(input.auth ? { Auth: "$25 (Supabase Auth)" } : {}),
      ...(input.blockchain ? { Blockchain: "$50 (RPC + indexer)" } : {}),
      ...(input.ai ? { "API IA": "$100 (OpenAI)" } : {}),
      ...(input.aiMemory ? { "Vector DB": "$30 (Pinecone/Weaviate)" } : {}),
      ...(input.payments ? { Pagamentos: "$30 (Stripe/Paddle fees)" } : {}),
      ...(input.upload ? { Storage: "$10 (Supabase Storage)" } : {}),
      ...(input.realtime ? { Realtime: "$20 (WebSockets)" } : {}),
    },
    recommendations: [
      ...(total > 200 ? ["Considere reserved instances para reduzir custos"] : []),
      ...(input.ai ? ["Implementar cache para reduzir chamadas de API de IA"] : []),
      ...(input.blockchain ? ["Usar testnet para desenvolvimento"] : []),
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
