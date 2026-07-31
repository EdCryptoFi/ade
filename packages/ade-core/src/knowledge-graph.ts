export interface KnowledgeNode {
  id: string
  label: string
  type: "domain" | "data" | "infra" | "component"
}

export interface KnowledgeEdge {
  from: string
  to: string
  label: string
}

const defaultNodes: Record<string, KnowledgeNode> = {
  blockchain: { id: "blockchain", label: "Blockchain", type: "domain" },
  wallet: { id: "wallet", label: "Wallet", type: "component" },
  signer: { id: "signer", label: "Signer", type: "component" },
  txbuilder: { id: "txbuilder", label: "Transaction Builder", type: "component" },
  storage: { id: "storage", label: "Storage", type: "infra" },
  supabase_storage: { id: "supabase_storage", label: "Supabase Storage", type: "infra" },
  ai: { id: "ai", label: "AI", type: "domain" },
  memory: { id: "memory", label: "Memory", type: "infra" },
  vector_db: { id: "vector_db", label: "Vector Database", type: "infra" },
  embeddings: { id: "embeddings", label: "Embeddings", type: "component" },
  marketplace: { id: "marketplace", label: "Marketplace", type: "domain" },
  products: { id: "products", label: "Products", type: "data" },
  images: { id: "images", label: "Images", type: "data" },

  saas: { id: "saas", label: "SaaS", type: "domain" },
  auth: { id: "auth", label: "Authentication & Authorization", type: "infra" },
  database: { id: "database", label: "Database", type: "infra" },
  search: { id: "search", label: "Search", type: "infra" },
  api: { id: "api", label: "API", type: "infra" },
  events: { id: "events", label: "Events & Messaging", type: "infra" },
  background_jobs: { id: "background_jobs", label: "Background Jobs & Queues", type: "infra" },
  email: { id: "email", label: "Email", type: "infra" },
  sms: { id: "sms", label: "SMS & Notifications", type: "infra" },
  payments: { id: "payments", label: "Payment & Billing", type: "infra" },
  analytics: { id: "analytics", label: "Analytics", type: "infra" },
  monitoring: { id: "monitoring", label: "Monitoring & Observability", type: "infra" },
  error_tracking: { id: "error_tracking", label: "Error Tracking", type: "infra" },
  hosting: { id: "hosting", label: "Hosting & Infrastructure", type: "infra" },
  secrets: { id: "secrets", label: "Secrets Management", type: "infra" },
  cicd: { id: "cicd", label: "CI/CD", type: "infra" },
  feature_flags: { id: "feature_flags", label: "Feature Flags", type: "infra" },
  cms: { id: "cms", label: "CMS", type: "infra" },
  docs: { id: "docs", label: "Documentation", type: "infra" },
  security: { id: "security", label: "Security", type: "infra" },
}

const defaultEdges: KnowledgeEdge[] = [
  { from: "marketplace", to: "products", label: "has" },
  { from: "products", to: "images", label: "has" },
  { from: "images", to: "storage", label: "requires" },
  { from: "storage", to: "supabase_storage", label: "implemented_by" },
  { from: "ai", to: "memory", label: "requires" },
  { from: "memory", to: "vector_db", label: "uses" },
  { from: "vector_db", to: "embeddings", label: "stores" },
  { from: "blockchain", to: "wallet", label: "requires" },
  { from: "wallet", to: "signer", label: "uses" },
  { from: "signer", to: "txbuilder", label: "feeds" },

  { from: "saas", to: "auth", label: "requires" },
  { from: "saas", to: "database", label: "requires" },
  { from: "saas", to: "hosting", label: "requires" },
  { from: "saas", to: "security", label: "requires" },
  { from: "saas", to: "api", label: "may_need" },
  { from: "saas", to: "payments", label: "may_need" },
  { from: "saas", to: "email", label: "may_need" },
  { from: "saas", to: "monitoring", label: "recommends" },
  { from: "saas", to: "analytics", label: "recommends" },
  { from: "saas", to: "cicd", label: "recommends" },
  { from: "database", to: "search", label: "may_extend_with" },
  { from: "ai", to: "search", label: "improves" },
  { from: "background_jobs", to: "email", label: "powers" },
  { from: "background_jobs", to: "events", label: "sends" },
  { from: "events", to: "analytics", label: "feeds" },
  { from: "error_tracking", to: "monitoring", label: "part_of" },
  { from: "secrets", to: "security", label: "supports" },
  { from: "feature_flags", to: "hosting", label: "enables" },
  { from: "docs", to: "api", label: "documents" },
  { from: "cms", to: "saas", label: "serves" },
]

export function getKnowledgeGraph(domain?: string) {
  if (domain && defaultNodes[domain]) {
    const relevantIds = new Set<string>()
    relevantIds.add(domain)
    defaultEdges
      .filter(e => e.from === domain || e.to === domain)
      .forEach(e => { relevantIds.add(e.from); relevantIds.add(e.to) })

    return {
      nodes: defaultNodes,
      edges: defaultEdges.filter(e => relevantIds.has(e.from) && relevantIds.has(e.to)),
    }
  }

  return { nodes: defaultNodes, edges: defaultEdges }
}
