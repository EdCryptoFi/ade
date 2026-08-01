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
    ["segment-tree", /range|intervalo|interval|analytics|métrica|metric|agregação|aggregation|sum|soma|média|average|mediana|median|percentil|percentile|dashboard|kpi|chart|gráfico|histograma|histogram/i, "Range queries and aggregation"],
    ["disjoint-set", /permissão|permission|grupo|group|clustering|agrupamento|social.graph|rede.social|amigo|friend|conexão|connection|rbac|role|acesso|access|comunidade|community|componentes.conexos|connected.components/i, "Grouping and connectivity"],
    ["circular-buffer", /log|logging|stream|evento|event|métrica|metric|tempo.real|realtime|telemetria|telemetry|sensor|analytics.tempo.real|rolling.window|janela.deslizante|buffer|recent|últimos|ultimos/i, "Circular buffers for streaming and logs"],
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
