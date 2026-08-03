import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { randomUUID } from "node:crypto"

import { generateArchitecture } from "@ade/core/ade"
import { generateSettings } from "@ade/core/settings"
import type { ProjectInput, ProjectSession } from "@ade/core/types"

const __dirname = dirname(fileURLToPath(import.meta.url))
const SESSIONS_PATH = join(__dirname, "..", "sessions.json")

function loadSessions(): Map<string, ProjectSession> {
  try {
    if (existsSync(SESSIONS_PATH)) {
      const data = JSON.parse(readFileSync(SESSIONS_PATH, "utf-8"))
      return new Map(Object.entries(data))
    }
  } catch (e) {
    // 🔒 SECURITY [A6/LAW-14]: never swallow — log so corrupt/untrusted
    // sessions.json is visible in server logs instead of silently lost.
    console.error(JSON.stringify({ scope: "loadSessions", level: "error", error: String(e) }))
  }
  return new Map()
}

function saveSessions(sessions: Map<string, ProjectSession>) {
  try {
    mkdirSync(dirname(SESSIONS_PATH), { recursive: true })
    writeFileSync(SESSIONS_PATH, JSON.stringify(Object.fromEntries(sessions), null, 2))
  } catch (e) {
    console.error("Failed to save sessions:", e)
  }
}

const sessions = loadSessions()

function persist() { saveSessions(sessions) }

function newId(): string {
  // 🔒 SECURITY [LAW-5]: crypto-grade session id — Math.random() is
  // predictable and would let an attacker guess/forge other sessions.
  return `proj_${randomUUID()}`
}

// 🔒 SECURITY [LAW-3]: hard length caps on any free-text input, applied
// before coercion. Mirrors the backend schema limits (validation.ts).
const MAX_DESCRIPTION = 2000
const MAX_DOMAIN = 100
const MAX_FEATURE_LEN = 200
const MAX_FEATURES = 50

function clampText(v: unknown, max: number): string {
  return String(v ?? "").slice(0, max)
}

function clampFeatures(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => String(x).slice(0, MAX_FEATURE_LEN))
    .filter(Boolean)
    .slice(0, MAX_FEATURES)
}

