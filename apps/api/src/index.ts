import { generateArchitecture } from "@ade/core/ade"
import type { ProjectInput } from "@ade/core/types"

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

function validate(input: unknown): input is ProjectInput {
  if (typeof input !== "object" || input === null) return false
  const obj = input as Record<string, unknown>
  return (
    typeof obj.description === "string" &&
    typeof obj.domain === "string" &&
    Array.isArray(obj.features)
  )
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders })
    }

    const url = new URL(request.url)
    const path = url.pathname.replace(/\/$/, "")

    if (request.method === "GET" && path === "/health") {
      return json({ status: "ok", engine: "ade" })
    }

    if (request.method === "POST" && path === "/analyze") {
      try {
        const body = await request.json()

        if (!validate(body)) {
          return json(
            { error: "Invalid input. Required: description (string), domain (string), features (string[])" },
            400,
          )
        }

        const result = generateArchitecture(body)
        return json(result)
      } catch (err) {
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
          description: "string — project description",
          domain: "string — project domain name",
          features: "string[] — list of features",
          users: "number (optional) — expected user count",
          blockchain: "boolean (optional)",
          auth: "boolean (optional)",
          upload: "boolean (optional)",
          realtime: "boolean (optional)",
          payments: "boolean (optional)",
          ai: "boolean (optional)",
          aiMemory: "boolean (optional)",
        },
      })
    }

    return json({ error: "Not found" }, 404)
  },
}
