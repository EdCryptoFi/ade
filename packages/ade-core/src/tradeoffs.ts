import type { ProjectInput } from "./types.ts"

export interface TradeoffOption {
  name: string
  pros: string[]
  cons: string[]
  cost: "low" | "medium" | "high"
  whenToUse: string
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
        pros: ["App Router", "SSR/SSG/ISR", "React ecosystem", "Vercel native", "Integrated API Routes"],
        cons: ["Bundle size", "Server components learning curve", "Vercel vendor lock-in"],
        cost: "medium",
        whenToUse: "Projects that need SEO, performance, or integrated full-stack",
      },
      {
        name: "Astro",
        pros: ["Zero JS by default", "Islands of hydration", "Native performance", "Any UI framework"],
        cons: ["Smaller ecosystem than React", "APIs need a separate backend", "Fewer dynamic features"],
        cost: "low",
        whenToUse: "Landing pages, blogs, content sites, simple dashboards",
      },
      {
        name: "Remix",
        pros: ["Web standards first", "Nested routes", "Native form actions", "Error boundaries"],
        cons: ["Less popular", "Fewer templates", "More complex debugging"],
        cost: "medium",
        whenToUse: "Applications with complex forms and nested navigation",
      },
      {
        name: "SvelteKit",
        pros: ["Minimal bundle size", "Simple reactivity", "Excellent performance", "Low learning curve"],
        cons: ["Smaller ecosystem", "Fewer libraries", "Harder to hire"],
        cost: "low",
        whenToUse: "Small teams, prototypes, performance-first projects",
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
        pros: ["Full PostgreSQL", "Native RLS", "Auth + Storage + Realtime", "Dashboard included"],
        cons: ["Partial vendor lock-in", "Free tier limits", "Less infra control"],
        cost: "medium",
        whenToUse: "Projects that need a ready backend with auth, realtime and storage",
      },
      {
        name: "Neon",
        pros: ["Serverless PostgreSQL", "DB branching", "Fast cold start", "Usage-based pricing"],
        cons: ["No built-in RLS", "No embedded auth", "No storage/realtime"],
        cost: "medium",
        whenToUse: "Serverless projects that need branching and horizontal scalability",
      },
      {
        name: "Prisma Postgres",
        pros: ["Type-safe queries", "Declarative migrations", "Mature ORM", "Next.js integration"],
        cons: ["Extra abstraction layer", "Performance overhead", "Learning curve"],
        cost: "medium",
        whenToUse: "Teams that prioritize type safety and TypeScript DX",
      },
      {
        name: "PlanetScale",
        pros: ["MySQL compatible", "Powerful branching", "Zero-downtime deploy", "Automatic scaling"],
        cons: ["MySQL (not PostgreSQL)", "No RLS", "No native functions"],
        cost: "high",
        whenToUse: "High-scale projects that need branching and zero-downtime deploys",
      },
    ],
  }
}

export function analyzeAuth(input: Partial<ProjectInput>): TradeoffDecision {
  return {
    category: "Authentication",
    selected: input.sso ? "NextAuth (Auth.js)" : "Supabase Auth",
    options: [
      {
        name: "Supabase Auth",
        pros: ["Integrated with the database", "Automatic RLS", "Email magic links", "Free to start"],
        cons: ["Fewer SSO providers", "Limited customization", "Depends on Supabase"],
        cost: "low",
        whenToUse: "Projects already using Supabase that need simple auth",
      },
      {
        name: "NextAuth (Auth.js)",
        pros: ["Many providers", "SSO/SAML/OIDC", "Database agnostic", "Self-hosted"],
        cons: ["More complex setup", "Dense documentation", "Middleware can be confusing"],
        cost: "medium",
        whenToUse: "Projects that need SSO, multiple providers, or corporate auth",
      },
      {
        name: "Clerk",
        pros: ["Ready UI", "Native multi-tenant", "Easy MFA", "Great DX"],
        cons: ["Vendor lock-in", "Price scales fast", "Limited self-host"],
        cost: "high",
        whenToUse: "Startups that want auth working in minutes without infra concerns",
      },
      {
        name: "Auth0",
        pros: ["Enterprise-ready", "MFA + SSO + AD", "Audit logs", "SLAs"],
        cons: ["Expensive at scale", "Slow setup", "Generic UI"],
        cost: "high",
        whenToUse: "Companies that need compliance, corporate SSO and SLAs",
      },
    ],
  }
}

