// Pure, testable business/formatting logic for the playground.

export interface Feature {
  id: string
  label: string
  key: string
  type: "boolean" | "number"
}

export type ProductMode = "analysis" | "audit" | "blueprint"

export const DOMAIN_OPTIONS = [
  "marketplace",
  "dashboard",
  "saas",
  "crm",
  "ai-agent",
  "landing-page",
  "game",
  "social-network",
  "transportation",
  "fintech",
  "other",
] as const

export const PRODUCT_MODES: Array<{ id: ProductMode; label: string; price: string; description: string }> = [
  { id: "analysis", label: "Architecture Analysis", price: "$0.50", description: "Architecture, stack, data model, infrastructure, and delivery plan." },
  { id: "audit", label: "Security Audit", price: "$1.00", description: "Prioritized risks, severity, evidence, mitigations, and tests." },
  { id: "blueprint", label: "Architecture + Security Blueprint", price: "$5.00", description: "The complete architecture and security package." },
]

export const EXAMPLE_PROJECT = {
  description: "A B2B SaaS platform for independent retailers to manage inventory, orders, team access, and sales analytics.",
  domain: "saas",
  users: "10000",
  mode: "blueprint" as ProductMode,
  toggles: { auth: true, teams: true, multiTenant: true, payments: true, auditLog: true, notifications: true, apiAccess: true },
}

export const FEATURES: Feature[] = [
  { id: "blockchain", label: "Blockchain", key: "blockchain", type: "boolean" },
  { id: "auth", label: "Authentication", key: "auth", type: "boolean" },
  { id: "upload", label: "Upload", key: "upload", type: "boolean" },
  { id: "realtime", label: "Real-time", key: "realtime", type: "boolean" },
  { id: "payments", label: "Payments", key: "payments", type: "boolean" },
  { id: "ai", label: "AI", key: "ai", type: "boolean" },
  { id: "aiMemory", label: "AI Memory", key: "aiMemory", type: "boolean" },
  { id: "teams", label: "Teams", key: "teams", type: "boolean" },
  { id: "multiTenant", label: "Multi-tenant", key: "multiTenant", type: "boolean" },
  { id: "apiAccess", label: "Public API", key: "apiAccess", type: "boolean" },
  { id: "webhooks", label: "Webhooks", key: "webhooks", type: "boolean" },
  { id: "sso", label: "SSO / SAML", key: "sso", type: "boolean" },
  { id: "auditLog", label: "Audit log", key: "auditLog", type: "boolean" },
  { id: "featureFlags", label: "Feature flags", key: "featureFlags", type: "boolean" },
  { id: "onboarding", label: "Onboarding", key: "onboarding", type: "boolean" },
  { id: "notifications", label: "Notifications", key: "notifications", type: "boolean" },
  { id: "dataExport", label: "Data export", key: "dataExport", type: "boolean" },
  { id: "search", label: "Search", key: "search", type: "boolean" },
  { id: "backgroundJobs", label: "Background jobs", key: "backgroundJobs", type: "boolean" },
  { id: "cms", label: "CMS", key: "cms", type: "boolean" },
]

// Splits the description text into the feature list the API expects.
export function extractFeatureList(description: string): string[] {
  return description
    .split(/[,;\n]/)
    .map((f) => f.trim())
    .filter(Boolean)
    .slice(0, 50)
}

export function buildPayload(
  description: string,
  domain: string,
  toggles: Record<string, boolean>,
  users?: number,
  mode: ProductMode = "blueprint",
): Record<string, unknown> {
  const activeFeatureIds = Object.entries(toggles)
    .filter(([, enabled]) => enabled)
    .map(([id]) => id)

  return {
    description,
    domain: domain || "general",
    features: activeFeatureIds.length > 0 ? activeFeatureIds : extractFeatureList(description),
    ...(users && users > 0 ? { users } : {}),
    mode,
    ...Object.fromEntries(
      Object.entries(toggles).filter(([, enabled]) => enabled),
    ),
  }
}
