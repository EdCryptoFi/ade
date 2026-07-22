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
})
