import type { DataDecision, DataStructure, ProjectInput } from "./types.ts"

export function decideDataStructures(input: ProjectInput): DataDecision {
  const selected: DataStructure[] = []
  const reasons: string[] = []
  const text = `${input.domain} ${input.description} ${input.features.join(" ")}`

  const needsList = /list|feed|dashboard|histórico|history|produtos?|products?|coleção|collection|grid|table/i.test(text)
  if (needsList) {
    selected.push("array")
    reasons.push("Listas e coleções identificadas → Array")
  }

  const needsLookup = /usuário|user|wallet|sessão|session|token|config|settings|cache|key.value|busca/i.test(text) || !!input.auth
  if (needsLookup) {
    selected.push("hash-map")
    reasons.push("Busca por chave necessária → Hash Map")
  }

  const needsRelations = /relacionamento|relationship|conexão|connection|fluxo|flow|agente|agent|permissão|permission|blockchain|rede|network|social|seguir|follow|recomendação|recommendation|conhecimento|knowledge/i.test(text) || !!input.blockchain
  if (needsRelations) {
    selected.push("graph")
    reasons.push("Relacionamentos identificados → Graph")
  }

  const needsHierarchy = /categoria|category|organograma|hierarquia|hierarchy|árvore|tree|menu|navegação|navigation|diretório|directory|subcategoria|subcategory/i.test(text)
  if (needsHierarchy) {
    selected.push("tree")
    reasons.push("Dados hierárquicos → Tree")
  }

  const needsOrdering = /undo|redo|histórico|history|pilha|stack|fila|queue|processamento|processing|job|task|webhook|pipeline|rate.limit|scheduling|agendamento/i.test(text)
  if (needsOrdering) {
    selected.push("stack-queue")
    reasons.push("Processamento sequencial → Stack/Queue")
  }

  const needsUniqueness = /permissão|permission|tag|unique|único|whitelist|blacklist|filtro|filter|duplicata|duplicate|interseção|intersection|união|union/i.test(text)
  if (needsUniqueness) {
    selected.push("set")
    reasons.push("Garantia de unicidade → Set")
  }

  const needsPriority = /prioridade|priority|notificação|notification|timer|agendamento|scheduling|leaderboard|ranking|top|maior|menor|urgente/i.test(text)
  if (needsPriority) {
    selected.push("heap")
    reasons.push("Priorização necessária → Heap")
  }

  const needsSequence = /playlist|editor|navegação.entre.elementos|elementos.conectados|blockchain.chain|bloco|block|fragmentação|sequência|sequencia|encadeada|linked/i.test(text)
  if (needsSequence) {
    selected.push("linked-list")
    reasons.push("Inserção/remoção frequente → Linked List")
  }

  if (selected.length === 0) {
    selected.push("array")
    reasons.push("Estrutura padrão para coleções simples → Array")
  }

  return {
    structures: selected,
    reasoning: reasons.join("; "),
  }
}
