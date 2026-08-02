// Capability matrix for tools WITHOUT a mechanical defect validator.
//
// Fact verified in the source code (July/2026):
//  - spec-kit (github/spec-kit): the `specify` CLI does init/scaffold/workflows.
//    The only "validate" in the code validate init options, TOML and project
//    structure — there is no spec-defect check, req→test traceability,
//    nor coverage. Tests are explicitly OPTIONAL in the tasks template.
//    => mechanical detection of spec defects: NONE.
//
// That is why this tool enters the benchmark with mechanical detection = false
// for every defect class. Not a guess: it is what the source code allows.

export const STATIC_TOOLS = {
  'spec-kit': {
    label: 'spec-kit (GitHub)',
    mechanicalValidator: false,
    detects: () => false,
    note: 'scaffolding CLI; no spec-defect validator (tests are optional in the template)',
  },
};