export function analyzePayments(): TradeoffDecision {
  return {
    category: "Payments",
    selected: "Stripe",
    options: [
      {
        name: "Stripe",
        pros: ["Complete API", "Embeddable checkout", "Billing + subscriptions", "Global"],
        cons: ["Complex for beginners", "High fees on micropayments", "Slow free-tier support"],
        cost: "medium",
        whenToUse: "Most SaaS projects — Stripe is the industry standard",
      },
      {
        name: "Paddle",
        pros: ["Merchant of Record (MoR)", "Handles VAT/global taxes", "Native subscriptions"],
        cons: ["Less customizable checkout", "Product catalog required", "Limited support"],
        cost: "medium",
        whenToUse: "Global SaaS that wants to outsource tax compliance",
      },
      {
        name: "Lemon Squeezy",
        pros: ["MoR + Stripe underneath", "Nice checkout", "Native licensing"],
        cons: ["New platform", "Fewer features than Stripe", "No multi-gateway support"],
        cost: "medium",
        whenToUse: "Digital products and software that need licensing + MoR",
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
        pros: ["Native Next.js", "Preview deploys", "Edge Functions", "Analytics included"],
        cons: ["Vendor lock-in", "Price at high scale", "Serverless limits"],
        cost: "medium",
        whenToUse: "Next.js projects — the most integrated deploy possible",
      },
      {
        name: "Cloudflare Pages",
        pros: ["Global edge", "Low price", "Powerful Workers", "CDN network"],
        cons: ["No native SSR (needs Workers)", "Fewer integrations", "Hard debugging"],
        cost: "low",
        whenToUse: "Static sites, apps with Workers, or limited-budget teams",
      },
      {
        name: "Railway",
        pros: ["Simple deploys", "Embedded DB", "Native Docker", "Predictable pricing"],
        cons: ["Fewer edge features", "Shared infra", "No native preview deploys"],
        cost: "medium",
        whenToUse: "Projects that need a traditional backend with simplified deploys",
      },
      {
        name: "Fly.io",
        pros: ["Real edge compute", "Global PostgreSQL", "Pure Docker", "Firecracker VMs"],
        cons: ["Manual setup", "Technical documentation", "More expensive than serverless alternatives"],
        cost: "high",
        whenToUse: "Applications that need near-edge compute with distributed databases",
      },
    ],
  }
}

export function analyzeAI(): TradeoffDecision {
  return {
    category: "AI Provider",
    selected: "OpenAI",
    options: [
      {
        name: "OpenAI",
        pros: ["Leading GPT-4", "Stable API", "Function calling", "Largest ecosystem"],
        cons: ["High price", "Latency", "No easy fine-tuning"],
        cost: "high",
        whenToUse: "Maximum response quality, complex agents, or chains",
      },
      {
        name: "Claude (Anthropic)",
        pros: ["Long context (200k)", "Less hallucination", "Excellent code", "Safety by design"],
        cons: ["Lower API rate limits", "Fewer tools", "Smaller ecosystem"],
        cost: "high",
        whenToUse: "Long document analysis, code, or safety-critical applications",
      },
      {
        name: "Google Gemini",
        pros: ["1M token context", "Low price", "Native multimodal", "Google integration"],
        cons: ["Lower quality on complex tasks", "API changes", "Less adoption"],
        cost: "low",
        whenToUse: "Very long document analysis, videos, or limited budgets",
      },
      {
        name: "Local (Ollama)",
        pros: ["No API cost", "Total privacy", "Offline", "Free fine-tuning"],
        cons: ["Lower quality", "Requires hardware", "Complex setup", "Ongoing maintenance"],
        cost: "low",
        whenToUse: "Sensitive data, prototyping, or 100% offline applications",
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
