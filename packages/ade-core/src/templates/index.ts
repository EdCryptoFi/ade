import type { ArchitectureFiles, ComponentNode, PlanData } from "../types.ts"

function generateVision(plan: PlanData): string {
  return `# Vision

## Projeto
Aplicação do domínio **${plan.domain}** com arquitetura orientada a decisões.

## Stack Principal
- Frontend: ${plan.infrastructure.frontend}
- Backend: ${plan.infrastructure.backend}
- Database: ${plan.infrastructure.database}
- Deploy: ${plan.infrastructure.deploy}

## Estruturas de Dados
${plan.data.structures.map(s => `- ${s}`).join("\n")}

## Componentes Principais
${renderTree(plan.components.tree, 1)}
`
}

function renderTree(node: ComponentNode, depth: number): string {
  const indent = "  ".repeat(depth)
  let result = `${indent}${node.name}`
  if (node.children) {
    for (const child of node.children) {
      result += `\n${renderTree(child, depth + 1)}`
    }
  }
  return result
}

function generateRequirements(plan: PlanData): string {
  return `# Requirements

## Functional
${plan.domain === "marketplace" ? "- User can browse products\n- User can search and filter\n- User can purchase items\n- Seller can list products" : plan.domain === "dashboard" ? "- User can view KPIs\n- User can filter by date range\n- System updates in realtime" : "- User authentication\n- CRUD operations\n- Responsive design"}

## Non-functional
- Performance: < 100ms response time
- Scalability: horizontal scaling
- Security: HTTPS, CSRF, XSS protection
- Availability: 99.9% uptime

## Data
${plan.data.structures.map(s => `- Data structure: ${s}`).join("\n")}
`
}

function generateImplementationPlan(_plan: PlanData): string {
  return `# Implementation Plan

## Architecture
The project follows a layered architecture with clear separation of concerns.

## Principles
1. Single Responsibility
2. Dependency Inversion
3. Composition over Inheritance
4. Fail Fast

## Directory Structure
\`\`\`
src/
  app/          # Next.js App Router pages
  components/   # Reusable UI components
  lib/          # Business logic
  hooks/        # Custom React hooks
  types/        # TypeScript types
  utils/        # Utility functions
\`\`\`

## Code Quality
- TypeScript strict mode
- ESLint + Prettier
- Unit tests with Vitest
- E2E tests with Playwright
`
}

function generateDecisionLog(plan: PlanData): string {
  return `# Decision Log

## ADE v0.1.0

### Domain Analysis
- **Decision**: ${plan.domain}
- **Reasoning**: Classified based on input features and domain keywords

### Data Structures
- **Decision**: ${plan.data.structures.join(", ")}
- **Reasoning**: ${plan.data.reasoning}

### Infrastructure
${Object.entries(plan.infrastructure.reasoning).map(([key, val]) => `- **${key}**: ${val}`).join("\n")}

### Components
- **Template**: ${plan.components.tree.name} with ${countNodes(plan.components.tree)} components
`
}

function countNodes(node: ComponentNode): number {
  let count = 1
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child)
    }
  }
  return count
}

function generateRiskAnalysis(plan: PlanData): string {
  const risks: string[] = []
  if (plan.infrastructure.blockchain) risks.push("- **Blockchain complexity**: High learning curve, gas costs, wallet fragmentation")
  if (plan.infrastructure.ai) risks.push("- **AI integration**: LLM latency, token costs, prompt injection risks")
  if (plan.data.structures.includes("graph")) risks.push("- **Graph complexity**: Query performance with large graphs, traversal costs")

  return `# Risk Analysis

## Identified Risks
${risks.length ? risks.join("\n") : "- None identified for this scope"}

## Mitigations
- Prototype critical paths first
- Implement feature flags
- Add monitoring and observability
- Regular architecture reviews
`
}

function generateDataModel(plan: PlanData): string {
  return `# Data Model

## Structures Used
${plan.data.structures.map(s => `### ${s}\n- Purpose: ${getDataModelDescription(s, plan.domain)}`).join("\n\n")}

## Relationships
${plan.data.structures.includes("graph") ? "- Entities are connected via edges\n- Traversal queries for recommendations\n- Graph database for complex relationships" : "- Entities connected via foreign keys\n- Indexes on frequent query fields\n- Denormalization where performance critical"}
`
}

function getDataModelDescription(structure: string, domain: string): string {
  const descriptions: Record<string, Record<string, string>> = {
    array: { marketplace: "Product listings, search results", dashboard: "Metric history, event logs", default: "Ordered collections" },
    "hash-map": { marketplace: "User sessions, product cache", dashboard: "User settings, metric cache", default: "Key-value lookups" },
    graph: { marketplace: "Product recommendations, user graph", "ai-agent": "Knowledge graph, context chains", default: "Entity relationships" },
  }
  return descriptions[structure]?.[domain] ?? descriptions[structure]?.default ?? "General purpose"
}

function generateComponentTree(plan: PlanData): string {
  return `# Component Tree

\`\`\`
${renderTree(plan.components.tree, 0)}
\`\`\`

Total: ${countNodes(plan.components.tree)} components
`
}

