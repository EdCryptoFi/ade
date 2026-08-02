declare module "@ade/onp-spec" {
  export interface SpecConfig {
    rootDir: string
    specDir: string
    testCommand: string | null
    reporter: string
    configPath: string | null
    testGlobs: string[]
    srcGlobs: string[]
  }

  export interface AuditFinding {
    code: string
    severity: "error" | "warning"
    message: string
    [key: string]: unknown
  }

  export interface AuditStats {
    features: number
    stories: number
    acs: number
    acsWithTest: number
    acsProven: number
    assumptionsOpen: number
    questionsOpen: number
    principles: number
    errors: number
    warnings: number
  }

  export interface AuditResult {
    findings: AuditFinding[]
    ok: boolean
    exitCode: number
    stats: AuditStats
  }

  export interface Project {
    config: SpecConfig
    specRoot: string
    features: unknown[]
    constitution: unknown
    errors: string[]
  }

  export function loadConfig(rootDir: string): SpecConfig
  export function loadProject(config: SpecConfig): Project
  export function auditProject(project: Project, opts?: { ci?: boolean }): AuditResult
  export function scaffoldTests(project: Project, featureName: string, opts?: { force?: boolean }): unknown
  export function runVerify(project: Project, featureName: string): unknown
  export function renderJson(result: AuditResult): string
  export function renderTerminal(result: AuditResult): string
  export function renderMarkdown(result: AuditResult): string
}
