export const OPENAPI_DOCUMENT = {
  openapi: "3.1.0",
  info: {
    title: "ADE Architecture Decision Engine API",
    version: "0.1.0",
    description: "English-only architecture analysis, security audits, and implementation blueprints.",
  },
  servers: [{ url: "https://ade-api.cryptolairbr.workers.dev" }],
  paths: {
    "/analyze": {
      post: {
        operationId: "analyzeArchitecture",
        summary: "Generate an architecture analysis or full blueprint",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ProjectInput" } } } },
        responses: {
          "200": { description: "Structured English architecture result", content: { "application/json": { schema: { $ref: "#/components/schemas/ResponseEnvelope" } } } },
          "400": { description: "Invalid input" }, "429": { description: "Rate limit exceeded" }, "500": { description: "Internal error" },
        },
      },
    },
    "/audit": {
      post: {
        operationId: "auditArchitecture",
        summary: "Generate a prioritized security audit",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ProjectInput" } } } },
        responses: { "200": { description: "Structured English security result", content: { "application/json": { schema: { $ref: "#/components/schemas/ResponseEnvelope" } } } }, "400": { description: "Invalid input" }, "429": { description: "Rate limit exceeded" }, "500": { description: "Internal error" } },
      },
    },
    "/health": { get: { operationId: "health", responses: { "200": { description: "Service health" } } } },
    "/schema": { get: { operationId: "schema", responses: { "200": { description: "Input and output schema" } } } },
  },
  components: {
    schemas: {
      ProjectInput: {
        type: "object", required: ["description", "domain", "features"], additionalProperties: false,
        properties: {
          description: { type: "string", minLength: 3, maxLength: 2000 }, domain: { type: "string", minLength: 2, maxLength: 100 }, features: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 50 }, users: { type: "integer", minimum: 1 }, mode: { type: "string", enum: ["analysis", "audit", "blueprint"], default: "blueprint" },
        },
      },
      ResponseEnvelope: { type: "object", required: ["engine", "version", "generatedAt", "language", "result"], properties: { engine: { type: "string", example: "ade" }, version: { type: "string", example: "0.1.0" }, generatedAt: { type: "string", format: "date-time" }, language: { type: "string", example: "en-US" }, result: { type: "object" } } },
    },
  },
} as const

export const LLMS_DOCUMENT = `# ADE API

ADE returns English-only architecture analysis, security audits, and full blueprints.

## Endpoints

- POST /analyze: architecture analysis or blueprint. Price target: $0.50 for analysis, $5 for blueprint.
- POST /audit: prioritized security audit. Price target: $1.00.
- GET /openapi.json: machine-readable API contract.
- GET /schema: input and output overview.
- GET /health: health check.

## Request

Send JSON with description, domain, features, optional users, and optional mode: analysis, audit, or blueprint.

## Response

Every successful response includes engine, version, generatedAt, language, and result. Result fields are summary, architecture, technologyStack, dataModel, infrastructure, components, developmentPlan, securityRisks, assumptions, nextActions, decisions, and scope.

## Limitations

Recommendations require human review. Results depend on requirement quality. A security audit is not a guarantee of security.
`
