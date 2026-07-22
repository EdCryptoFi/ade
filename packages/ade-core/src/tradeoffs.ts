import type { ProjectInput } from "./types.ts"

export interface TradeoffOption {
  name: string
  pros: string[]
  cons: string[]
  cost: "baixo" | "médio" | "alto"
  quandoUsar: string
}

export interface TradeoffDecision {
  category: string
  selected: string
  options: TradeoffOption[]
}

export function analyzeFrontend(input: Partial<ProjectInput>): TradeoffDecision {
  const hasDashboard = /dashboard|chart|gráfico|admin/i.test(`${input.domain ?? ""} ${input.description ?? ""}`)
  return {
    category: "Frontend",
    selected: hasDashboard ? "Next.js + shadcn/ui" : "Next.js",
    options: [
      {
        name: "Next.js",
        pros: ["App Router", "SSR/SSG/ISR", "Ecossistema React", "Vercel nativo", "API Routes integradas"],
        cons: ["Bundle size", "Server components curva de aprendizado", "Vendor lock-in com Vercel"],
        cost: "médio",
        quandoUsar: "Projetos que precisam de SEO, performance, ou full-stack integrado",
      },
      {
        name: "Astro",
        pros: ["Zero JS por padrão", "Ilhas de hidratação", "Performance nativa", "Qualquer framework UI"],
        cons: ["Menos ecossistema que React", "APIs precisam de backend separado", "Menos recursos dinâmicos"],
        cost: "baixo",
        quandoUsar: "Landing pages, blogs, sites de conteúdo, dashboards simples",
      },
      {
        name: "Remix",
        pros: ["Web standards first", "Nested routes", "Form actions nativos", "Error boundaries"],
        cons: ["Menos popular", "Menos templates", "Debugging mais complexo"],
        cost: "médio",
        quandoUsar: "Aplicações com formulários complexos e navegação aninhada",
      },
      {
        name: "SvelteKit",
        pros: ["Bundle size mínimo", "Reatividade simples", "Performance excelente", "Curva baixa"],
        cons: ["Ecossistema menor", "Menos bibliotecas", "Contratação mais difícil"],
        cost: "baixo",
        quandoUsar: "Times pequenos, protótipos, projetos que priorizam performance",
      },
    ],
  }
}

export function analyzeDatabase(input: Partial<ProjectInput>): TradeoffDecision {
  const needsBlockchain = !!input.blockchain
  return {
    category: "Database",
    selected: needsBlockchain ? "Supabase PostgreSQL + Indexer" : "Supabase PostgreSQL",
    options: [
      {
        name: "Supabase PostgreSQL",
        pros: ["PostgreSQL completo", "RLS nativo", "Auth + Storage + Realtime", "Dashboard incluso"],
        cons: ["Vendor lock-in parcial", "Limites do free tier", "Menos controle de infra"],
        cost: "médio",
        quandoUsar: "Projetos que precisam de backend pronto com auth, realtime e storage",
      },
      {
        name: "Neon",
        pros: ["Serverless PostgreSQL", "Branching de DB", "Cold start rápido", "Pricing por uso"],
        cons: ["Sem RLS built-in", "Sem auth embutido", "Sem storage/realtime"],
        cost: "médio",
        quandoUsar: "Projetos serverless que precisam de branching e escalabilidade horizontal",
      },
      {
        name: "Prisma Postgres",
        pros: ["Type-safe queries", "Migrações declarativas", "ORM maduro", "Integração Next.js"],
        cons: ["Camada extra de abstração", "Performance overhead", "Curva de aprendizado"],
        cost: "médio",
        quandoUsar: "Times que priorizam type safety e DX com TypeScript",
      },
      {
        name: "PlanetScale",
        pros: ["MySQL compatível", "Branching poderoso", "Deploy sem downtime", "Escala automática"],
        cons: ["MySQL (não PostgreSQL)", "Sem RLS", "Sem funções nativas"],
        cost: "alto",
        quandoUsar: "Projetos com alta escala que precisam de branching e zero-downtime deploy",
      },
    ],
  }
}

export function analyzeAuth(input: Partial<ProjectInput>): TradeoffDecision {
  return {
    category: "Autenticação",
    selected: input.sso ? "NextAuth (Auth.js)" : "Supabase Auth",
    options: [
      {
        name: "Supabase Auth",
        pros: ["Integrado ao banco", "RLS automático", "Mágica de email", "Gratuito no início"],
        cons: ["Menos providers SSO", "Customização limitada", "Depende do Supabase"],
        cost: "baixo",
        quandoUsar: "Projetos que já usam Supabase e precisam de auth simples",
      },
      {
        name: "NextAuth (Auth.js)",
        pros: ["Muitos providers", "SSO/SAML/OIDC", "Database agnóstico", "Self-hosted"],
        cons: ["Configuração mais complexa", "Documentação densa", "Middleware pode confundir"],
        cost: "médio",
        quandoUsar: "Projetos que precisam de SSO, múltiplos providers, ou auth corporativo",
      },
      {
        name: "Clerk",
        pros: ["UI pronta", "Multi-tenant nativo", "MFA fácil", "Ótima DX"],
        cons: ["Vendor lock-in", "Preço escala rápido", "Self-host limitado"],
        cost: "alto",
        quandoUsar: "Startups que querem auth funcionando em minutos sem se preocupar com infra",
      },
      {
        name: "Auth0",
        pros: ["Enterprise-ready", "MFA + SSO + AD", "Audit logs", "SLAs"],
        cons: ["Caro em escala", "Setup demorado", "UI genérica"],
        cost: "alto",
        quandoUsar: "Empresas que precisam de compliance, SSO corporativo e SLAs",
      },
    ],
  }
}

