// Benchmark scenarios — REAL specs from the ONP domain (Vitor Manoel's
// programming course) with seeded defects, each representing a failure that
// really plagues spec-driven projects.
//
// Each scenario describes the SAME feature neutrally; the adapters materialize
// it in each tool's format. The `defectClass` column is the axis of comparison:
// how many tools detect each class mechanically.

// Defect classes (what really goes wrong)
export const DEFECT_CLASSES = {
  BASELINE_LIMPO: 'correct spec — no tool may raise a false positive',
  REQ_SEM_TESTE: 'requirement with no test proving it (drift #1 of SDD)',
  TESTE_ORFAO: 'requirement renamed; test left behind pointing at old ID',
  REQ_INCOMPLETO: 'requirement with no observable behavior (no Given/When/Then)',
  PRONTO_PREMATURO: 'task marked done without proof of a passing test',
  SUPOSICAO_SILENCIOSA: 'product decision assumed without explicit record',
  PRIVACIDADE_VIOLADA: 'student grade exposed / PII in log — violates the constitution',
  CODIGO_ORFAO: 'code file that serves no requirement',
  REF_QUEBRADA: 'task references a requirement that does not exist',
  ID_DUPLICADO: 'two requirements with the same identifier',
};

// Real feature 1: class enrollment (August class of the ONP course)
const inscricaoBase = {
  feature: 'inscricao-turma',
  title: 'Class enrollment',
  purpose:
    'Allow a new student to enroll in an open class, respecting the seat limit and recording the guardian consent when the student is a minor.',
  stories: [
    {
      id: 'US-001',
      title: 'Student enrolls in an open class',
      as: 'interested visitor',
      want: 'to enroll in a class with open seats',
      so: 'I secure my seat in the course',
      acs: [
        {
          id: 'AC-001',
          title: 'Enrollment in a class with an open seat',
          given: 'an open class with available seats',
          when: 'the visitor submits a valid name, email and phone',
          then: 'the enrollment is recorded and the seat count is decremented',
        },
        {
          id: 'AC-002',
          title: 'Full class rejects enrollment',
          given: 'a class with no open seats',
          when: 'the visitor tries to enroll',
          then: 'the enrollment is refused with a class-full message',
        },
      ],
    },
  ],
  assumptions: [
    { id: 'ASM-001', text: 'Email is the student\'s unique identifier', status: 'confirmed', resolution: 'decided with the product' },
  ],
  questions: [],
  constitution: false,
};

// Real feature 2: student grades (privacy-sensitive — LGPD)
const notasBase = {
  feature: 'notas-aluno',
  title: 'Student grades',
  purpose:
    'Show each student their own grades and feedback, recording who accessed each grade, without ever exposing one student\'s grades to another.',
  stories: [
    {
      id: 'US-010',
      title: 'Student views their grades',
      as: 'authenticated student',
      want: 'to see my grades and feedback',
      so: 'I can track my progress',
      acs: [
        {
          id: 'AC-010',
          title: 'Student only sees their own grades',
          given: 'an authenticated student with recorded grades',
          when: 'they open the grades page',
          then: 'the response contains only the student\'s own grades',
        },
        {
          id: 'AC-011',
          title: 'Grade access is recorded',
          given: 'an authenticated student opening their grades',
          when: 'the grade is read',
          then: 'an audit record is written with who, what and when',
        },
      ],
    },
  ],
  assumptions: [
    { id: 'ASM-010', text: 'A teacher can see the grades of their whole class', status: 'confirmed', resolution: 'pedagogical rule' },
  ],
  questions: [],
  constitution: true, // uses the LGPD/education preset
};

// Helper: clones a base feature so a defect can be seeded without mutating the original
function clone(base) {
  return JSON.parse(JSON.stringify(base));
}

// Builds the scenarios by applying one defect over a base feature.
export const SCENARIOS = [
  {
    id: 'S00-baseline',
    defectClass: 'BASELINE_LIMPO',
    feature: clone(inscricaoBase),
    seed: () => {}, // nothing — correct spec
  },
  {
    id: 'S01-req-sem-teste',
    defectClass: 'REQ_SEM_TESTE',
    feature: clone(inscricaoBase),
    seed: (f) => {
      // AC-002 will have no annotated test (the adapter only generates a test for AC-001)
      f.__semTeste = ['AC-002'];
    },
  },
  {
    id: 'S02-teste-orfao',
    defectClass: 'TESTE_ORFAO',
    feature: clone(inscricaoBase),
    seed: (f) => {
      // renames AC-002 → AC-050 in the spec, but the test keeps @spec:AC-002
      f.stories[0].acs[1].id = 'AC-050';
      f.__testeOrfao = { specId: 'AC-050', testId: 'AC-002' };
    },
  },
  {
    id: 'S03-req-incompleto',
    defectClass: 'REQ_INCOMPLETO',
    feature: clone(inscricaoBase),
    seed: (f) => {
      // AC-002 loses the Then (no observable behavior)
      f.stories[0].acs[1].then = '';
      f.__incompleto = ['AC-002'];
    },
  },
  {
    id: 'S04-pronto-prematuro',
    defectClass: 'PRONTO_PREMATURO',
    feature: clone(inscricaoBase),
    seed: (f) => {
      // task done, but the AC's test fails (no PASS proof)
      f.__taskConcluidaComFalha = ['AC-001'];
    },
  },
  {
    id: 'S05-suposicao-silenciosa',
    defectClass: 'SUPOSICAO_SILENCIOSA',
    feature: clone(inscricaoBase),
    seed: (f) => {
      // feature "implemented" but with an open (unresolved) assumption
      f.status = 'implemented';
      f.assumptions.push({
        id: 'ASM-002',
        text: 'Enrollment cannot be canceled by the student themselves',
        status: 'open',
        resolution: '—',
      });
    },
  },
  {
    id: 'S06-privacidade-violada',
    defectClass: 'PRIVACIDADE_VIOLADA',
    feature: clone(notasBase),
    seed: (f) => {
      // leaks the grade in a log — violates P-004 of the LGPD constitution
      f.__vazamento = "console.log('student grade', nota);";
    },
  },
  {
    id: 'S07-codigo-orfao',
    defectClass: 'CODIGO_ORFAO',
    feature: clone(inscricaoBase),
    seed: (f) => {
      // a code file that no task maps to
      f.__codigoOrfao = 'src/rastreador-secreto.js';
    },
  },
  {
    id: 'S08-ref-quebrada',
    defectClass: 'REF_QUEBRADA',
    feature: clone(inscricaoBase),
    seed: (f) => {
      // task references nonexistent AC-999
      f.__refQuebrada = 'AC-999';
    },
  },
  {
    id: 'S09-id-duplicado',
    defectClass: 'ID_DUPLICADO',
    feature: clone(inscricaoBase),
    seed: (f) => {
      // duplicates the AC-001 ID across two criteria
      f.stories[0].acs[1].id = 'AC-001';
      f.__idDuplicado = 'AC-001';
    },
  },
];

// Applies the seeds once.
for (const s of SCENARIOS) s.seed(s.feature);
