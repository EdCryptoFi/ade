// Pure, testable business/formatting logic for the playground.

export interface Feature {
  id: string
  label: string
  key: string
  type: "boolean" | "number"
}

export const FEATURES: Feature[] = [
  { id: "blockchain", label: "Blockchain", key: "blockchain", type: "boolean" },
  { id: "auth", label: "Authentication", key: "auth", type: "boolean" },
  { id: "upload", label: "Upload", key: "upload", type: "boolean" },
  { id: "realtime", label: "Real-time", key: "realtime", type: "boolean" },
  { id: "payments", label: "Payments", key: "payments", type: "boolean" },
  { id: "ai", label: "AI", key: "ai", type: "boolean" },
  { id: "aiMemory", label: "AI Memory", key: "aiMemory", type: "boolean" },
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
): Record<string, unknown> {
  return {
    description,
    domain: domain || "general",
    features: extractFeatureList(description),
    ...Object.fromEntries(
      Object.entries(toggles).filter(([, v]) => v),
    ),
  }
}
