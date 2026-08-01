import { describe, it, expect } from "vitest"
import { analyzeDomain } from "./domain-analysis.ts"

function input(domain: string, description: string, features: string[] = []) {
  return { description, domain, features } as any
}

describe("analyzeDomain", () => {
  it("detects marketplace", () => {
    expect(analyzeDomain(input("store", "buy and sell products", ["listing"]))).toBe("marketplace")
    expect(analyzeDomain(input("shop", "ecommerce platform", ["cart"]))).toBe("marketplace")
  })

  it("detects marketplace when the word marketplace is used", () => {
    expect(analyzeDomain(input("marketplace", "NFT marketplace for digital art", ["nft", "wallet"]))).toBe("marketplace")
  })

  it("prefers marketplace over social-network when a feed mentions marketplace", () => {
    expect(analyzeDomain(input("marketplace", "NFT marketplace with live transaction feed", ["feed", "nft"]))).toBe("marketplace")
  })

  it("detects dashboard", () => {
    expect(analyzeDomain(input("admin", "analytics dashboard with KPIs", ["charts"]))).toBe("dashboard")
    expect(analyzeDomain(input("panel", "metric monitoring", ["graph"]))).toBe("dashboard")
  })

  it("detects saas", () => {
    expect(analyzeDomain(input("myapp", "subscription platform", ["tenant"])),).toBe("saas")
  })

  it("detects ai-agent", () => {
    expect(analyzeDomain(input("bot", "autonomous AI agent", ["llm"]))).toBe("ai-agent")
  })

  it("detects social-network", () => {
    expect(analyzeDomain(input("social", "social feed with posts", ["follow"]))).toBe("social-network")
  })

  it("detects landing-page", () => {
    expect(analyzeDomain(input("site", "landing page for marketing", ["lead capture"]))).toBe("landing-page")
  })

  it("detects game", () => {
    expect(analyzeDomain(input("rpg", "multiplayer game", ["leaderboard"]))).toBe("game")
  })

  it("detects crm", () => {
    expect(analyzeDomain(input("sales", "customer pipeline", ["lead"]))).toBe("crm")
  })

  it("returns other for unknown", () => {
    expect(analyzeDomain(input("random", "something vague", []))).toBe("other")
  })
})
