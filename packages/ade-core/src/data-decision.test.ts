import { describe, it, expect } from "vitest"
import { decideDataStructures } from "./data-decision.ts"

function input(overrides: Record<string, any> = {}) {
  return {
    description: "",
    domain: "",
    features: [],
    blockchain: false,
    auth: false,
    upload: false,
    realtime: false,
    payments: false,
    ai: false,
    aiMemory: false,
    ...overrides,
  } as any
}

describe("decideDataStructures", () => {
  it("includes array by default", () => {
    const result = decideDataStructures(input({ features: ["simple"] }))
    expect(result.structures).toContain("array")
  })

  it("includes hash-map when auth is enabled", () => {
    const result = decideDataStructures(input({ auth: true }))
    expect(result.structures).toContain("hash-map")
  })

  it("includes graph when blockchain is enabled", () => {
    const result = decideDataStructures(input({ blockchain: true }))
    expect(result.structures).toContain("graph")
  })

  it("includes tree for hierarchical data", () => {
    const result = decideDataStructures(input({ features: ["category", "subcategory"] }))
    expect(result.structures).toContain("tree")
  })

  it("includes stack-queue for pipelines", () => {
    const result = decideDataStructures(input({ features: ["webhook", "pipeline"] }))
    expect(result.structures).toContain("stack-queue")
  })

  it("includes set for unique collections", () => {
    const result = decideDataStructures(input({ features: ["permission", "role"] }))
    expect(result.structures).toContain("set")
  })

  it("includes heap for priority", () => {
    const result = decideDataStructures(input({ features: ["leaderboard", "ranking"] }))
    expect(result.structures).toContain("heap")
  })

  it("includes bloom-filter for membership test", () => {
    const result = decideDataStructures(input({ features: ["spam", "cache"] }))
    expect(result.structures).toContain("bloom-filter")
  })

  it("includes lru-cache when features mention cache", () => {
    const result = decideDataStructures(input({ features: ["cache", "hot data"] }))
    expect(result.structures).toContain("lru-cache")
  })

  it("includes merkle-tree for blockchain", () => {
    const result = decideDataStructures(input({ blockchain: true, features: ["merkle proof"] }))
    expect(result.structures).toContain("merkle-tree")
  })

  it("returns reasoning string", () => {
    const result = decideDataStructures(input({ auth: true, features: ["feed"] }))
    expect(result.reasoning).toBeTruthy()
    expect(result.reasoning.split("; ").length).toBeGreaterThanOrEqual(2)
  })

  // 🔍 QUALITY regression pins: segment-tree/disjoint-set/circular-buffer
  // used to fire on single common business words present in almost any SaaS
  // description ("dashboard", "role", "log"), so they showed up in nearly
  // every report regardless of fit. They should now require a genuinely
  // specific signal.
  it("does not recommend segment-tree for a generic dashboard/analytics description", () => {
    const result = decideDataStructures(
      input({ domain: "saas", description: "A B2B SaaS with a dashboard, KPIs, and sales analytics." }),
    )
    expect(result.structures).not.toContain("segment-tree")
  })

  it("recommends segment-tree for genuine in-memory range-aggregation needs", () => {
    const result = decideDataStructures(input({ features: ["time-series aggregation", "percentile queries"] }))
    expect(result.structures).toContain("segment-tree")
  })

  it("does not recommend disjoint-set for generic roles/permissions/access language", () => {
    const result = decideDataStructures(
      input({ description: "Team members have roles and permissions, with access control per workspace." }),
    )
    expect(result.structures).not.toContain("disjoint-set")
    expect(result.structures).toContain("set")
  })

  it("recommends disjoint-set for clustering / connected-components needs", () => {
    const result = decideDataStructures(input({ features: ["social graph clustering", "connected components"] }))
    expect(result.structures).toContain("disjoint-set")
  })

  it("does not recommend circular-buffer for generic logs/recent-activity language", () => {
    const result = decideDataStructures(input({ description: "Shows recent activity logs and the latest events." }))
    expect(result.structures).not.toContain("circular-buffer")
  })

  it("recommends circular-buffer for genuine streaming/telemetry needs", () => {
    const result = decideDataStructures(input({ features: ["sensor telemetry streaming", "sliding window"] }))
    expect(result.structures).toContain("circular-buffer")
  })
})