function generateTechStack(plan: PlanData): string {
  return `# Tech Stack

## Frontend
- ${plan.infrastructure.frontend}
- Tailwind CSS
- TypeScript

## Backend
- ${plan.infrastructure.backend}

## Database
- ${plan.infrastructure.database}

## Storage
- ${plan.infrastructure.storage}

## Auth
- ${plan.infrastructure.auth}

## Deploy
- ${plan.infrastructure.deploy}

## Analytics
- ${plan.infrastructure.analytics}

## Email
- ${plan.infrastructure.emails}

${plan.infrastructure.blockchain ? `## Blockchain\n- ${plan.infrastructure.blockchain}\n` : ""}
${plan.infrastructure.ai ? `## AI\n- ${plan.infrastructure.ai}\n` : ""}
${plan.infrastructure.memory ? `## Memory\n- ${plan.infrastructure.memory}\n` : ""}
`
}

function generateApiDesign(plan: PlanData): string {
  return `# API Design

## Base URL
\`/api/v1\`

## Endpoints
${plan.domain === "marketplace" ? `- \`GET /products\` — List products
- \`GET /products/:id\` — Product details
- \`POST /products\` — Create product
- \`POST /checkout\` — Create order
- \`GET /orders\` — List orders` : plan.domain === "dashboard" ? `- \`GET /metrics\` — List metrics
- \`GET /analytics\` — Analytics data
- \`GET /reports\` — Generate report` : `- \`GET /items\` — List items
- \`GET /items/:id\` — Get item
- \`POST /items\` — Create item
- \`PUT /items/:id\` — Update item
- \`DELETE /items/:id\` — Delete item`}

## Authentication
${plan.infrastructure.auth !== "Nenhum (público)" ? "JWT via Supabase Auth" : "Public (no auth required)"}
`
}

function generateSecurity(plan: PlanData): string {
  return `# Security

## Measures
- HTTPS enforced
- CORS configured per origin
- Rate limiting on API routes
- Input validation (Zod)
- SQL injection protection (via Supabase)
- XSS prevention (React escaping)
- CSRF tokens for mutations

## Auth
${plan.infrastructure.auth !== "Nenhum (público)" ? "- JWT-based authentication\n- Row Level Security (RLS) on Supabase" : "- Public endpoints"}

## Blockchain
${plan.infrastructure.blockchain ? "- Private key management via wallet adapter\n- Transaction signing verification\n- Smart contract audit requirements" : "- N/A"}
`
}

function generateDeployment(plan: PlanData): string {
  return `# Deployment

## Platform
- **Frontend**: ${plan.infrastructure.deploy}
- **Preview Deployments**: Automatic per branch
- **Production**: Automatic on main branch

## CI/CD
- GitHub Actions for lint + typecheck + test
- Vercel for preview and production

## Monitoring
- PostHog for analytics and session replay
- Sentry for error tracking
- Vercel Analytics for performance

## Environments
- \`development\` — local
- \`staging\` — preview branch
- \`production\` — main branch
`
}

function generateRoadmap(_plan: PlanData): string {
  return `# Roadmap

## Phase 1 — Foundation (Sprint 1)
- Monorepo setup
- Core infrastructure
- Basic CI/CD

## Phase 2 — Core Features (Sprints 2-3)
- UI components and layouts
- Business logic implementation
- Database schema and queries

## Phase 3 — Advanced (Sprint 4)
- Domain-specific features
- Integrations (payments, email, realtime)

## Phase 4 — AI & Polish (Sprint 5)
- AI integration
- Testing and optimization
- Production deployment
`
}

function generateTasks(plan: PlanData): string {
  return `# Tasks

${plan.plan.sprints.map(sprint => `## ${sprint.name} — ${sprint.focus}
${sprint.tasks.map(t => `- [ ] ${t}`).join("\n")}`).join("\n\n")}
`
}

export function generateAllFiles(plan: PlanData): ArchitectureFiles {
  return {
    "vision.md": generateVision(plan),
    "requirements.md": generateRequirements(plan),
    "implementation-plan.md": generateImplementationPlan(plan),
    "decision-log.md": generateDecisionLog(plan),
    "risk-analysis.md": generateRiskAnalysis(plan),
    "data-model.md": generateDataModel(plan),
    "component-tree.md": generateComponentTree(plan),
    "tech-stack.md": generateTechStack(plan),
    "api-design.md": generateApiDesign(plan),
    "security.md": generateSecurity(plan),
    "deployment.md": generateDeployment(plan),
    "roadmap.md": generateRoadmap(plan),
    "tasks.md": generateTasks(plan),
  }
}