const server = new Server(
  { name: "ade", version: "0.1.0" },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "ade-new-session",
      description: "Starts a new project evaluation session",
      inputSchema: {
        type: "object",
        properties: {
          description: { type: "string", description: "Project description" },
          domain: { type: "string", description: "Main domain (e.g. marketplace, dashboard, saas)" },
        },
        required: ["description", "domain"],
      },
    },
    {
      name: "ade-recommend-features",
      description: "Recommends features based on the project description",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
          description: { type: "string", description: "Project description" },
          domain: { type: "string", description: "Project domain" },
        },
        required: ["sessionId", "description", "domain"],
      },
    },
    {
      name: "ade-confirm-features",
      description: "Confirms/rejects recommended features and defines the project",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
          features: {
            type: "object",
            description: "Confirmed features (true = active, false = disabled)",
            properties: {
              blockchain: { type: "boolean" },
              auth: { type: "boolean" },
              upload: { type: "boolean" },
              realtime: { type: "boolean" },
              payments: { type: "boolean" },
              ai: { type: "boolean" },
              aiMemory: { type: "boolean" },
              teams: { type: "boolean" },
              multiTenant: { type: "boolean" },
              apiAccess: { type: "boolean" },
              webhooks: { type: "boolean" },
              sso: { type: "boolean" },
              auditLog: { type: "boolean" },
              featureFlags: { type: "boolean" },
              onboarding: { type: "boolean" },
              notifications: { type: "boolean" },
              dataExport: { type: "boolean" },
              search: { type: "boolean" },
              backgroundJobs: { type: "boolean" },
              cms: { type: "boolean" },
            },
          },
          users: { type: "number", description: "Estimated number of users" },
        },
        required: ["sessionId", "features"],
      },
    },
    {
      name: "ade-settings",
      description: "Returns all settings recommendations (data, infra, security, testing, monitoring, cost)",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "ade-generate-plan",
      description: "Generates the complete architecture plan with all documents",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "ade-analyze-domain",
      description: "Analyzes the project domain based on the description",
      inputSchema: {
        type: "object",
        properties: {
          description: { type: "string", description: "Project description" },
          domain: { type: "string", description: "Suggested domain" },
          features: {
            type: "array",
            items: { type: "string" },
            description: "Feature list",
          },
        },
        required: ["description", "domain", "features"],
      },
    },
    {
      name: "ade-decide-data",
      description: "Decides which data structures to use",
      inputSchema: {
        type: "object",
        properties: {
          description: { type: "string" },
          domain: { type: "string" },
          features: { type: "array", items: { type: "string" } },
          blockchain: { type: "boolean" },
          auth: { type: "boolean" },
        },
        required: ["description", "domain", "features"],
      },
    },
    {
      name: "ade-decide-infrastructure",
      description: "Recommends infrastructure stack",
      inputSchema: {
        type: "object",
        properties: {
          domain: { type: "string" },
          description: { type: "string" },
          features: { type: "array", items: { type: "string" } },
          blockchain: { type: "boolean" },
          auth: { type: "boolean" },
          upload: { type: "boolean" },
          ai: { type: "boolean" },
          aiMemory: { type: "boolean" },
          payments: { type: "boolean" },
          teams: { type: "boolean" },
          multiTenant: { type: "boolean" },
          apiAccess: { type: "boolean" },
          webhooks: { type: "boolean" },
          sso: { type: "boolean" },
          auditLog: { type: "boolean" },
          featureFlags: { type: "boolean" },
          onboarding: { type: "boolean" },
          notifications: { type: "boolean" },
          dataExport: { type: "boolean" },
        },
        required: ["domain", "description", "features"],
      },
    },
    {
      name: "ade-decide-components",
      description: "Generates component tree based on the domain",
      inputSchema: {
        type: "object",
        properties: {
          description: { type: "string" },
          domain: { type: "string" },
          features: { type: "array", items: { type: "string" } },
          blockchain: { type: "boolean" },
          auth: { type: "boolean" },
          teams: { type: "boolean" },
          multiTenant: { type: "boolean" },
          apiAccess: { type: "boolean" },
          webhooks: { type: "boolean" },
          sso: { type: "boolean" },
          auditLog: { type: "boolean" },
          featureFlags: { type: "boolean" },
          onboarding: { type: "boolean" },
          notifications: { type: "boolean" },
          dataExport: { type: "boolean" },
          search: { type: "boolean" },
          backgroundJobs: { type: "boolean" },
          cms: { type: "boolean" },
        },
        required: ["description", "domain", "features"],
      },
    },
    {
      name: "ade-development-plan",
      description: "Generates development plan with sprints",
      inputSchema: {
        type: "object",
        properties: {
          description: { type: "string" },
          domain: { type: "string" },
          features: { type: "array", items: { type: "string" } },
          blockchain: { type: "boolean" },
          auth: { type: "boolean" },
          upload: { type: "boolean" },
          realtime: { type: "boolean" },
          payments: { type: "boolean" },
          ai: { type: "boolean" },
          aiMemory: { type: "boolean" },
          teams: { type: "boolean" },
          multiTenant: { type: "boolean" },
          apiAccess: { type: "boolean" },
          webhooks: { type: "boolean" },
          sso: { type: "boolean" },
          auditLog: { type: "boolean" },
          featureFlags: { type: "boolean" },
          onboarding: { type: "boolean" },
          notifications: { type: "boolean" },
          dataExport: { type: "boolean" },
          search: { type: "boolean" },
          backgroundJobs: { type: "boolean" },
          cms: { type: "boolean" },
        },
        required: ["description", "domain", "features"],
      },
    },
    {
      name: "ade-full-architecture",
      description: "Generates complete architecture in a single step",
      inputSchema: {
        type: "object",
        properties: {
          description: { type: "string", description: "Project description" },
          domain: { type: "string", description: "Project domain" },
          features: {
            type: "array",
            items: { type: "string" },
            description: "Project features",
          },
          users: { type: "number", description: "Estimated number of users" },
          blockchain: { type: "boolean" },
          auth: { type: "boolean" },
          upload: { type: "boolean" },
          realtime: { type: "boolean" },
          payments: { type: "boolean" },
          ai: { type: "boolean" },
          aiMemory: { type: "boolean" },
          teams: { type: "boolean" },
          multiTenant: { type: "boolean" },
          apiAccess: { type: "boolean" },
          webhooks: { type: "boolean" },
          sso: { type: "boolean" },
          auditLog: { type: "boolean" },
          featureFlags: { type: "boolean" },
          onboarding: { type: "boolean" },
          notifications: { type: "boolean" },
          dataExport: { type: "boolean" },
          search: { type: "boolean" },
          backgroundJobs: { type: "boolean" },
          cms: { type: "boolean" },
        },
        required: ["description", "domain", "features"],
      },
    },
    {
      name: "ade-security-audit",
      description: "Zero-Trust security audit: 15 laws, 12 attack vectors, 10 vibe coding anti-patterns, scorecard and Security TDD",
      inputSchema: {
        type: "object",
        properties: {
          description: { type: "string", description: "Project description" },
          domain: { type: "string", description: "Project domain" },
          features: { type: "array", items: { type: "string" }, description: "Project features" },
          users: { type: "number", description: "Estimated number of users" },
          blockchain: { type: "boolean" },
          auth: { type: "boolean" },
          upload: { type: "boolean" },
          realtime: { type: "boolean" },
          payments: { type: "boolean" },
          ai: { type: "boolean" },
          aiMemory: { type: "boolean" },
          teams: { type: "boolean" },
          multiTenant: { type: "boolean" },
          apiAccess: { type: "boolean" },
          webhooks: { type: "boolean" },
          sso: { type: "boolean" },
          auditLog: { type: "boolean" },
          featureFlags: { type: "boolean" },
          onboarding: { type: "boolean" },
          notifications: { type: "boolean" },
          dataExport: { type: "boolean" },
          search: { type: "boolean" },
          backgroundJobs: { type: "boolean" },
          cms: { type: "boolean" },
        },
        required: ["description", "domain", "features"],
      },
    },
    {
      name: "ade-session-status",
      description: "Returns the current session state",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "ade-tradeoffs",
      description: "Analyzes alternatives for each infrastructure decision (frontend, database, auth, payments, deploy, AI)",
      inputSchema: {
        type: "object",
        properties: {
          description: { type: "string" },
          domain: { type: "string" },
          features: { type: "array", items: { type: "string" } },
          blockchain: { type: "boolean" },
          auth: { type: "boolean" },
          sso: { type: "boolean" },
        },
        required: ["description", "domain", "features"],
      },
    },
    {
      name: "ade-scaffold",
      description: "Generates the real project files (package.json, tsconfig, layout, prisma schema, .env.example) based on the architecture plan",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "ade-wizard",
      description: "Step-by-step assistant that guides the user from idea to complete project. Use step='start' to begin",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { type: "string", description: "Session ID (omit to start a new one)" },
          step: {
            type: "string",
            enum: ["start", "describe", "features", "settings", "plan", "next"],
            description: "Current wizard step",
          },
          description: { type: "string", description: "Project description" },
          domain: { type: "string", description: "Project domain" },
          features: {
            type: "object",
            description: "Confirmed features (true=active, false=disabled)",
          },
          users: { type: "number", description: "Estimated number of users" },
        },
        required: ["step"],
      },
    },
    {
      name: "ade-spec-audit",
      description: "Spec-driven audit: cross-checks spec ↔ tasks ↔ tests ↔ code ↔ constitution of a project (exit code 1 = drift). Points to .spec/ root of an onp-spec project.",
      inputSchema: {
        type: "object",
        properties: {
          rootDir: { type: "string", description: "Project root directory containing .spec/ and onpspec.config.json" },
          ci: { type: "boolean", description: "CI mode: escalates warnings to errors (AC_SEM_PROVA, TASK_CONCLUIDA_SEM_PROVA, ...)" },
        },
        required: ["rootDir"],
      },
    },
    {
      name: "ade-spec-status",
      description: "Spec-driven status: overview of features, acceptance criteria with proof, open assumptions and questions of an onp-spec project",
      inputSchema: {
        type: "object",
        properties: {
          rootDir: { type: "string", description: "Project root directory containing .spec/" },
        },
        required: ["rootDir"],
      },
    },
    {
      name: "ade-spec-scaffold",
      description: "Spec-driven scaffold: generates one failing test per acceptance criterion without test yet (TDD skeleton)",
      inputSchema: {
        type: "object",
        properties: {
          rootDir: { type: "string", description: "Project root directory containing .spec/" },
          feature: { type: "string", description: "Feature name (directory under .spec/features/)" },
          force: { type: "boolean", description: "Regenerate even if the test file already exists" },
        },
        required: ["rootDir", "feature"],
      },
    },
  ],
}))

