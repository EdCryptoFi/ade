// Human-readable labels for each audit finding code.
// The code (e.g., AC_SEM_TESTE) is the stable identifier — used in CI, in the
// signals history and in `licoes add --sinal`. The label is the simple name
// shown first to the user.

export const FINDING_LABELS = {
  PROJETO_INVALIDO: 'invalid project',
  SPEC_AUSENTE: 'missing specification',
  SPEC_SEM_US: 'specification without user story',
  STATUS_INVALIDO: 'invalid specification status',
  FEATURE_DIVERGENTE: 'divergent feature name',
  SECAO_AUSENTE: 'missing required section',
  US_SEM_AC: 'story without acceptance criterion',
  AC_INCOMPLETO: 'incomplete acceptance criterion',
  AC_FORA_DE_US: 'acceptance criterion outside a story',
  AC_SEM_TESTE: 'acceptance criterion without test',
  AC_SEM_PROVA: 'acceptance criterion without proof',
  AC_SEM_TASK: 'acceptance criterion without task',
  ID_DUPLICADO: 'duplicate tracking code',
  ID_CURTO: 'tracking code too short',
  ASM_ABERTA: 'open assumption',
  ASM_STATUS_INVALIDO: 'invalid assumption status',
  ASM_ID_INVALIDO: 'assumption without valid code',
  Q_ABERTA: 'open question',
  Q_STATUS_INVALIDO: 'invalid question status',
  Q_ID_INVALIDO: 'question without valid code',
  TASK_CONCLUIDA_SEM_PROVA: 'done task without proof',
  TASK_STATUS_INVALIDO: 'invalid task status',
  TASK_SEM_STATUS: 'task without status',
  REF_QUEBRADA: 'broken reference',
  REF_MALFORMADA: 'malformed reference',
  ARQUIVO_INEXISTENTE: 'file does not exist',
  ARQUIVO_ORFAO: 'orphan code (no task)',
  TESTE_ORFAO: 'orphan test (points to a vanished criterion)',
  PROVA_FRACA: 'weak proof',
  VERIFY_OBSOLETO: 'outdated proof',
  CONSTITUICAO_AUSENTE: 'missing constitution',
  PRINCIPIO_SEM_VERIFICACAO: 'principle without verification',
  PRINCIPIO_VIOLADO: 'violated principle',
  GLOB_SEM_ARQUIVOS: 'verification looks at no files',
  NIVEL_INVALIDO: 'invalid principle level',
  VERIFICACAO_MALFORMADA: 'malformed verification',
};

export function findingLabel(code) {
  return FINDING_LABELS[code] || code.toLowerCase().replace(/_/g, ' ');
}
