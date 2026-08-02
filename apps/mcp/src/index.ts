import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

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
  } catch { /* ignore corrupt file */ }
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
  return `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
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
  ],
}))

function buildInput(params: Record<string, unknown>): ProjectInput {
  return {
    description: String(params.description ?? ""),
    domain: String(params.domain ?? ""),
    features: Array.isArray(params.features) ? params.features.map(String) : [],
    users: typeof params.users === "number" ? params.users : undefined,
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
        const session = sessions.get(String(args.sessionId))
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
        const sessionId = String(args.sessionId)
        const session = sessions.get(sessionId)
        if (!session) throw new Error(`Session ${sessionId} not found`)

        const features = args.features as Record<string, boolean>
        session.features = Object.entries(features)
          .filter(([, v]) => v)
          .map(([k]) => k)
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
        const sessionId = String(args.sessionId)
        const session = sessions.get(sessionId)
        if (!session) throw new Error(`Session ${sessionId} not found`)

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
        const sessionId = String(args.sessionId)
        const session = sessions.get(sessionId)
        if (!session) throw new Error(`Session ${sessionId} not found`)

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
        const sessionId = String(args.sessionId)
        const session = sessions.get(sessionId)
        if (!session) throw new Error(`Session ${sessionId} not found`)
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
        const sessionId = String(args.sessionId)
        const session = sessions.get(sessionId)
        if (!session) throw new Error(`Session ${sessionId} not found`)
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

        const sessionId = String(args.sessionId)
        const session = sessions.get(sessionId)
        if (!session) throw new Error(`Session ${sessionId} not found`)

        if (step === "describe" || (step === "next" && session.wizardStep === "describe")) {
          session.description = String(args.description ?? session.description)
          session.domain = String(args.domain ?? session.domain)
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
          const features = args.features as Record<string, boolean> | undefined
          if (features) {
            const activeFeatures = Object.entries(features).filter(([, v]) => v).map(([k]) => k)
            session.features = activeFeatures
          }
          if (typeof args.users === "number") session.users = args.users
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

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: String(err) }],
    }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(console.error)
