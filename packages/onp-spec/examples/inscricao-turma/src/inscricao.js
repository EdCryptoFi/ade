// Implementation of the inscricao-turma feature.
// Mapped by T-001, T-002, T-003 in .spec/features/inscricao-turma/tasks.md.

export function inscrever({ turma, dados }) {
  if (turma.vagas <= 0) {
    return { ok: false, motivo: 'class is full' };
  }
  if (dados.idade < 18 && !dados.responsavel) {
    return { ok: false, motivo: 'guardian consent required' };
  }
  turma.vagas -= 1;
  return { ok: true, inscricao: { email: dados.email, turmaId: turma.id } };
}
