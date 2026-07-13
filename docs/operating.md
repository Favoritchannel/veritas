# Operating

How to run veritas day to day: the pipeline, re-running single stages, the audit gate (including functional QA of a
runtime system), the answering AI, and health-ping.

## Run the whole pipeline

```bash
veritas run --auto veritas.config.json
```

Walks `collect → consolidate → synthesize → merge → verify → discover → rag-pack → graph → audit`, stopping at the
first hard error (or continuing past soft ones with `--keep-going`). It ends at the **audit gate**, which exits
non-zero on NO-GO — so a CI job can treat veritas's exit code as "is this build trustworthy?".

## Re-run a single stage

Every stage reads and writes plain files under the project's `out/` dir, so you never restart from scratch. After a
fix, re-run just the stage you changed:

```bash
veritas verify   veritas.config.json     # re-derive the truth ledger
veritas rag-pack veritas.config.json     # rebuild the corpus after editing facts
veritas graph    veritas.config.json     # rebuild the 3D graph
veritas audit    veritas.config.json     # re-check the gate
```

The fix loop for a failed autonomous run: read the failing stage's message → fix config or the offending source →
re-run **that stage** → continue.

## The audit gate

`veritas audit` runs independent go/no-go checks and writes `out/audit-report.md`. The built-in checks:

- **artifacts** — `facts.json`, `verified.json`, `rag-corpus.jsonl`, `graph.html` all present.
- **coverage** — at least a floor of facts exist.
- **ledger** — every fact carries a truth status; the TRUTH ratio is reported.
- **rag** — the corpus is non-trivial.
- **graph** — `graph.html` rendered with content.
- **security** — a secret scan over every output file; any hit fails the gate.

Exit code is `2` on NO-GO (unless `--soft`). A secret-scan hit is a stop-everything: find it, remove it, rotate it.

### Functional QA — gating a runtime system, not just the corpus

Add a `qa` block to your config and the SAME auditor also runs functional tests over an external calculator and the
answering AI. This is how veritas gates a whole product (e.g. a builder + its assistant), not only the knowledge base.
Everything is config-driven so the tool stays generic:

```jsonc
"qa": {
  // qa:calc — run a deterministic calculator on golden fixtures; assert every expected value within tolerance.
  "calc": {
    "cmd": "node --import tsx scripts/compute-cli.mjs",   // reads one input on stdin, prints JSON of results
    "fixtures": "fixtures/qa.json",                        // [{ name, input | shareCode, expected: { key: number } }]
    "tolerance": 1
  },
  // qa:ai — the answering AI must return non-trivial, on-topic answers for canary questions (reuses serve).
  "ai": { "canaries": ["How is X computed?", "What does Y do?"] },
  // qa:drift — an external check must exit 0 (e.g. a patch-drift detector that fails on new, untriaged drift).
  "drift": { "cmd": "node scripts/drift-check.mjs" }
}
```

- **`qa.calc`** spawns `cmd` once per fixture. Short inputs can be templated with `{input}` in the command; otherwise
  the input is piped on **stdin** (so long inputs don't blow the OS command-line limit). The command must print a JSON
  object of `{ key: value }`; each `expected` key must match within `tolerance`.
- **`qa.ai`** loads the built `rag-corpus.jsonl` and runs each canary through `serve`'s `answer()`, asserting a
  non-trivial, on-topic reply.
- **`qa.drift`** runs `cmd` and passes iff it exits `0`.

Each produces `qa:calc:*`, `qa:ai:*`, `qa:drift` rows in the report and counts toward the go/no-go decision — one gate
over the corpus, the calculator, and the AI.

### Calculator-backed answering (numbers from truth, prose from RAG)

When your knowledge corpus contains numbers that can go stale (versioned data, changing APIs), do **not** let the RAG
quote them. Point the answering layer at a deterministic **calculator/oracle** for numbers and let the corpus supply
only explanation + provenance. In veritas this is the same principle as the `oracle` in verification: the authoritative
number comes from the oracle/calculator; retrieved docs carry a status (and, if you tag it, a live-currency marker) so
the answer can say *how sure* and *how current* a fact is. The `qa:calc` gate above is what proves the calculator still
returns the right numbers before you trust the AI's phrasing of them.

## Serve — ask questions

```bash
veritas serve veritas.config.json --ask "your question"   # one cited, status-tagged answer
veritas serve veritas.config.json --repl                   # interactive Q&A
```

With a `serve` tier key set, answers are synthesized and cited; keyless, serve returns the top retrieved facts verbatim
(extractive) — each already status- and source-tagged. Either way, numbers should come from your calculator/oracle,
not from the retrieved text.

## Health-ping — drift detection

```bash
veritas health-ping veritas.config.json --once     # single canary pass → out/health-last.json
veritas health-ping veritas.config.json            # loop on config.healthPing.intervalMinutes
```

Set `healthPing.enabled` and a few known-answer `canaries`. Schedule `--once` on cron / Task Scheduler and read
`out/health-last.json` for pass/fail. Because health-ping reuses the same `answer()` path as serve, a calculator-backed
answer is exercised here too — so drift detection covers both the retrieval and the numbers.
```