function buildInput(params: Record<string, unknown>): ProjectInput {
  return {
    description: clampText(params.description, MAX_DESCRIPTION),
    domain: clampText(params.domain, MAX_DOMAIN),
    features: clampFeatures(params.features),
    users: typeof params.users === "number" && Number.isFinite(params.users) ? params.users : undefined,
    blockchain: !!params.blockchain,
    auth: !!params.auth,
    upload: !!params.upload,
    realtime: !!params.realtime,
    payments: !!params.payments,
    ai: !!params.ai,
    aiMemory: !!params.aiMemory,
    teams: !!params.teams,
    multiTenant: !!params.multiTenant,
    apiAccess: !!params.apiAccess,
    webhooks: !!params.webhooks,
    sso: !!params.sso,
    auditLog: !!params.auditLog,
    featureFlags: !!params.featureFlags,
    onboarding: !!params.onboarding,
    notifications: !!params.notifications,
    dataExport: !!params.dataExport,
    search: !!params.search,
    backgroundJobs: !!params.backgroundJobs,
    cms: !!params.cms,
  }
}

// 🔒 SECURITY [LAW-5]: session ids are opaque tokens — only accept the
// generated format, reject anything else (path traversal / junk lookups).
const SESSION_ID_RE = /^proj_[0-9a-f-]{36}$/

