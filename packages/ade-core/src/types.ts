export interface ProjectInput {
  description: string
  domain: string
  features: string[]
  users?: number
  blockchain?: boolean
  auth?: boolean
  upload?: boolean
  realtime?: boolean
  payments?: boolean
  ai?: boolean
  aiMemory?: boolean

  teams?: boolean
  multiTenant?: boolean
  apiAccess?: boolean
  webhooks?: boolean
  sso?: boolean
  auditLog?: boolean
  featureFlags?: boolean
  onboarding?: boolean
  notifications?: boolean
  dataExport?: boolean

  search?: boolean
  backgroundJobs?: boolean
  cms?: boolean
}

export type DomainCategory =
  | "marketplace"
  | "dashboard"
  | "saas"
  | "crm"
  | "ai-agent"
  | "landing-page"
  | "game"
  | "social-network"
  | "other"

export type DataStructure =
  | "array"
  | "hash-map"
  | "graph"
  | "tree"
  | "stack-queue"
  | "set"
  | "heap"
  | "linked-list"
  | "trie"
  | "bloom-filter"
  | "lru-cache"
  | "segment-tree"
  | "disjoint-set"
  | "circular-buffer"
  | "merkle-tree"
  | "skip-list"

export interface DataDecision {
  structures: DataStructure[]
  reasoning: string
}

export interface InfrastructureDecision {
  frontend: string
  backend: string
  database: string
  storage: string
  deploy: string
  auth: string
  analytics: string
  emails: string
  blockchain: string | null
  ai: string | null
  memory: string | null
  reasoning: Record<string, string>
}

export interface ComponentNode {
  name: string
  children?: ComponentNode[]
}

export interface ComponentDecision {
  tree: ComponentNode
  reasoning: string
}

export interface Sprint {
  name: string
  focus: string
  tasks: string[]
}

export interface DevelopmentPlan {
  sprints: Sprint[]
}

export interface PlanData {
  domain: DomainCategory
  data: DataDecision
  infrastructure: InfrastructureDecision
  components: ComponentDecision
  plan: DevelopmentPlan
}

export interface ArchitecturePlan extends PlanData {
  files: ArchitectureFiles
}

export interface ArchitectureFiles {
  "vision.md": string
  "requirements.md": string
  "implementation-plan.md": string
  "decision-log.md": string
  "risk-analysis.md": string
  "data-model.md": string
  "component-tree.md": string
  "tech-stack.md": string
  "api-design.md": string
  "security.md": string
  "deployment.md": string
  "roadmap.md": string
  "tasks.md": string
}

export interface DecisionRule {
  condition: (input: ProjectInput) => boolean
  then: string | string[]
}

export interface FeatureSuggestion {
  feature: string
  key: keyof ProjectInput
  reason: string
  recommended: boolean
}

export interface SettingsResult {
  features: FeatureSuggestion[]
  dataStructures: DataRecommendation[]
  infrastructure: InfrastructureDecision
  security: SecurityDecision
  testing: TestingDecision
  monitoring: MonitoringDecision
  cost: CostDecision
}

export interface TradeoffOption {
  name: string
  pros: string[]
  cons: string[]
  cost: "baixo" | "médio" | "alto"
  quandoUsar: string
}

export interface TradeoffDecision {
  category: string
  selected: string
  options: TradeoffOption[]
}

export interface DataRecommendation {
  structure: DataStructure
  selected: boolean
  reason: string
  alternatives?: string[]
}

export interface SecurityDecision {
  auth: { required: boolean; method: string; reason: string }
  mfa: { required: boolean; reason: string }
  encryption: { required: boolean; scope: string }
  rateLimit: { required: boolean; limit: string }
  audit: { required: boolean; reason: string }
  recommendations: string[]
}

export interface TestingDecision {
  unit: boolean
  integration: boolean
  e2e: boolean
  load: boolean
  framework: string
  recommendations: string[]
}

export interface MonitoringDecision {
  logs: boolean
  metrics: boolean
  alerts: boolean
  tracing: boolean
  dashboard: boolean
  stack: string[]
}

export interface CostDecision {
  estimatedMonthly: string
  breakdown: Record<string, number>
  recommendations: string[]
}

export type WizardStep =
  | "start"
  | "describe"
  | "features"
  | "settings"
  | "plan"
  | "done"

export interface ProjectSession {
  id: string
  description: string
  domain: string
  features: string[]
  users?: number
  confirmedSettings: Partial<SettingsResult>
  wizardStep: WizardStep
  createdAt: string
  updatedAt: string
}
