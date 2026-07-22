# Demo — when two experts disagree

The espresso example now includes two expert interviews (`raw/interviews/`): Maria, a head barista, and Jonas, a roastery trainer. They agree on most things — and directly contradict each other on three:

| Topic                    | Maria   | Jonas    |
| ------------------------ | ------- | -------- |
| Double-shot dose         | 18 g    | 20 g     |
| Extraction time          | 25–30 s | 32–38 s  |
| Brew temp (medium roast) | 92 °C   | 93–94 °C |

Most knowledge pipelines would ingest both claims and happily serve whichever one retrieval lands on. Veritas detects the disagreement, marks both facts **DISPUTED**, and shows you exactly who said what.

## Run it

```bash
npm run demo          # = veritas run --auto examples/minimal/veritas.config.json
```

**Keyless** (no API keys): the pipeline still completes end-to-end — interviews are collected with per-expert attribution, but the LLM conflict judge is skipped (noted in `out/VERIFIED.md`). Read the pre-baked keyed result in [`expected-out/`](expected-out/) instead — a committed snapshot of a real keyed run (minus the 2 MB graph.html). It caught all three planted disagreements — including the dose conflict, whose two claims landed in _different domains_ (beans vs grind) and were still paired.

**With keys** (any OpenAI/Anthropic-compatible endpoint — the example config points at OpenRouter; put the key in a `.env` **next to the config file**, i.e. `examples/minimal/.env`): the verify stage pairs suspicious facts deterministically (cross-domain IDF token overlap, capped), asks the judge tier (falls back to analyze) to rule on each pair, and writes:

- `out/conflicts.json` — machine-readable conflicts + a verdict cache (pairs are never re-judged on re-runs, so verdicts can't silently flip);
- `out/CONFLICTS.md` — human-readable: both statements, **named experts**, why they clash;
- both facts get status `DISPUTED` in `out/VERIFIED.md` and the truth ledger.

## What the assistant does with a dispute

```bash
node bin/veritas.mjs serve examples/minimal/veritas.config.json --ask "What dose for a double espresso?"
```

The answer presents **both sides with attribution** — "Maria says 18 g, Jonas says 20 g — this is disputed and unresolved" — instead of silently picking one. Contested knowledge is labeled as contested; that's the point.

## What needs a key and what doesn't

| Step                             | Keyless                                   | With key                          |
| -------------------------------- | ----------------------------------------- | --------------------------------- |
| Collect interviews (attributed)  | ✅ deterministic                          | ✅ LLM extraction, higher quality |
| Fact synthesis                   | ✅ pass-through                           | ✅ real synthesis                 |
| Conflict candidate pairing       | ✅ deterministic                          | ✅                                |
| Conflict judging                 | ⏭ skipped (cached verdicts still applied) | ✅                                |
| CONFLICTS.md / DISPUTED statuses | ✅ from cache / expected-out              | ✅ live                           |
| Cited answers on disputes        | ✅ extractive                             | ✅ generated                      |

## An unplanted catch

The three conflicts above were planted on purpose. In a separate run mixing these interviews with Wikipedia extracts, the judge also flagged a disagreement **nobody planted**: Maria's "use beans between 7 and 21 days after roast" vs Jonas's "use them within a month". Those two lines were written as _agreeing_ background facts — the pipeline noticed they give different maximum bean ages. That's the point of the tool: the conflicts you don't know about are the ones that matter.

## Adjudication — coming in v0.2

`CONFLICTS.md` already prints the resolution commands (`veritas review --resolve <conflictId> --winner <factId> --by "name"`). The `review` stage — an append-only human-decision ledger that outranks derived statuses — is the next release; see [ROADMAP.md](../../ROADMAP.md).
