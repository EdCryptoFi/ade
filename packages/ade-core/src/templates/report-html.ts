import type {
  ComponentNode,
  DataStructure,
  PlanData,
  SecurityAuditResult,
  SecurityCheck,
} from "../types.ts"

/**
 * Self-contained HTML delivery report ("Blueprint" view).
 *
 * Deterministic renderer: same PlanData + SecurityAuditResult always produce
 * the same HTML. No network calls, no LLM, no client-side JS beyond a
 * `prefers-color-scheme` CSS switch. This is the artifact meant to be served
 * behind an unguessable token (see apps/api `POST /deliver` + `GET /report/:token`)
 * — never keyed by a caller-supplied or on-chain identifier (LAW-5).
 */

export interface ReportMeta {
  /** Free-text reference supplied by the caller (e.g. a marketplace job id). Untrusted — always escaped. */
  jobRef?: string
  /** Free-text pricing tier label supplied by the caller. Untrusted — always escaped. */
  tier?: string
  generatedAt: string
}

// 🔒 SECURITY [LAW-10]: every dynamic value below is user- or input-derived
// (product description excerpts, caller-supplied jobRef/tier). Escape before
// interpolating into HTML — never trust the client, even our own future selves.
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function titleCase(s: string): string {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

const DATA_STRUCTURE_INFO: Record<DataStructure, string> = {
  array: "Ordered collections — lists, feeds, history",
  "hash-map": "Key-value lookups — users, sessions, config",
  graph: "Entity relationships — accounts, permissions, flows",
  tree: "Hierarchies — categories, org charts, component trees",
  "stack-queue": "Sequential processing — undo/redo, job and webhook order",
  set: "Uniqueness guarantees — tags, permissions, whitelists",
  heap: "Prioritization — scheduling, notifications, timers",
  "linked-list": "Frequent mid-sequence insert/remove — playlists, editors",
  trie: "Prefix search and autocomplete — routing, suggestions",
  "bloom-filter": "Probabilistic membership tests — cache, spam checks",
  "lru-cache": "Recent/frequent data caching — API cache, hot data",
  "segment-tree": "Range aggregation kept in memory (most CRUD apps get this from SQL instead)",
  "disjoint-set": "Grouping and connectivity via union-find — clustering, connected components",
  "circular-buffer": "Fixed-size rolling window — streaming telemetry, recent-event ring buffers",
  "merkle-tree": "Integrity verification — snapshots, sync, versioning",
  "skip-list": "Concurrent ordered lists — leaderboards, rankings",
}

function countNodes(node: ComponentNode): number {
  return 1 + (node.children ?? []).reduce((sum, child) => sum + countNodes(child), 0)
}

function renderModuleCards(root: ComponentNode): string {
  const modules = root.children ?? []
  return modules
    .map(
      (m) => `<div class="card">
        <div class="k">${esc(m.name)}</div>
        <div class="v">${countNodes(m)}</div>
        <div class="d">${(m.children ?? []).map((c) => esc(c.name)).join(", ") || "—"}</div>
      </div>`,
    )
    .join("\n")
}

function totalComponents(root: ComponentNode): number {
  return (root.children ?? []).reduce((sum, m) => sum + countNodes(m), 0)
}

function severityChip(severity: SecurityCheck["severity"], applicable: boolean): string {
  if (!applicable) return `<span class="chip NA">N/A</span>`
  return `<span class="chip ${severity}">${severity}</span>`
}

function renderCheckRows(checks: SecurityCheck[], withLayer: boolean): string {
  return checks
    .map(
      (c) => `<tr>
        <td class="strong">${esc(c.id)}</td>
        ${withLayer ? `<td>${titleCase(c.layer)}</td>` : ""}
        <td class="wrap">${esc(c.title)}</td>
        <td>${severityChip(c.severity, c.applicable)}</td>
      </tr>`,
    )
    .join("\n")
}

function renderSprints(plan: PlanData["plan"]): string {
  return plan.sprints
    .map(
      (s) => `<div class="sprint">
        <div class="name">${esc(s.name)}</div><div class="focus">${esc(s.focus)}</div>
        <ul class="tasklist">${s.tasks.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      </div>`,
    )
    .join("\n")
}

export function generateReportHtml(plan: PlanData, audit: SecurityAuditResult, meta: ReportMeta): string {
  const domainLabel = titleCase(plan.domain)
  const taskCount = plan.plan.sprints.reduce((n, s) => n + s.tasks.length, 0)
  const total = totalComponents(plan.components.tree)
  const s = audit.scorecard
  const naLaws = audit.laws.filter((c) => !c.applicable)

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(domainLabel)} Blueprint — ADE</title>
<style>
  :root{
    --paper:#eef3f8;--surface:#ffffff;--surface-2:#e4ecf3;
    --ink:#10233d;--ink-soft:#4c6685;--ink-faint:#7d93ab;
    --accent:#1868b0;--accent-strong:#0a3d6b;
    --line:#c7d6e2;--line-strong:#9db4c7;
    --crit:#a4271f;--crit-bg:#fbe7e5;--high:#8a5210;--high-bg:#faecd6;
    --med:#7a6410;--med-bg:#f7f0d4;--low:#2f6b45;--low-bg:#e2f0e6;
    --font-display:"Helvetica Neue",Arial,sans-serif;
    --font-body:"Helvetica Neue",Arial,sans-serif;
    --font-mono:ui-monospace,"SF Mono","Cascadia Code","Roboto Mono",monospace;
  }
  @media (prefers-color-scheme: dark){
    :root:not([data-theme="light"]){
      --paper:#0a2540;--surface:#0e3459;--surface-2:#123c63;
      --ink:#e9f2fa;--ink-soft:#a9c2da;--ink-faint:#7997b7;
      --accent:#6fd3ff;--accent-strong:#a8e6ff;
      --line:rgba(255,255,255,.16);--line-strong:rgba(255,255,255,.28);
      --crit:#ff9a8f;--crit-bg:rgba(255,138,128,.14);
      --high:#ffbf6b;--high-bg:rgba(255,183,77,.14);
      --med:#ffe07d;--med-bg:rgba(255,213,79,.12);
      --low:#93d9a6;--low-bg:rgba(129,201,149,.14);
    }
  }
  :root[data-theme="dark"]{
    --paper:#0a2540;--surface:#0e3459;--surface-2:#123c63;
    --ink:#e9f2fa;--ink-soft:#a9c2da;--ink-faint:#7997b7;
    --accent:#6fd3ff;--accent-strong:#a8e6ff;
    --line:rgba(255,255,255,.16);--line-strong:rgba(255,255,255,.28);
    --crit:#ff9a8f;--crit-bg:rgba(255,138,128,.14);
    --high:#ffbf6b;--high-bg:rgba(255,183,77,.14);
    --med:#ffe07d;--med-bg:rgba(255,213,79,.12);
    --low:#93d9a6;--low-bg:rgba(129,201,149,.14);
  }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{
    background:
      repeating-linear-gradient(0deg, color-mix(in srgb, var(--accent) 6%, transparent) 0 1px, transparent 1px 88px),
      repeating-linear-gradient(90deg, color-mix(in srgb, var(--accent) 6%, transparent) 0 1px, transparent 1px 88px),
      var(--paper);
    color:var(--ink);font-family:var(--font-body);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased;
  }
  h1,h2,h3{font-family:var(--font-display);text-wrap:balance;margin:0;}
  a{color:var(--accent-strong);}
  .page{max-width:880px;margin:0 auto;padding:56px 24px 96px;}
  .titleblock{position:relative;background:var(--surface);border:1px solid var(--line-strong);padding:32px 32px 24px;margin-bottom:48px;}
  .titleblock::before,.titleblock::after,.titleblock .tick-br,.titleblock .tick-bl{content:"";position:absolute;width:14px;height:14px;border-color:var(--accent);border-style:solid;}
  .titleblock::before{top:-1px;left:-1px;border-width:2px 0 0 2px;}
  .titleblock::after{top:-1px;right:-1px;border-width:2px 2px 0 0;}
  .titleblock .tick-bl{bottom:-1px;left:-1px;border-width:0 0 2px 2px;}
  .titleblock .tick-br{bottom:-1px;right:-1px;border-width:0 2px 2px 0;}
  .eyebrow{font-family:var(--font-mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent-strong);margin-bottom:10px;}
  .titleblock h1{font-size:clamp(26px,4vw,36px);font-weight:700;letter-spacing:-.01em;color:var(--ink);}
  .titleblock .sub{color:var(--ink-soft);margin-top:10px;font-size:16px;max-width:62ch;}
  .meta-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:18px 24px;margin-top:26px;padding-top:20px;border-top:1px solid var(--line);}
  .meta-grid dt{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);}
  .meta-grid dd{margin:4px 0 0;font-family:var(--font-mono);font-size:14px;color:var(--ink);font-variant-numeric:tabular-nums;word-break:break-word;}
  section{margin-top:52px;}
  .section-head{display:flex;align-items:baseline;gap:12px;margin-bottom:18px;}
  .section-num{font-family:var(--font-mono);font-size:13px;color:var(--accent);}
  h2{font-size:22px;font-weight:700;color:var(--ink);}
  h3{font-size:16px;color:var(--ink);margin-top:32px;}
  .rule{border:none;border-top:1px solid var(--line);margin:52px 0 0;}
  p{color:var(--ink-soft);}
  p.lead{color:var(--ink);font-size:17px;max-width:64ch;}
  .grid{display:grid;gap:14px;}
  .grid.cols-2{grid-template-columns:repeat(2,1fr);}
  .grid.cols-3{grid-template-columns:repeat(3,1fr);}
  @media (max-width:640px){.grid.cols-2,.grid.cols-3{grid-template-columns:1fr;}}
  .card{background:var(--surface);border:1px solid var(--line);padding:16px 18px;}
  .card .k{font-family:var(--font-mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent-strong);}
  .card .v{margin-top:6px;font-weight:600;color:var(--ink);}
  .card .d{margin-top:4px;font-size:13.5px;color:var(--ink-soft);}
  .table-wrap{overflow-x:auto;border:1px solid var(--line);}
  table{border-collapse:collapse;width:100%;min-width:520px;font-size:14px;}
  th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--line);white-space:nowrap;}
  th{font-family:var(--font-mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint);background:var(--surface-2);}
  td{color:var(--ink-soft);}
  td.strong{color:var(--ink);font-weight:600;}
  tr:last-child td{border-bottom:none;}
  td.wrap,th.wrap{white-space:normal;}
  .chip{display:inline-block;font-family:var(--font-mono);font-size:10.5px;letter-spacing:.06em;padding:2px 8px;border-radius:2px;font-weight:600;}
  .chip.CRITICAL{color:var(--crit);background:var(--crit-bg);}
  .chip.HIGH{color:var(--high);background:var(--high-bg);}
  .chip.MEDIUM{color:var(--med);background:var(--med-bg);}
  .chip.LOW{color:var(--low);background:var(--low-bg);}
  .chip.NA{color:var(--ink-faint);background:var(--surface-2);}
  .scorecard{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);border:1px solid var(--line);margin-bottom:18px;}
  .scorecard .cell{background:var(--surface);padding:18px 16px;}
  .scorecard .num{font-family:var(--font-mono);font-size:30px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--ink);}
  .scorecard .lbl{margin-top:4px;font-family:var(--font-mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint);}
  @media (max-width:640px){.scorecard{grid-template-columns:repeat(2,1fr);}}
  .callout{border:1px solid var(--accent-strong);background:var(--surface);padding:18px 20px;display:flex;gap:14px;align-items:flex-start;}
  .callout .mark{font-family:var(--font-mono);font-size:12px;font-weight:700;color:var(--accent-strong);flex:none;}
  .callout p{margin:0;color:var(--ink);font-size:14.5px;}
  .tasklist{margin:0;padding:0;list-style:none;}
  .tasklist li{position:relative;padding-left:20px;margin-top:7px;font-size:14.5px;color:var(--ink-soft);}
  .tasklist li::before{content:"—";position:absolute;left:0;color:var(--ink-faint);}
  .sprint{border-left:2px solid var(--line-strong);padding-left:20px;margin-top:28px;}
  .sprint .name{font-family:var(--font-mono);font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent-strong);}
  .sprint .focus{font-weight:700;font-size:16px;color:var(--ink);margin-top:2px;}
  footer{margin-top:64px;padding-top:24px;border-top:1px solid var(--line-strong);display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;font-family:var(--font-mono);font-size:11.5px;color:var(--ink-faint);}
  footer a{color:var(--ink-faint);}
