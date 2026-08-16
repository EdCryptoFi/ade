import { describe, expect, it } from "vitest"
import { generateArchitecture } from "../ade.ts"
import { generateReportHtml } from "./report-html.ts"

const input = {
  description: "A SaaS inventory platform with teams and payments",
  domain: "saas",
  features: ["inventory", "teams", "payments"],
  users: 10000,
  auth: true,
  teams: true,
  multiTenant: true,
  payments: true,
  mode: "blueprint" as const,
}

describe("generateReportHtml", () => {
  it("renders a self-contained document with the key sections", () => {
    const result = generateArchitecture(input)
    const html = generateReportHtml(result, result.securityAudit, { generatedAt: "2026-08-16T00:00:00.000Z" })

    expect(html).toMatch(/^<!doctype html>/i)
    expect(html).toContain("<title>")
    expect(html).toContain('<meta name="robots" content="noindex, nofollow">')
    expect(html).toContain("Technology stack")
    expect(html).toContain("Data model")
    expect(html).toContain("Component tree")
    expect(html).toContain("Development plan")
    expect(html).toContain("Zero-Trust security audit")
    expect(html).toContain(result.infrastructure.frontend)
    expect(html).toContain(result.plan.sprints[0].tasks[0])
  })

  it("escapes attacker-controlled meta fields (LAW-10) instead of injecting raw markup", () => {
    const result = generateArchitecture(input)
    const html = generateReportHtml(result, result.securityAudit, {
      generatedAt: "2026-08-16T00:00:00.000Z",
      jobRef: "<script>alert(1)</script>",
      tier: "\"><img src=x onerror=alert(2)>",
    })

    expect(html).not.toContain("<script>alert(1)</script>")
    expect(html).not.toContain("<img src=x onerror=alert(2)>")
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;")
  })

  it("escapes the security audit target even when it echoes free-text input", () => {
    const maliciousInput = { ...input, description: `<script>document.location='//evil'</script> ${input.description}` }
    const result = generateArchitecture(maliciousInput)
    const html = generateReportHtml(result, result.securityAudit, { generatedAt: "2026-08-16T00:00:00.000Z" })

    expect(html).not.toContain("<script>document.location")
  })

  it("is deterministic for identical input", () => {
    const result = generateArchitecture(input)
    const a = generateReportHtml(result, result.securityAudit, { generatedAt: "2026-08-16T00:00:00.000Z" })
    const b = generateReportHtml(result, result.securityAudit, { generatedAt: "2026-08-16T00:00:00.000Z" })
    expect(a).toBe(b)
  })
})
