import { z } from "zod"

export const ProjectInputSchema = z.object({
  description: z.string().min(3, "Description must have at least 3 characters").max(2000),
  domain: z.string().min(2, "Domain must have at least 2 characters").max(100),
  features: z.array(z.string().min(1).max(200)).min(1, "At least one feature is required").max(50, "At most 50 features allowed"),
  users: z.number().int().positive().max(1_000_000_000).optional(),
  blockchain: z.boolean().optional().default(false),
  auth: z.boolean().optional().default(false),
  upload: z.boolean().optional().default(false),
  realtime: z.boolean().optional().default(false),
  payments: z.boolean().optional().default(false),
  ai: z.boolean().optional().default(false),
  aiMemory: z.boolean().optional().default(false),
  teams: z.boolean().optional().default(false),
  multiTenant: z.boolean().optional().default(false),
  apiAccess: z.boolean().optional().default(false),
  webhooks: z.boolean().optional().default(false),
  sso: z.boolean().optional().default(false),
  auditLog: z.boolean().optional().default(false),
  featureFlags: z.boolean().optional().default(false),
  onboarding: z.boolean().optional().default(false),
  notifications: z.boolean().optional().default(false),
  dataExport: z.boolean().optional().default(false),
  search: z.boolean().optional().default(false),
  backgroundJobs: z.boolean().optional().default(false),
  cms: z.boolean().optional().default(false),
}).strict()

export const PartialProjectInputSchema = z.object({
  description: z.string().min(3).max(2000).optional(),
  domain: z.string().min(2).max(100).optional(),
  features: z.array(z.string().min(1).max(200)).max(50).optional(),
  users: z.number().int().positive().max(1_000_000_000).optional(),
  blockchain: z.boolean().optional(),
  auth: z.boolean().optional(),
  upload: z.boolean().optional(),
  realtime: z.boolean().optional(),
  payments: z.boolean().optional(),
  ai: z.boolean().optional(),
  aiMemory: z.boolean().optional(),
  teams: z.boolean().optional(),
  multiTenant: z.boolean().optional(),
  apiAccess: z.boolean().optional(),
  webhooks: z.boolean().optional(),
  sso: z.boolean().optional(),
  auditLog: z.boolean().optional(),
  featureFlags: z.boolean().optional(),
  onboarding: z.boolean().optional(),
  notifications: z.boolean().optional(),
  dataExport: z.boolean().optional(),
  search: z.boolean().optional(),
  backgroundJobs: z.boolean().optional(),
  cms: z.boolean().optional(),
}).strict()

export function validate(input: unknown) {
  const result = ProjectInputSchema.safeParse(input)
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`)
    throw new ValidationError(errors)
  }
  return result.data
}

export function validatePartial(input: unknown) {
  return PartialProjectInputSchema.partial().parse(input)
}

export class ValidationError extends Error {
  public readonly errors: string[]
  constructor(errors: string[]) {
    super(`Validation failed: ${errors.join("; ")}`)
    this.name = "ValidationError"
    this.errors = errors
  }
}
