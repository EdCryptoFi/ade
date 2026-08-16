import type { ArchitectureFiles, ArchitectureResponse, DecisionDetail, ProjectInput } from "./types.ts"
import { analyzeDomain } from "./domain-analysis.ts"
import { decideDataStructures } from "./data-decision.ts"
import { decideInfrastructure } from "./infrastructure-decision.ts"
import { decideComponents } from "./component-decision.ts"
import { generatePlan } from "./development-plan.ts"
import { runDecisionEngine } from "./decision-engine.ts"
import { getKnowledgeGraph } from "./knowledge-graph.ts"
import { generateAllFiles } from "./templates/index.ts"
import { generateSettings } from "./settings.ts"
import { runSecurityAudit } from "./security-audit.ts"

export function generateArchitecture(input: ProjectInput) {
  const settings = generateSettings(input)
  const domain = analyzeDomain(input)
  const data = decideDataStructures(input)
  const infrastructure = decideInfrastructure(input)
  const components = decideComponents(input, domain)
  const plan = generatePlan(input, domain)
  const engineDecisions = runDecisionEngine(input)
  const graph = getKnowledgeGraph(domain)
  const securityAudit = runSecurityAudit(input)

  const base = { domain, data, infrastructure, components, plan }

  const files: ArchitectureFiles = generateAllFiles(base, securityAudit)

  const taskCount = plan.sprints.reduce((total, sprint) => total + sprint.tasks.length, 0)
  const decisionDetails: DecisionDetail[] = [
    {
      decision: `Classify the product as ${domain}`,
      reason: "The domain has the strongest match across the project description and features.",
      alternativesRejected: ["other domains with weaker keyword matches"],
      impact: "Sets the component tree, data recommendations, and implementation focus.",
      confidence: domain === "other" ? "low" : "medium",
    },
    {
      decision: `Use ${infrastructure.frontend} with ${infrastructure.backend}`,
      reason: infrastructure.reasoning.frontend,
      alternativesRejected: ["A custom frontend stack without a clear product need"],
      impact: "Reduces setup time and keeps the first implementation cohesive.",
      confidence: "medium",
    },
    {
      decision: `Use ${data.structures.join(", ")}`,
      reason: data.reasoning,
      alternativesRejected: ["Data structures not selected by the project signals"],
      impact: "Guides storage, querying, and component behavior.",
      confidence: "medium",
    },
  ]

  const structured: ArchitectureResponse = {
    summary: `A ${domain} architecture with ${taskCount} implementation tasks across ${plan.sprints.length} sprints.`,
    architecture: {
      domain,
      label: domain.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
      rationale: "The classification is based on the supplied requirements, domain hint, and feature signals.",
    },
    technologyStack: infrastructure,
    dataModel: data,
    infrastructure,
    components,
    developmentPlan: plan,
    securityRisks: securityAudit,
    assumptions: [
      "Requirements are preliminary and may change after stakeholder review.",
      "Recommendations assume a greenfield TypeScript web application.",
      "Security findings are design-level guidance, not a guarantee of production security.",
    ],
    nextActions: [
      "Validate the domain and assumptions with the product owner.",
      "Review the top security actions before implementation.",
      `Start with ${plan.sprints[0]?.name ?? "the first sprint"} and convert its tasks into tickets.`,
    ],
    decisions: decisionDetails,
    scope: { mode: input.mode ?? "blueprint", estimatedWeeks: plan.sprints.length, sprintCount: plan.sprints.length, taskCount },
  }

  return {
    ...base,
    settings,
    files,
    decisions: engineDecisions,
    graph,
    securityAudit,
    structured,
  }
}
