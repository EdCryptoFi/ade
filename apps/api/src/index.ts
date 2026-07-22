import { generateArchitecture } from "@ade/core/ade"
import { validate } from "@ade/core/validation"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: corsHeaders,
  })
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders })
    }

    const url = new URL(request.url)
    const path = url.pathname.replace(/\/$/, "")

    if (request.method === "GET" && path === "/health") {
      return json({ status: "ok", engine: "ade", version: "0.1.0" })
    }

    if (request.method === "POST" && path === "/analyze") {
      try {
        const body = await request.json()
        const input = validate(body)
        const result = generateArchitecture(input)
        return json(result)
      } catch (err) {
        if (err instanceof Error && err.name === "ValidationError") {
          return json({ error: err.message, details: (err as any).errors }, 400)
        }
        return json(
          { error: err instanceof Error ? err.message : "Internal error" },
          500,
        )
      }
    }

    if (request.method === "GET" && path === "/schema") {
      return json({
        endpoint: "POST /analyze",
        input: {
          description: "string (min 3 chars) — project description",
          domain: "string (min 2 chars) — project domain name",
          features: "string[] (min 1) — list of features",
          users: "number (optional, positive) — expected user count",
          blockchain: "boolean (optional)",
          auth: "boolean (optional)",
          upload: "boolean (optional)",
          realtime: "boolean (optional)",
          payments: "boolean (optional)",
          ai: "boolean (optional)",
          aiMemory: "boolean (optional)",
          teams: "boolean (optional)",
          multiTenant: "boolean (optional)",
          apiAccess: "boolean (optional)",
          webhooks: "boolean (optional)",
          sso: "boolean (optional)",
          auditLog: "boolean (optional)",
          featureFlags: "boolean (optional)",
          onboarding: "boolean (optional)",
          notifications: "boolean (optional)",
          dataExport: "boolean (optional)",
        },
      })
    }

    return json({ error: "Not found" }, 404)
  },
}
