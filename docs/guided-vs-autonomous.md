# Guided vs autonomous

veritas runs two ways. Same pipeline, different amount of hand-holding.

## Guided — a human in the loop

For a first project, an unfamiliar topic, or when you want to see each step before the next.

```bash
node bin/veritas.mjs guide                              # prints the setup checklist
node bin/veritas.mjs collect       veritas.config.json
node bin/veritas.mjs consolidate   veritas.config.json
node bin/veritas.mjs synthesize    veritas.config.json
node bin/veritas.mjs merge         veritas.config.json
node bin/veritas.mjs verify        veritas.config.json  # ← stop here, read next-targets.md
#   ...decide whether to add sources and re-collect, or continue:
node bin/veritas.mjs discover      veritas.config.json
node bin/veritas.mjs rag-pack      veritas.config.json
node bin/veritas.mjs graph         veritas.config.json
node bin/veritas.mjs audit         veritas.config.json
```

The natural pause is **after `verify`**: read `out/next-targets.md` (the completeness critic). It
tells you which domains are thin and which facts are stuck at `NEEDS-VERIFICATION`. Add sources,
re-run `collect`→`verify`, and repeat until the ledger is solid — _then_ finish the chain.

Because every stage persists to `out/`, stopping and resuming is free; you never recompute a stage
you didn't change.

## Autonomous — configure once, run to the gate

For recurring builds, CI, or an agent operating unattended.

```bash
node bin/veritas.mjs run --auto veritas.config.json
```

This walks the whole chain (`collect → … → audit`) and stops on the first hard error (or continues
past soft ones with `--keep-going`). It **ends at the audit gate**, which exits non-zero on NO-GO —
so a wrapper/CI job can treat veritas's exit code as "is this build trustworthy?"

If it stops mid-way, the fix loop is: read the failing stage's message → fix config or the offending
source → re-run **that one stage** → continue. You never restart from scratch.

## The agent flow (SKILL.md)

When veritas runs inside an AI agent, [SKILL.md](../SKILL.md) is the runbook. The agent:

1. **Detects the mode** — asks whether to walk the user through it or build unattended.
2. **Builds the config** — proposes domains, pushes hard on the oracle question (the biggest
   quality lever), gathers sources, sets the compute tiers. Keys go to `.env`, never chat.
3. **Runs the build** — narrating each stage (guided) or `run --auto` (autonomous).
4. **Audits before handover** — this is non-negotiable. On NO-GO it reports the failed checks, fixes
   the cause, and re-audits. A secret-scan hit stops everything.
5. **Serves & hands off** — smoke-tests `serve --ask`, hands over the `out/` artifacts, and offers
   health-ping for ongoing assurance.

The guardrail that matters: **the agent never claims done on a NO-GO audit or a failed serve test.**

## Which do I pick?

| You want to…                                     | Mode                             |
| ------------------------------------------------ | -------------------------------- |
| Learn the tool / explore a new topic             | Guided                           |
| See what each stage produces before continuing   | Guided                           |
| Iterate on coverage with the completeness critic | Guided                           |
| Rebuild a known knowledge base on a schedule     | Autonomous                       |
| Gate a downstream job on "is this verified?"     | Autonomous                       |
| Let an agent deliver a finished project          | Autonomous (with the audit gate) |
