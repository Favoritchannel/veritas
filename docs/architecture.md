# Architecture

veritas is a **file-based pipeline**. Every stage reads and writes plain JSON/JSONL/Markdown in a
project's `out/` directory. There is no database, no server, no hidden state — which means you can
run the whole thing, inspect any intermediate artifact, fix it, and re-run a single stage.

## The shape of the pipeline

```
config.json ──► collect ──► consolidate ──► synthesize ──► merge ──► verify ──► discover ──► rag-pack ──► graph ──► audit
                (raw)        (by-domain)     (facts/*)      (facts    (verified   (novel      (corpus)     (html)    (gate)
                                                            .json)     .json)      findings)
                                                              │           │
                                                              │           └──► expert-report.md · next-targets.md
                                                              └──► dependencies.json · hidden.json · breakpoints.json
serve ◄── rag-corpus.jsonl              health-ping ◄── serve
```

`bin/veritas.mjs` is the orchestrator. `run --auto` walks the `AUTO_ORDER`
(`collect → consolidate → synthesize → merge → verify → discover → rag-pack → graph → audit`),
stopping on the first hard error unless `--keep-going`. Any stage can also be run alone:
`veritas <stage> config.json`.

## Core library (`src/lib/`)

| Module | Responsibility |
|--------|----------------|
| `llm.mjs` | Provider-agnostic compute. `chat(tier, system, user)`, `chatJson()`, `vision()` speak both OpenAI-compatible and Anthropic-compatible APIs. 90s timeout, ret/backoff. Keys come from `process.env[tier.keyEnv]`; **no key → the call is skipped and the stage degrades**, it does not crash. |
| `project.mjs` | `loadProject(configPath)` loads config + `.env`, resolves the `out` dir relative to the config, and exposes `log()`, `tier(name)`, `outPath/readOut/writeOut`, `waveWidth`, `chunkChars`, `domains`, `language`. Every stage takes a `project`. |
| `waves.mjs` | `waves(tasks, width=3, onWave)` runs async tasks in bounded **waves** to respect rate limits; `chunk(text, size)` splits long inputs. |
| `schema.mjs` | The vocabulary: `STATUS`, `CONF_RANK`, `normalizeDomain`, `deriveStatus(fact)`, plus `uniq`/`esc` helpers. This is where "what a status means" lives. |

## Data shapes

**Raw entry** (what a collector returns, what `collect` writes to `raw-entries.json`):

```jsonc
{
  "text": "Finer grind raises extraction yield by increasing surface area.",
  "source": { "ref": "barista-guide", "title": "Barista Guide" },
  "domain": "grind",            // optional hint
  "confidence": "high",         // optional hint: high | medium | low
  "dependsOn": ["grind size"],  // optional structured hints — preserved to the graph
  "affects": ["extraction yield", "surface area"],
  "breakpoints": [], "hidden": false,
  "type": "files", "kind": "fact"   // stamped by the collector
}
```

**Fact** (what `synthesize`/`merge` produce, keyed by domain in `facts.json`):

```jsonc
{
  "statement": "Finer grind size increases extraction yield…",
  "domain": "grind",
  "dependsOn": ["grind size"], "affects": ["extraction yield", "surface area"],
  "breakpoints": ["<18% sour", "18-22% balanced", ">22% bitter"],
  "hidden": false, "confidence": "high",
  "source": { "ref": "…", "title": "…" }
}
```

**Verified fact** (`verify` adds a derived `status`, written to `verified.json`):

```jsonc
{ "...fact": "…", "status": "TRUTH" }   // TRUTH | PLAUSIBLE | NEEDS-VERIFICATION | CONTRADICTED
```

`verified.json` also carries a `tally` (counts per status) that the audit and reports read.

## How a fact becomes a graph

`merge` turns facts into a dependency graph: each entity in `dependsOn`/`affects` becomes a node,
each `dependsOn → affects` pair becomes an edge, and facts marked `hidden` produce **hidden edges**
(the ones no single source states outright). `build-graph` renders this in 3D — domains are
**nuclei**, entities are **electrons** orbiting their domain on random 3D planes, and each domain's
electrons get a distinct material (glow · metallic · foggy-sharp · crystal · energy-wire · matte).
The viewer is fully offline: three.js and 3d-force-graph are inlined into the single `graph.html`.

## Offline / keyless behavior

veritas is designed to **degrade, not fail**, when a tier has no key:

- `collect` from `files` needs no network at all (the demo path).
- `consolidate`, `merge`, `rag-pack`, `graph`, `audit` are pure and always run.
- `synthesize` falls back to carrying structured fields straight through (no LLM rewriting).
- `verify` still derives status from confidence + cross-source agreement; only the **oracle**
  cross-check needs the analyze key.
- `discover` is skipped without an analyze key + oracle.
- `serve` answers **extractively** (retrieval only) without a serve key.

This is why `npm run example` produces a full GO build with no keys configured.

## Design principles

1. **Files over state.** Everything is inspectable and re-runnable.
2. **Status is derived, never asserted.** See [verification.md](verification.md).
3. **Breadth beats cleverness.** More independent sources raise confidence more than better prompts.
4. **The gate is the contract.** Nothing is "done" until `audit` says GO.
5. **Provider-agnostic.** Any OpenAI/Anthropic-compatible endpoint; mix vendors per tier.
