<div align="center">

# veritas

**Turn any topic + diverse sources into a _verified_ knowledge base with an answering AI.**

Not "another RAG wrapper." veritas treats every fact as a claim that must earn its status —
checked against cross-sources and an optional authoritative **oracle** — then packages the
result as a queryable corpus, a discovery report of connections nobody stated, and a living 3D
dependency graph. Hand-hold a newcomer step by step, or configure once and let it run to a
**go/no-go audit gate**.

[Quickstart](#quickstart) · [How it works](#how-it-works) · [The truth ledger](#the-truth-ledger) ·
[Add a source](#add-your-own-source-90-seconds) · [Guided vs autonomous](#two-ways-to-run) ·
[Security](#security--secrets) · [Cost](#cost-model) · [Docs](docs/)

</div>

---

## Why veritas exists

Most "chat with your docs" tools do three things badly:

1. **They trust everything equally.** A forum guess and a peer-reviewed number get the same weight.
2. **They only retrieve what's written.** They never surface the *implied* connections — the
   dependency two sources each half-state but neither joins.
3. **They hand you a black box.** No coverage report, no provenance, no gate that says "this is
   ready" or "this domain is thin, collect more."

veritas is built around the opposite stance: **a fact is a claim with provenance and a status,
and the system's job is to earn that status, show its work, and tell you where it's still weak.**

| | plain RAG | veritas |
|---|---|---|
| Fact status | none — all chunks equal | `TRUTH · PLAUSIBLE · NEEDS-VERIFICATION · CONTRADICTED` |
| Provenance | maybe a filename | source + confidence carried end-to-end |
| Cross-checking | none | cross-source agreement + optional **oracle** |
| Finds unstated links | no | **discover** stage (oracle × library) |
| "Is it done?" | you guess | **audit** gate (coverage, secrets, ledger, graph) |
| "What's missing?" | you guess | **completeness critic** → `next-targets.md` |
| Visual | none | **3D dependency graph** you can fly through |
| Provider lock-in | usually | any OpenAI- or Anthropic-compatible endpoint |

### Is this just another RAG / GraphRAG tool?

No — and it doesn't try to be one. LlamaIndex, LangChain and Haystack are **frameworks** you assemble; Cognee,
GraphRAG and LightRAG build a **graph of the relationships sources state**; Onyx, Verba and AnythingLLM are
**chat-with-your-docs apps**. veritas is opinionated the other way — a **verification-first pipeline**: every fact
earns a status from cross-source agreement and an optional oracle; a **discover** stage hunts for the dependencies
*no source states*; numbers come from a deterministic **calculator/oracle** so a stale document can't put a wrong
number in an answer (RAG only explains and cites); and a single **audit gate** ships-or-blocks the whole runtime —
corpus, calculator and assistant together. The individual ideas (claim verdicts, oracle-grounded abstention, graph
retrieval) show up across recent research and tools; veritas's contribution is packaging them into one turnkey,
provider-agnostic, zero-dependency tool built around a **truth ledger**.

---

## Quickstart

Runs on **Node ≥ 18**, zero required dependencies. The bundled example needs **no API keys** —
it proves the whole pipeline end-to-end offline.

```bash
git clone https://github.com/<you>/veritas.git
cd veritas
npm run example          # build the demo knowledge base → examples/minimal/out/
open examples/minimal/out/graph.html    # fly through the 3D dependency graph
```

That single command runs the full pipeline on a tiny neutral corpus (espresso brewing) and
produces a verified ledger, a RAG corpus, a rendering 3D graph, and a **GO** audit report.

Then point it at your own topic:

```bash
cp veritas.config.example.json veritas.config.json   # edit topic, domains, sources
cp .env.example .env                                 # add your API keys (gitignored)
node bin/veritas.mjs guide                            # walk the guided setup
node bin/veritas.mjs run --auto veritas.config.json  # full autonomous build
node bin/veritas.mjs serve veritas.config.json --ask "your question"
```

---

## How it works

Four phases, ten stages. Cheap models collect; strong models analyze; a runtime model serves.

```mermaid
flowchart LR
  subgraph A["① Setup (guided)"]
    cfg["topic · domains · oracle<br/>sources · compute tiers"]
  end
  subgraph B["② Build (autonomous)"]
    collect["collect<br/><i>cheap LLM + vision</i>"]
    consolidate["consolidate<br/><i>dedup · charts→data</i>"]
    synthesize["synthesize<br/><i>strong LLM · waves of N</i>"]
    merge["merge<br/><i>facts + dependency edges</i>"]
    verify["verify<br/><i>cross-source + oracle</i>"]
    discover["discover<br/><i>find unstated links</i>"]
    pack["rag-pack<br/><i>corpus.jsonl</i>"]
    graph["graph<br/><i>3D viewer</i>"]
  end
  subgraph C["③ Serve"]
    serve["answering AI<br/><i>cited · status-tagged</i>"]
  end
  subgraph D["④ Audit & operate"]
    audit["audit gate<br/><i>go / no-go</i>"]
    ping["health-ping<br/><i>drift canaries</i>"]
  end
  cfg --> collect --> consolidate --> synthesize --> merge --> verify --> discover --> pack --> graph --> audit
  pack --> serve
  audit -. green .-> serve
  serve -. periodic .-> ping
  verify -->|completeness critic| targets["next-targets.md"]
```

| # | Stage | What it does | Needs a key? |
|---|-------|--------------|:---:|
| 1 | **collect** | Pull raw entries from every configured source (web, video, chat exports, PDFs, DBs, files…). Vision reads charts/images. | per-source |
| 2 | **consolidate** | Dedup, normalize domains, keep structured fields, split docs into fact units. | no |
| 3 | **synthesize** | Strong model turns raw units into structured facts (statement · dependsOn · affects · breakpoints · hidden), in parallel **waves**. | analyze |
| 4 | **merge** | Combine per-domain facts → `facts.json` + a dependency graph (`nodes/edges`) + hidden-link and breakpoint indexes. | no |
| 5 | **verify** | Derive a status per fact from confidence + cross-source agreement; optionally cross-check against the **oracle**. Emits the truth ledger, an expert report, and `next-targets.md`. | analyze (oracle only) |
| 6 | **discover** | Oracle × library → interconnections the sources never stated → `NOVEL-FINDINGS.md`. | analyze |
| 7 | **rag-pack** | Verified facts + novel findings → `rag-corpus.jsonl` (portable, no vector DB required). | no |
| 8 | **graph** | Self-contained **3D** dependency viewer (`graph.html`) — domain nuclei, electrons on orbit, per-domain materials. | no |
| 9 | **serve** | The answering AI: keyword/TF retrieval over the corpus → cited, status-tagged answers. Extractive fallback works with no key. | serve (optional) |
| 10 | **audit** | Independent go/no-go: artifacts, coverage floor, ledger sanity, RAG size, graph renders, **secret scan**. Non-zero exit on NO-GO. | no |
| — | **health-ping** | Optional: periodically re-ask canary questions through serve to catch drift. | serve |

Every stage reads and writes plain files in the project's `out/` directory, so you can run the
whole thing (`run --auto`) or any single stage, inspect the intermediate JSON, fix, and re-run.

---

## The truth ledger

The core idea. Each fact carries **provenance + confidence + a status**:

| Status | Meaning |
|--------|---------|
| **`TRUTH`** | Corroborated — high confidence, and/or confirmed by the oracle or independent sources. |
| **`PLAUSIBLE`** | Reasonable and uncontradicted, but not independently confirmed. |
| **`NEEDS-VERIFICATION`** | Low confidence or single weak source — collect more before relying on it. |
| **`CONTRADICTED`** | Sources or the oracle disagree — surfaced, never silently dropped. |

Status is **derived**, not asserted: `verify` combines the fact's confidence, how many independent
sources carry it, and (if configured) whether the oracle confirms or refutes it. The **oracle** is
whatever you consider ground truth for your topic — a codebase, an API, a dataset, a spec. It is
optional; without it, veritas still cross-checks sources against each other. See
[docs/verification.md](docs/verification.md).

Because status is derived and provenance is carried end-to-end, `serve` can answer *"and how sure
are we?"* — every answer comes back tagged and cited, not just plausible-sounding.

---

## Add your own source (90 seconds)

A source module is one file that exports `collect(project, cfg) => rawEntry[]`. Ten ship in the
box: `web · youtube · chat-export · reddit · rss · api · github · database · pdf · files`.
Add social networks, messengers, ticketing systems, internal wikis — anything.

```js
// src/stages/collect/my-source.mjs
export async function collect(project, cfg) {
  // cfg is your source's "config" block from veritas.config.json
  const rows = await fetchSomehow(cfg.endpoint);
  return rows.map((r) => ({
    text: r.body,                       // required: the claim/among text
    source: { ref: r.url, title: r.title },
    domain: r.section,                  // optional hints…
    confidence: "medium",
    dependsOn: r.inputs, affects: r.outputs, hidden: false,
  }));
}
```

Then reference it in config — `{ "type": "my-source", "config": { "endpoint": "…" } }` — and it
joins the pipeline. Full contract, vision helpers, and graceful-degradation rules in
[docs/source-modules.md](docs/source-modules.md).

---

## Two ways to run

| | **Guided** | **Autonomous** |
|---|---|---|
| For | first project, exploring a new topic | recurring builds, CI, agents |
| Command | `veritas guide` then stage by stage | `veritas run --auto config.json` |
| Behavior | explains each step, stops at the completeness critic to tell you what to collect next | runs collect→…→audit unattended, stops only on a hard error or a NO-GO gate |
| Best paired with | a human in the loop | the audit gate + health-ping |

When veritas runs **inside an agent** (see [SKILL.md](SKILL.md)), the agent turns the guided
checklist into real questions, or — once sources are configured — runs autonomously and hands back
the finished project only after the auditor returns GO. See
[docs/guided-vs-autonomous.md](docs/guided-vs-autonomous.md).

---

## Compute tiers (provider-agnostic)

veritas never hard-codes a vendor. You declare up to four tiers, each an OpenAI- or
Anthropic-compatible endpoint, with the API key read from `.env`:

```jsonc
"compute": {
  "collect": { "baseURL": "https://openrouter.ai/api/v1", "model": "deepseek/deepseek-v4-flash", "keyEnv": "COLLECT_KEY" },
  "vision":  { "baseURL": "https://openrouter.ai/api/v1", "model": "google/gemini-2.5-flash",   "keyEnv": "COLLECT_KEY" },
  "analyze": { "baseURL": "https://api.anthropic.com/v1", "model": "claude-sonnet", "keyEnv": "ANALYZE_KEY", "compat": "anthropic" },
  "serve":   { "baseURL": "https://openrouter.ai/api/v1", "model": "deepseek/deepseek-v4-flash", "keyEnv": "SERVE_KEY" }
}
```

Use a cheap model to **collect** at volume, a strong one to **analyze** (where quality matters),
and any model to **serve**. Mix vendors freely. Omit keys and veritas **degrades gracefully** —
it still runs offline: consolidation, merge, graph, and an extractive serve all work keyless (the
bundled example proves it). See [docs/config-reference.md](docs/config-reference.md).

---

## Gate a whole system, not just the corpus

For numbers that can go stale (versioned data, changing APIs), don't let RAG quote them — point the answering layer at
a deterministic **calculator/oracle** for numbers and let the corpus supply only explanation + provenance + status.
Then a `qa` block in your config turns the auditor into a functional gate over the whole runtime:

```jsonc
"qa": {
  "calc":  { "cmd": "node --import tsx compute-cli.mjs", "fixtures": "fixtures/qa.json", "tolerance": 1 },
  "ai":    { "canaries": ["How is X computed?", "What does Y do?"] },
  "drift": { "cmd": "node drift-check.mjs" }
}
```

`qa:calc:*` asserts the calculator matches golden fixtures, `qa:ai:*` asserts the assistant answers canaries on-topic,
`qa:drift` fails on untriaged drift — one GO/NO-GO over the knowledge base **and** its calculator **and** its assistant.
See [docs/operating.md](docs/operating.md).

## Security & secrets

- **Secrets live only in `.env`** (gitignored). Config references keys by env-var *name*, never value.
- **The audit stage scans every output** for secret-like strings and fails the gate if it finds one.
- **A project's data never ships with the tool.** `out/`, `raw/`, `cache/`, and vector stores are
  gitignored — veritas is method + templates; your corpus stays yours.
- **Autonomous mode never skips the gate.** `run --auto` ends at `audit`, which exits non-zero on
  NO-GO, so nothing downstream treats an unverified build as done.

---

## Cost model

You pay only for the models you plug in; veritas adds no service.

| Lever | Effect |
|---|---|
| `budget.maxCollectDocs` | caps how many documents collection pulls |
| `compute.collect` model | the volume tier — keep it cheap |
| `compute.analyze` model | the quality tier — the one worth spending on |
| `parallelism.waves` | concurrency width (default 3) — throughput vs rate limits |
| keyless mode | $0 — offline consolidation/merge/graph/extractive-serve for structured inputs |

A first pass on a modest topic is typically **cents on collection + a few dollars on analysis**.
Re-running a single stage never re-does the others.

---

## Repo layout

```
veritas/
├─ bin/veritas.mjs              # CLI: guide · run --auto · <stage>
├─ src/
│  ├─ lib/                      # llm tiers · project · waves · schema
│  ├─ stages/                   # consolidate · synthesize · merge · verify · discover · rag-pack · build-graph · serve · audit · health-ping · guide
│  │  └─ collect/               # 10 pluggable source modules
│  └─ templates/graph/          # inlined three.js + 3d-force-graph (offline viewer)
├─ examples/minimal/            # neutral, keyless, end-to-end demo
├─ docs/                        # architecture · source-modules · verification · config-reference · guided-vs-autonomous · operating
├─ SKILL.md                     # how an agent runs veritas
├─ veritas.config.example.json · .env.example · LICENSE (MIT)
```

## Docs

- [Architecture](docs/architecture.md) — the pipeline, data shapes, and how stages compose.
- [Source modules](docs/source-modules.md) — the `collect()` contract + writing your own.
- [Verification](docs/verification.md) — the truth ledger, oracle, and status derivation.
- [Config reference](docs/config-reference.md) — every field, every default.
- [Guided vs autonomous](docs/guided-vs-autonomous.md) — the two operating modes + the agent flow.
- [Operating](docs/operating.md) — the audit gate, health-ping, and re-running stages.

## Credits

The offline 3D graph viewer vendors two MIT-licensed libraries — [three.js](https://github.com/mrdoob/three.js)
(© Three.js Authors) and [3d-force-graph](https://github.com/vasturiano/3d-force-graph) (© Vasco Asturiano). Full
copyright and license notices are in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## License

MIT — see [LICENSE](LICENSE). Third-party components retain their own licenses (see
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)). Contributions welcome; new source modules especially.
