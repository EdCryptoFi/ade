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