export function analyzePayments(): TradeoffDecision {
  return {
    category: "Pagamentos",
    selected: "Stripe",
    options: [
      {
        name: "Stripe",
        pros: ["API completa", "Checkout embeddable", "Billing + subscriptions", "Global"],
        cons: ["Complexo para iniciantes", "Taxas altas em micropagamentos", "Suporte lento no free"],
        cost: "médio",
        quandoUsar: "Maioria dos projetos SaaS — Stripe é o padrão da indústria",
      },
      {
        name: "Paddle",
        pros: ["Vendor de registro (MoR)", "Lida com IVA/taxas globais", "Subscription nativo"],
        cons: ["Checkout menos customizável", "Catálogo de produtos obrigatório", "Suporte limitado"],
        cost: "médio",
        quandoUsar: "SaaS global que quer terceirizar compliance fiscal",
      },
      {
        name: "Lemon Squeezy",
        pros: ["MoR + Stripe por baixo", "Checkout bonito", "Licensing nativo"],
        cons: ["Plataforma nova", "Menos recursos que Stripe", "Sem suporte a vários gateways"],
        cost: "médio",
        quandoUsar: "Produtos digitais e softwares que precisam de licensing + MoR",
      },
    ],
  }
}

export function analyzeDeploy(input: Partial<ProjectInput>): TradeoffDecision {
  return {
    category: "Deploy",
    selected: "Vercel",
    options: [
      {
        name: "Vercel",
        pros: ["Next.js nativo", "Preview deploys", "Edge Functions", "Analytics incluso"],
        cons: ["Vendor lock-in", "Preço em escala alta", "Limites de serverless"],
        cost: "médio",
        quandoUsar: "Projetos Next.js — é o deploy mais integrado possível",
      },
      {
        name: "Cloudflare Pages",
        pros: ["Edge global", "Preço baixo", "Workers poderosos", "Rede de CDN"],
        cons: ["Sem SSR nativo (precisa Workers)", "Menos integrações", "Debugging difícil"],
        cost: "baixo",
        quandoUsar: "Sites estáticos, apps com Workers, ou times com budget limitado",
      },
      {
        name: "Railway",
        pros: ["Deploy simples", "DB embutido", "Docker nativo", "Pricing previsível"],
        cons: ["Menos recursos de edge", "Infra compartilhada", "Sem preview deploy nativo"],
        cost: "médio",
        quandoUsar: "Projetos que precisam de backend tradicional com deploy simplificado",
      },
      {
        name: "Fly.io",
        pros: ["Edge compute real", "PostgreSQL global", "Docker puro", "Firecracker VMs"],
        cons: ["Setup manual", "Documentação técnica", "Mais caro que alternativas serverless"],
        cost: "alto",
        quandoUsar: "Aplicações que precisam de computação near-edge com bancos distribuídos",
      },
    ],
  }
}

export function analyzeAI(): TradeoffDecision {
  return {
    category: "Provedor de IA",
    selected: "OpenAI",
    options: [
      {
        name: "OpenAI",
        pros: ["GPT-4 líder", "API estável", "Function calling", "Maior ecossistema"],
        cons: ["Preço alto", "Latência", "Sem fine-tuning fácil"],
        cost: "alto",
        quandoUsar: "Qualidade máxima de resposta, agentes complexos, ou chains",
      },
      {
        name: "Claude (Anthropic)",
        pros: ["Contexto longo (200k)", "Menos alucinação", "Código excelente", "Safety por design"],
        cons: ["API rate limit menor", "Menos ferramentas", "Ecossistema menor"],
        cost: "alto",
        quandoUsar: "Análise de documentos longos, código, ou aplicações que precisam de safety",
      },
      {
        name: "Google Gemini",
        pros: ["Contexto de 1M tokens", "Preço baixo", "Multimodal nativo", "Integração Google"],
        cons: ["Qualidade inferior em tarefas complexas", "API changing", "Menos adoção"],
        cost: "baixo",
        quandoUsar: "Análise de documentos muito longos, vídeos, ou budget limitado",
      },
      {
        name: "Local (Ollama)",
        pros: ["Sem custo de API", "Privacidade total", "Offline", "Fine-tuning livre"],
        cons: ["Qualidade inferior", "Requer hardware", "Setup complexo", "Manutenção contínua"],
        cost: "baixo",
        quandoUsar: "Dados sensíveis, prototipação, ou aplicações 100% offline",
      },
    ],
  }
}

export function analyzeAll(input: Partial<ProjectInput>) {
  return [
    analyzeFrontend(input),
    analyzeDatabase(input),
    analyzeAuth(input),
    analyzePayments(),
    analyzeDeploy(input),
    analyzeAI(),
  ]
}
