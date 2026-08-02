# Lessons — learning with mechanical backing

The layer that makes the project improve feature after feature without turning
into a dead log. The division that keeps it alive:

- **You (the agent) bring the judgment**: read the failure and phrase the
  general rule that would have prevented the recurrence.
- **The engine owns everything mechanical**: backing, IDs, dedup, recurrence
  by distinct feature, candidate→confirmed promotion, penalization→quarantine,
  pruning and rendering. You never do this bookkeeping by hand — and never
  edit `licoes.json`/`LICOES.md` directly.

**The gate that makes it selective**: `licoes add` only accepts a lesson that
cites a REAL signal — an audit finding or a verify failure/skip that the
engine itself recorded in `.spec/verification/sinais.json`. A lesson without a
signal is opinion and the engine refuses it (`LICAO_SEM_LASTRO`). You don't
decide alone what is worth a lesson; the history decides with you.

## Files (all owned by the engine)

| File | What it is |
|---|---|
| `.spec/verification/sinais.json` | signal history — written by `audit`/`verify`, never by you |
| `.spec/licoes.json` | canonical lessons state — mutation only via `onp-spec licoes` |
| `.spec/LICOES.md` | readable rendering — read it; never write it |

Lesson status: `candidata` (1 feature — recorded, not trusted) →
`confirmada` (recurred in 2+ distinct features — becomes a guide) →
`quarentena` (applied and the failure recurred — ignored).

## READ — in Specifying (and in Designing, if there's a design.md)

Required and cheap (fixed item ceiling, doesn't grow with the repo):

```bash
onp-spec licoes list                       # confirmed, max 10
onp-spec licoes list --escopo cobranca     # big project: filter by domain
onp-spec licoes list --query idempotencia  # or by term
```

Apply the returned lessons when writing the spec and the design. Don't load
candidates or quarantined lessons as a guide — they aren't trusted.

## WRITE — after the gate, never before

Exact moment: after `onp-spec audit --ci` exits 0. The path to 0 was recorded
by itself in the signal history — you don't need to note anything during
implementation.

1. `onp-spec licoes sugerir` — the engine points at signals that recurred in
   distinct features and still have no lesson. Start from them.
2. For each lesson worth keeping (**max 3 per feature**):

```bash
onp-spec licoes add \
  --sinal  AC_SEM_PROVA \
  --feature entrega-dever \
  --fonte  AC-042 \
  --texto  "Assert the persisted value of the status, not just the field's existence" \
  --escopo cobranca/boleto
```

3. If the engine refuses for lack of backing, the signal didn't happen here —
   the lesson doesn't exist. Don't rephrase the arguments to force it in.
4. **Clean path (audit passed first try, verify without failure) → no
   lesson.** That's the correct result, not an omission.

### How to phrase (it's what makes recurrence deduplicate)

The dedup is exact-after-normalization (lowercase, no accents, no punctuation)
— it's not semantic. Two lessons saying the same thing must READ the same:

- **The general rule, not the incident.** ✔ "Assert the persisted value of the
  status, not just the field's existence" · ✘ "The test on line 88 was weak"
- **One sentence, terse and canonical** (the engine refuses above 280
  characters).
- **One lesson per signal** — don't group.
- `--escopo` with the domain (accepts hierarchy: `cobranca/boleto`) — that's
  what makes the filter useful when the project has dozens of domains.

### When a confirmed lesson doesn't work

If you loaded a confirmed lesson in Specifying and the SAME failure still
recurred, the guidance isn't working:

```bash
onp-spec licoes penalizar --id L-007
```

Two penalties move it to quarantine. Use sparingly and only on real
recurrences.

## Scale

Designed for projects with many domains and hundreds of features:

- the history is keyed by (signal, feature, ref) — it grows with distinct
  failure points, not executions — and is compacted by window and ceiling;
- listing has a fixed ceiling: the context cost doesn't grow with the
  repository;
- candidates that don't corroborate within the window are pruned
  automatically.

## No node in the environment

Skip the lessons layer. Don't keep manual lessons bookkeeping — manual
bookkeeping is exactly the failure this layer exists to avoid. Record in text,
once, that the layer was inactive for lack of runtime.