function sessionIdOf(v: unknown): string | null {
  const s = String(v ?? "")
  return SESSION_ID_RE.test(s) ? s : null
}

const featureKeys = [
  "blockchain", "auth", "upload", "realtime", "payments", "ai", "aiMemory",
  "teams", "multiTenant", "apiAccess", "webhooks", "sso", "auditLog",
  "featureFlags", "onboarding", "notifications", "dataExport",
  "search", "backgroundJobs", "cms",
] as const

function sessionToPartialInput(session: ProjectSession): Partial<ProjectInput> {
  const input: Partial<ProjectInput> = {
    description: session.description,
    domain: session.domain,
    features: session.features,
    users: session.users,
  }
  for (const key of featureKeys) {
    (input as Record<string, unknown>)[key] = session.features.includes(key)
  }
  return input
}

function sessionToFullInput(session: ProjectSession): ProjectInput {
  return {
    ...sessionToPartialInput(session),
    users: session.users ?? 0,
  } as ProjectInput
}

// 🔒 SECURITY [LAW-5/LAW-2]: resolves a session id from tool args, rejecting
// anything that isn't a generated id. Throws a safe, generic error.
function getSession(args: Record<string, unknown>, label: string): ProjectSession {
  const id = sessionIdOf(args.sessionId)
  if (!id) throw new Error(`Invalid ${label}: expected a valid session id`)
  const session = sessions.get(id)
  if (!session) throw new Error(`Session ${id} not found`)
  return session
}