</style>
</head>
<body>
<div class="page">

  <div class="titleblock">
    <span class="tick-br"></span><span class="tick-bl"></span>
    <div class="eyebrow">Architecture Decision Engine · Blueprint</div>
    <h1>${esc(domainLabel)} — Architecture &amp; Security Blueprint</h1>
    <p class="sub">Domain, stack, data model, component tree, sprint plan and Zero-Trust security checklist, generated deterministically before any code was written.</p>
    <dl class="meta-grid">
      <div><dt>Domain</dt><dd>${esc(domainLabel)}</dd></div>
      <div><dt>Generated</dt><dd>${esc(meta.generatedAt.slice(0, 10))}</dd></div>
      ${meta.tier ? `<div><dt>Tier</dt><dd>${esc(meta.tier)}</dd></div>` : ""}
      ${meta.jobRef ? `<div><dt>Job ref</dt><dd>${esc(meta.jobRef)}</dd></div>` : ""}
      <div><dt>Components</dt><dd>${total}</dd></div>
      <div><dt>Tasks</dt><dd>${taskCount}</dd></div>
    </dl>
  </div>

  <section>
    <div class="section-head"><span class="section-num">01</span><h2>Executive summary</h2></div>
    <p class="lead">A ${esc(plan.domain)} architecture with ${taskCount} implementation tasks across ${plan.plan.sprints.length} sprints. Classified from the supplied description and feature signals, with a full stack, ${plan.data.structures.length}-structure data model, ${total}-component tree, and a Zero-Trust security checklist — every decision below carries a reasoning trail.</p>
  </section>

  <hr class="rule">

  <section>
    <div class="section-head"><span class="section-num">02</span><h2>Technology stack</h2></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Layer</th><th>Decision</th><th class="wrap">Reasoning</th></tr></thead>
        <tbody>
          <tr><td class="strong">Frontend</td><td>${esc(plan.infrastructure.frontend)}</td><td class="wrap">${esc(plan.infrastructure.reasoning.frontend)}</td></tr>
          <tr><td class="strong">Backend</td><td>${esc(plan.infrastructure.backend)}</td><td class="wrap">${esc(plan.infrastructure.reasoning.backend)}</td></tr>
          <tr><td class="strong">Database</td><td>${esc(plan.infrastructure.database)}</td><td class="wrap">${esc(plan.infrastructure.reasoning.database)}</td></tr>
          <tr><td class="strong">Storage</td><td>${esc(plan.infrastructure.storage)}</td><td class="wrap">${esc(plan.infrastructure.reasoning.storage)}</td></tr>
          <tr><td class="strong">Auth</td><td>${esc(plan.infrastructure.auth)}</td><td class="wrap">${esc(plan.infrastructure.reasoning.auth)}</td></tr>
          <tr><td class="strong">Deploy</td><td>${esc(plan.infrastructure.deploy)}</td><td class="wrap">${esc(plan.infrastructure.reasoning.deploy ?? "Default deploy target")}</td></tr>
          <tr><td class="strong">Emails</td><td>${esc(plan.infrastructure.emails)}</td><td class="wrap">${esc(plan.infrastructure.reasoning.emails)}</td></tr>
          <tr><td class="strong">Analytics</td><td>${esc(plan.infrastructure.analytics)}</td><td class="wrap">${esc(plan.infrastructure.reasoning.analytics)}</td></tr>
          <tr><td class="strong">CMS</td><td>${esc(plan.infrastructure.cms)}</td><td class="wrap">${esc(plan.infrastructure.reasoning.cms)}</td></tr>
          <tr><td class="strong">Blockchain</td><td>${esc(plan.infrastructure.blockchain ?? "—")}</td><td class="wrap">${esc(plan.infrastructure.reasoning.blockchain)}</td></tr>
          <tr><td class="strong">AI</td><td>${esc(plan.infrastructure.ai ?? "—")}</td><td class="wrap">${esc(plan.infrastructure.reasoning.ai)}</td></tr>
          <tr><td class="strong">Search</td><td>${esc(plan.infrastructure.search)}</td><td class="wrap">${esc(plan.infrastructure.reasoning.search)}</td></tr>
          <tr><td class="strong">Background jobs</td><td>${esc(plan.infrastructure.backgroundJobs)}</td><td class="wrap">${esc(plan.infrastructure.reasoning.backgroundJobs)}</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <hr class="rule">

  <section>
    <div class="section-head"><span class="section-num">03</span><h2>Data model — ${plan.data.structures.length} structures</h2></div>
    <p>${esc(plan.data.reasoning)}</p>
    <div class="grid cols-3">
      ${plan.data.structures.map((key) => `<div class="card"><div class="k">${esc(titleCase(key))}</div><div class="d">${esc(DATA_STRUCTURE_INFO[key] ?? "")}</div></div>`).join("\n")}
    </div>
  </section>

  <hr class="rule">

  <section>
    <div class="section-head"><span class="section-num">04</span><h2>Component tree — ${total} components</h2></div>
    <p>${esc(plan.components.reasoning)}</p>
    <div class="grid cols-3">
      ${renderModuleCards(plan.components.tree)}
    </div>
  </section>

  <hr class="rule">

  <section>
    <div class="section-head"><span class="section-num">05</span><h2>Development plan — ${plan.plan.sprints.length} sprints, ${taskCount} tasks</h2></div>
    ${renderSprints(plan.plan)}
  </section>

  <hr class="rule">

  <section>
    <div class="section-head"><span class="section-num">06</span><h2>Zero-Trust security audit</h2></div>
    <p>${audit.laws.length} immutable laws, ${audit.attackVectors.length} attack vectors, ${audit.antiPatterns.length} Vibe Coding anti-patterns — evaluated against the confirmed feature scope.</p>

    <div class="scorecard">
      <div class="cell"><div class="num">${s.critical}</div><div class="lbl">Critical found</div></div>
      <div class="cell"><div class="num">${s.high}</div><div class="lbl">High found</div></div>
      <div class="cell"><div class="num">${s.applicable}</div><div class="lbl">Applicable checks</div></div>
      <div class="cell"><div class="num">${esc(s.grade)}</div><div class="lbl">Design assessment</div></div>
    </div>

    <div class="callout">
      <span class="mark">NOTE</span>
      <p>This is a <strong>${esc(s.assessment)}</strong>, not a guarantee of production security. Applicability of a check is not proof of a vulnerability — no source code was inspected in this run. ${esc(s.summary)}</p>
    </div>

    <h3>Top priority actions</h3>
    <ol class="tasklist" style="list-style:decimal;padding-left:20px;">
      ${audit.topActions.map((a) => `<li style="padding-left:4px;">${esc(a)}</li>`).join("")}
    </ol>

    <h3>${audit.laws.length} immutable laws</h3>
    <div class="table-wrap" style="margin-top:12px;">
      <table>
        <thead><tr><th>ID</th><th>Layer</th><th class="wrap">Title</th><th>Severity</th></tr></thead>
        <tbody>${renderCheckRows(audit.laws, true)}</tbody>
      </table>
    </div>
    ${naLaws.length ? `<p style="font-size:13px;margin-top:8px;">${naLaws.map((c) => esc(c.id)).join(", ")} marked N/A: not applicable to the confirmed feature scope.</p>` : ""}

    <h3>${audit.attackVectors.length} attack vectors</h3>
    <div class="table-wrap" style="margin-top:12px;">
      <table>
        <thead><tr><th>ID</th><th class="wrap">Vector</th><th>Severity</th></tr></thead>
        <tbody>${renderCheckRows(audit.attackVectors, false)}</tbody>
      </table>
    </div>

    <h3>${audit.antiPatterns.length} Vibe Coding anti-patterns</h3>
    <div class="table-wrap" style="margin-top:12px;">
      <table>
        <thead><tr><th>ID</th><th class="wrap">Pattern</th><th>Severity</th></tr></thead>
        <tbody>${renderCheckRows(audit.antiPatterns, false)}</tbody>
      </table>
    </div>
  </section>

  <footer>
    <span>Generated deterministically by ADE — <a href="https://ade-vibe.vercel.app">ade-vibe.vercel.app</a></span>
    <span>${esc(meta.generatedAt)}</span>
  </footer>

</div>
</body>
</html>`
}
