// Pure, testable formatting: flattens the nested architecture JSON into a
// flat key/value map for the summary table.

export function flattenResult(obj: unknown, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key === "files" || key === "reasoning" || key === "_meta") continue
    if (typeof value === "string" || typeof value === "number" || value === null) {
      result[prefix + key] = String(value)
    } else if (Array.isArray(value)) {
      result[prefix + key] = value.join(", ")
    } else if (typeof value === "object" && value !== null) {
      Object.assign(result, flattenResult(value, prefix + key + "."))
    }
  }
  return result
}