// 🔒 SECURITY [LAW-2]: only known feature keys can be enabled; unknown keys
// are rejected instead of silently accepted (mass assignment protection).
function sanitizeFeatureFlags(v: unknown): string[] {
  if (!v || typeof v !== "object") return []
  const known = new Set(featureKeys)
  for (const key of Object.keys(v as Record<string, unknown>)) {
    if (!known.has(key as (typeof featureKeys)[number])) {
      throw new Error(`Unknown feature: ${key}`)
    }
  }
  return Object.entries(v as Record<string, boolean>)
    .filter(([, val]) => val === true)
    .map(([k]) => k)
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params

  try {
    switch (name) {
      case "ade-new-session": {
        const id = newId()
        const session: ProjectSession = {
          id,
          description: String(args.description ?? ""),
          domain: String(args.domain ?? ""),
          features: [],
          confirmedSettings: {},
          wizardStep: "describe",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        sessions.set(id, session)
        persist()

        const settings = generateSettings({
          description: session.description,
          domain: session.domain,
        })

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ sessionId: id, settings: { features: settings.features } }, null, 2),
          }],
        }
      }

      case "ade-recommend-features": {
        const session = getSession(args, "session")
        const description = String(args.description ?? session?.description ?? "")
        const domain = String(args.domain ?? session?.domain ?? "")
        const settings = generateSettings({ description, domain })

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ features: settings.features }, null, 2),
          }],
        }
      }

      case "ade-confirm-features": {
        const session = getSession(args, "session")
        const sessionId = session.id

        const features = sanitizeFeatureFlags(args.features)
        session.features = features
        session.users = typeof args.users === "number" ? args.users : undefined
        session.updatedAt = new Date().toISOString()
        persist()

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ sessionId, features: session.features, users: session.users }, null, 2),
          }],
        }
      }

      case "ade-settings": {
        const session = getSession(args, "session")
        const sessionId = session.id

        const input = sessionToPartialInput(session)
        const settings = generateSettings(input)
        session.confirmedSettings = settings
        session.updatedAt = new Date().toISOString()
        persist()

        return {
          content: [{
            type: "text",
            text: JSON.stringify(settings, null, 2),
          }],
        }
      }

      case "ade-generate-plan": {
        const session = getSession(args, "session")
        const sessionId = session.id

        const input = sessionToFullInput(session)
        const plan = generateArchitecture(input)

        return {
          content: [{
            type: "text",
            text: JSON.stringify(plan, null, 2),
          }],
        }
      }

      case "ade-analyze-domain": {
        const input = buildInput(args)
        const { analyzeDomain } = await import("@ade/core/domain-analysis")
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ domain: analyzeDomain(input) }, null, 2),
          }],
        }
      }

      case "ade-decide-data": {
        const input = buildInput(args)
        const { decideDataStructures } = await import("@ade/core/data-decision")
        return {
          content: [{
            type: "text",
            text: JSON.stringify(decideDataStructures(input), null, 2),
          }],
        }
      }

      case "ade-decide-infrastructure": {
        const input = buildInput(args)
        const { decideInfrastructure } = await import("@ade/core/infrastructure-decision")
        return {
          content: [{
            type: "text",
            text: JSON.stringify(decideInfrastructure(input), null, 2),
          }],
        }
      }

      case "ade-decide-components": {
        const input = buildInput(args)
        const { analyzeDomain } = await import("@ade/core/domain-analysis")
        const { decideComponents } = await import("@ade/core/component-decision")
        const domain = analyzeDomain(input)
        return {
          content: [{
            type: "text",
            text: JSON.stringify(decideComponents(input, domain), null, 2),
          }],
        }
      }

      case "ade-development-plan": {
        const input = buildInput(args)
        const { analyzeDomain } = await import("@ade/core/domain-analysis")
        const { generatePlan } = await import("@ade/core/development-plan")
        const domain = analyzeDomain(input)
        return {
          content: [{
            type: "text",
            text: JSON.stringify(generatePlan(input, domain), null, 2),
          }],
        }
      }

      case "ade-full-architecture": {
        const input = buildInput(args)
        const result = generateArchitecture(input)
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        }
      }

      case "ade-security-audit": {
        const input = buildInput(args)
        const { runSecurityAudit } = await import("@ade/core/security-audit")
        const result = runSecurityAudit(input)
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        }
      }

      case "ade-session-status": {
        const session = getSession(args, "session")
        return {
          content: [{
            type: "text",
            text: JSON.stringify(session, null, 2),
          }],
        }
      }

      case "ade-tradeoffs": {
        const input = buildInput(args)
        const { analyzeTradeoffs } = await import("@ade/core/settings")
        return {
          content: [{
            type: "text",
            text: JSON.stringify(analyzeTradeoffs(input), null, 2),
          }],
        }
      }

      case "ade-scaffold": {
        const session = getSession(args, "session")
        const input = sessionToFullInput(session)
        const { generateArchitecture } = await import("@ade/core/ade")
        const { generateScaffold } = await import("@ade/core/scaffold")
        const plan = generateArchitecture(input)
        const files = generateScaffold(plan)
        return {
          content: files.map(f => ({
            type: "text",
            text: `=== ${f.path} ===\n${f.content}`,
          })),
        }
      }

      case "ade-wizard": {
        const step = String(args.step ?? "start")
        const { generateSettings, analyzeTradeoffs } = await import("@ade/core/settings")
        const { generateScaffold } = await import("@ade/core/scaffold")

        if (step === "start" || (step === "next" && !args.sessionId)) {
          const id = newId()
          const session: ProjectSession = {
            id, description: "", domain: "", features: [],
            confirmedSettings: {}, wizardStep: "describe",
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          }
          sessions.set(id, session)
          persist()
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                sessionId: id,
                wizardStep: "describe",
                message: "Describe your project. What is the goal? What is the domain? (e.g. marketplace, dashboard, saas)",
                hint: "Ex: 'I want to build an NFT marketplace for digital art on Sui'",
              }, null, 2),
            }],
          }
        }

        const session = getSession(args, "session")
        const sessionId = session.id

        if (step === "describe" || (step === "next" && session.wizardStep === "describe")) {
          session.description = clampText(args.description ?? session.description, MAX_DESCRIPTION)
          session.domain = clampText(args.domain ?? session.domain, MAX_DOMAIN)
          session.wizardStep = "features"
          session.updatedAt = new Date().toISOString()
          persist()

          const settings = generateSettings({
            description: session.description,
            domain: session.domain,
          })

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                sessionId,
                wizardStep: "features",
                message: "Here are the recommended features for your project. Confirm which ones you want (true=yes, false=no).",
                recommendedFeatures: settings.features,
                users: { type: "number", description: "How many users do you expect?" },
                hint: "e.g. Pass an object features with { blockchain: true, auth: false, ... }",
              }, null, 2),
            }],
          }
        }

        if (step === "features" || (step === "next" && session.wizardStep === "features")) {
          if (args.features) session.features = sanitizeFeatureFlags(args.features)
          if (typeof args.users === "number" && Number.isFinite(args.users)) session.users = args.users
          session.wizardStep = "settings"
          session.updatedAt = new Date().toISOString()
          persist()

          const input = sessionToPartialInput(session)
          const settings = generateSettings(input)
          session.confirmedSettings = settings

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                sessionId,
                wizardStep: "settings",
                message: "Recommended settings for your project. Review and confirm.",
                settings,
                tradeoffs: analyzeTradeoffs(input),
                nextStep: "Call ade-wizard with step='plan' or step='next' to generate the complete plan",
              }, null, 2),
            }],
          }
        }

        if (step === "plan" || step === "next") {
          session.wizardStep = "done"
          session.updatedAt = new Date().toISOString()
          persist()
          const input = sessionToFullInput(session)
          const { generateArchitecture } = await import("@ade/core/ade")
          const plan = generateArchitecture(input)
          const files = generateScaffold(plan)

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  sessionId,
                  wizardStep: "done",
                  message: "Complete architecture plan!",
                  summary: {
                    domain: plan.domain,
                    dataStructures: plan.data.structures,
                    infrastructure: {
                      frontend: plan.infrastructure.frontend,
                      database: plan.infrastructure.database,
                      auth: plan.infrastructure.auth,
                      deploy: plan.infrastructure.deploy,
                    },
                    features: session.features,
                    totalComponents: plan.components.tree.children?.length ?? 0,
                  },
                  nextSteps: [
                    "Use ade-settings to view detailed recommendations",
                    "Use ade-tradeoffs to compare alternatives",
                    "Use ade-scaffold to generate the project files",
                    "Use ade-full-architecture for all documents",
                  ],
                }, null, 2),
              },
              ...files.slice(0, 3).map(f => ({
                type: "text" as const,
                text: `=== ${f.path} ===\n${f.content}`,
              })),
            ],
          }
        }

        throw new Error(`Unknown wizard step: ${step}`)
      }

      case "ade-spec-audit": {
        const rootDir = String(args.rootDir)
        const onp = await import("@ade/onp-spec")
        const { loadConfig, loadProject, auditProject } = onp
        let config
        try {
          config = loadConfig(rootDir)
        } catch (err) {
          return { isError: true, content: [{ type: "text", text: String(err) }] }
        }
        const project = loadProject(config)
        const result = auditProject(project, { ci: args.ci === true })
        return {
          content: [{
            type: "text",
            text: JSON.stringify(
              {
                ok: result.ok,
                exitCode: result.exitCode,
                stats: result.stats,
                findings: result.findings,
                project: { errors: project.errors },
              },
              null, 2,
            ),
          }],
        }
      }

      case "ade-spec-status": {
        const rootDir = String(args.rootDir)
        const onp = await import("@ade/onp-spec")
        const { loadConfig, loadProject, auditProject } = onp
        const config = loadConfig(rootDir)
        const project = loadProject(config)
        const result = auditProject(project)
        return {
          content: [{
            type: "text",
            text: JSON.stringify(
              {
                ok: result.ok,
                stats: result.stats,
                errors: project.errors,
              },
              null, 2,
            ),
          }],
        }
      }

      case "ade-spec-scaffold": {
        const rootDir = String(args.rootDir)
        const feature = String(args.feature)
        const onp = await import("@ade/onp-spec")
        const { loadConfig, loadProject, scaffoldTests } = onp
        const config = loadConfig(rootDir)
        const project = loadProject(config)
        try {
          const out = scaffoldTests(project, feature, { force: args.force === true })
          return {
            content: [{
              type: "text",
              text: typeof out === "string" ? out : JSON.stringify(out, null, 2),
            }],
          }
        } catch (err) {
          return { isError: true, content: [{ type: "text", text: String(err) }] }
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (err) {
    // 🔒 SECURITY [LAW-14/A6]: log the full detail server-side with tool
    // context; return a safe message to the model (no stack traces / internals).
    const message = err instanceof Error ? err.message : String(err)
    console.error(JSON.stringify({ scope: "tool", level: "error", tool: name, error: { name: err instanceof Error ? err.name : "Unknown", message } }))
    return {
      isError: true,
      content: [{ type: "text", text: `Error: ${message}` }],
    }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(console.error)
