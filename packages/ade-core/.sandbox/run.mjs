import { generateArchitecture } from "../src/ade.ts"
import { generateSettings, analyzeTradeoffs } from "../src/settings.ts"
import { runSecurityAudit } from "../src/security-audit.ts"
import { generateScaffold } from "../src/scaffold.ts"
import fs from "node:fs"

const input = {
  description: "SaaS para empresas de transporte: controle de pagamentos de fretes e emissão de notas fiscais eletrônicas (NFe), gestão de motoristas e frotas, conciliação de recebimentos, relatórios financeiros e compliance fiscal",
  domain: "transportes",
  users: 5000,
  auth: true,
  payments: true,
  multiTenant: true,
  realtime: true,
  apiAccess: true,
  auditLog: true,
  notifications: true,
  webhooks: true,
  sso: true,
  features: ["nfe", "frotas", "fretes", "conciliação", "compliance"],
}

const out = "/var/folders/nz/hnzp7rmx0tld_4qnzk10sm100000gn/T/opencode/sandbox-saas"

const arch = generateArchitecture(input)
fs.writeFileSync(`${out}/architecture.json`, JSON.stringify(arch, null, 2))

const settings = generateSettings(input)
fs.writeFileSync(`${out}/settings.json`, JSON.stringify(settings, null, 2))

const tradeoffs = analyzeTradeoffs(input)
fs.writeFileSync(`${out}/tradeoffs.json`, JSON.stringify(tradeoffs, null, 2))

const audit = runSecurityAudit(input)
fs.writeFileSync(`${out}/audit.json`, JSON.stringify(audit, null, 2))

const files = generateScaffold(arch)
fs.mkdirSync(`${out}/scaffold`, { recursive: true })
for (const f of files) {
  const p = `${out}/scaffold/${f.path}`
  fs.mkdirSync(p.slice(0, p.lastIndexOf("/")), { recursive: true })
  fs.writeFileSync(p, f.content)
}
console.log("=== ARCH ===")
console.log(JSON.stringify(arch, null, 2).slice(0, 3000))
