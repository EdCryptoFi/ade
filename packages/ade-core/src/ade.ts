import type { ArchitectureFiles, ProjectInput } from "./types.ts"
import { analyzeDomain } from "./domain-analysis.ts"
import { decideDataStructures } from "./data-decision.ts"
import { decideInfrastructure } from "./infrastructure-decision.ts"
import { decideComponents } from "./component-decision.ts"
import { generatePlan } from "./development-plan.ts"
import { runDecisionEngine } from "./decision-engine.ts"
import { getKnowledgeGraph } from "./knowledge-graph.ts"
import { generateAllFiles } from "./templates/index.ts"
import { generateSettings } from "./settings.ts"

export function generateArchitecture(input: ProjectInput) {
  const settings = generateSettings(input)
  const domain = analyzeDomain(input)
  const data = decideDataStructures(input)
  const infrastructure = decideInfrastructure(input)
  const components = decideComponents(input, domain)
  const plan = generatePlan(input, domain)
  const decisions = runDecisionEngine(input)
  const graph = getKnowledgeGraph(domain)

  const base = { domain, data, infrastructure, components, plan }

  const files: ArchitectureFiles = generateAllFiles(base)

  return {
    ...base,
    settings,
    files,
    decisions,
    graph,
  }
}
