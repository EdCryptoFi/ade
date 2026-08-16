import type { DataDecision, DataStructure, ProjectInput } from "./types.ts"

export function decideDataStructures(input: ProjectInput): DataDecision {
  const selected: DataStructure[] = []
  const reasons: string[] = []
  const text = `${input.domain} ${input.description} ${input.features.join(" ")}`.toLowerCase()

  const checks: [DataStructure, RegExp, string, boolean?][] = [
    ["array", /list|feed|dashboard|histórico|history|produtos?|products?|coleção|collection|grid|table|tabela|resultados|results|logs/i, "Lists and collections"],
    ["hash-map", /usuário|user|wallet|sessão|session|token|config|settings|cache|key.value|busca|lookup|dicionário|dictionary/i, "Key lookup", !!input.auth],
    ["graph", /relacionamento|relationship|conexão|connection|fluxo|flow|agente|agent|permissão|permission|blockchain|rede|network|social|seguir|follow|recomendação|recommendation|conhecimento|knowledge|grafo/i, "Relationships between entities", !!input.blockchain],
    ["tree", /categoria|category|organograma|hierarquia|hierarchy|árvore|tree|menu|navegação|navigation|diretório|directory|subcategoria|subcategory|tag|comentário|comment|reply|resposta|thread/i, "Hierarchical data"],
    ["stack-queue", /undo|redo|histórico|history|pilha|stack|fila|queue|processamento|processing|job|task|webhook|pipeline|rate.limit|scheduling|agendamento|fifo|lifo|retry|dead.letter/i, "Sequential processing or queues"],
    ["set", /permissão|permission|tag|unique|único|whitelist|blacklist|filtro|filter|duplicata|duplicate|interseção|intersection|união|union|distinct|dedup|role|grupo|group/i, "Uniqueness guarantee"],
    ["heap", /prioridade|priority|notificação|notification|timer|agendamento|scheduling|leaderboard|ranking|top|maior|menor|urgente|deadline|fila.prioritária|priority.queue/i, "Element prioritization"],
    ["linked-list", /playlist|editor|navegação.entre.elementos|elementos.conectados|blockchain.chain|bloco|block|fragmentação|sequência|sequencia|encadeada|linked|undo.redo.chain|histórico.navegação/i, "Frequent insertion/removal in the middle"],
    ["trie", /autocomplete|autocompletar|sugestão|suggestion|busca.texto|text.search|prefixo|prefix|busca.por.prefixo|search.suggest|palavra|word|dicionário|dictionary|routing|roteamento|url.match/i, "Prefix search and autocomplete"],
    ["bloom-filter", /spam|cache|dedup|deduplicação|filtro|filter|blockchain.light|light.client|probabilístico|probabilistic|membership|existe|exists|rapido|fast.lookup|prevenção|prevention/i, "Probabilistic membership test (fast and economical)"],
    ["lru-cache", /cache|lru|session|sessão|token.refresh|api.rate|rate.limit|thumbnail|miniatura|hot.data|dados.quentes|frequente|frequent|recursos.recentes|recent|temporary/i, "Cache of frequently accessed data"],
    // 🔍 QUALITY: these three used to match on single common business words
    // (e.g. "dashboard", "analytics", "role", "group", "log" — present in
    // almost any SaaS description), so they fired on nearly every report
    // regardless of whether the product actually needs the structure. A
    // typical CRUD SaaS gets range aggregation from SQL, not a hand-rolled
    // segment tree; gets grouping from a join table, not union-find; gets
    // "recent activity" from a query with LIMIT, not a ring buffer. Narrowed
    // to phrases that signal the structure is actually load-bearing.
    ["segment-tree", /segment.tree|range.quer|percentil|percentile|histogram|histograma|time.series|série.temporal|serie.temporal|sliding.window.aggregat|rolling.window.aggregat|real.time.aggregat|agregação.em.tempo.real/i, "Range queries and aggregation kept in memory (most CRUD SaaS apps get this from SQL aggregates/window functions instead)"],
    ["disjoint-set", /disjoint.set|union.find|clustering|agrupamento.social|social.graph|rede.social|componentes.conexos|connected.components|community.detection|detecção.de.comunidade|friend.network|rede.de.amigos/i, "Grouping and connectivity via union-find"],
    ["circular-buffer", /circular.buffer|ring.buffer|streaming|stream.de.eventos|event.stream|telemetria|telemetry|sensor|sliding.window|janela.deslizante|rolling.window/i, "Fixed-size rolling window for streaming and telemetry"],
    ["merkle-tree", /blockchain|nft|integridade|integrity|verificação|verification|prova|proof|merkle|árvore.de.merkle|consistência|consistency|data.verification|versão|version|snapshot|sync|sincronização|file.integrity/i, "Data integrity verification"],
    ["skip-list", /leaderboard|ranking|ordenação|sorting|sorted|score|pontuação|nível|level|game|jogo|rank|classe|class|grade|tier|nível|level|concorrência|concurrency/i, "Concurrent sorted lists"],
  ]

  for (const [struct, regex, reason, force] of checks) {
    if (force || regex.test(text)) {
      selected.push(struct)
      reasons.push(`${reason} → ${struct}`)
    }
  }

  if (selected.length === 0) {
    selected.push("array")
    reasons.push("Default structure for simple collections → array")
  }

  return { structures: selected, reasoning: reasons.join("; ") }
}
