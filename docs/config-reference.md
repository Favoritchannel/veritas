# Config reference

One file, `veritas.config.json`. Copy `veritas.config.example.json` and edit. Every field below,
with its default and effect.

```jsonc
{
  "topic": "…",                    // REQUIRED — one line describing the knowledge base
  "domains": ["…", "…"],           // REQUIRED — sub-areas; become the graph's nuclei and the synthesis buckets

  "oracle": {                      // OPTIONAL — an authoritative reference to verify against
    "type": "none",                //   "code" | "api" | "dataset" | "none"
    "ref": ""                      //   glob (code) · url (api) · path (dataset)
  },

  "sources": [                     // REQUIRED — one entry per source; add as many as you like
    { "type": "files", "config": { "path": "raw/**/*.json" } }
    // web · youtube · chat-export · reddit · rss · api · github · database · pdf · files
  ],

  "compute": {                     // REQUIRED for LLM stages; omit keys to run offline
    "collect": { "baseURL": "…", "model": "…", "keyEnv": "COLLECT_KEY" },
    "vision":  { "baseURL": "…", "model": "…", "keyEnv": "COLLECT_KEY" },
    "analyze": { "baseURL": "…", "model": "…", "keyEnv": "ANALYZE_KEY", "compat": "anthropic" },
    "serve":   { "baseURL": "…", "model": "…", "keyEnv": "SERVE_KEY" }
  },

  "parallelism": { "waves": 3, "chunkChars": 12000 },
  "budget":      { "maxCollectDocs": 500, "maxAnalyzeTokens": null },
  "language":    "en",
  "privacy":     { "secretsEnv": ".env", "gitignoreOutputs": true },
  "out":         "out",

  "healthPing": {
    "enabled": false,
    "intervalMinutes": 1440,
    "canaries": ["A known-answer question to detect drift."]
  }
}
```

## Fields

### `topic` (string, required)
One line. Sets the frame for synthesis, the graph title, and the serve system prompt.

### `domains` (string[], required)
The sub-areas your facts split into. They become the **nuclei** in the 3D graph and the buckets
`synthesize` works through in parallel. Pick 4–8 meaningful divisions. A fact whose domain doesn't
match any listed domain is normalized to the **last** domain (treat the last as your "general"
catch-all if you want one).

### `oracle` (object, optional)
The authoritative reference facts are cross-checked against. `type: "none"` disables it (sources are
still cross-checked against each other). See [verification.md](verification.md). Setting a real
oracle is the biggest single lever on truth quality.

### `sources` (object[], required)
Each is `{ "type": "<module>", "config": { … } }`. `type` maps to `src/stages/collect/<type>.mjs`.
Per-type `config` fields are documented in [source-modules.md](source-modules.md). Breadth is the
goal — more independent sources = more corroboration = more TRUTH.

### `compute` (object)
Up to four tiers, each an OpenAI- or Anthropic-compatible endpoint:

| Tier | Used by | Guidance |
|------|---------|----------|
| `collect` | collect (text extraction) | cheap, high-volume model |
| `vision` | collect (reads charts/images) | a vision-capable model; can reuse the collect key |
| `analyze` | synthesize, verify, discover | your **strong** model — quality matters most here |
| `serve` | the answering AI | any model; balances cost vs answer quality |

Each tier: `{ baseURL, model, keyEnv, compat? }`. `keyEnv` is the **name** of the env var holding
the key (value lives in `.env`). `compat: "anthropic"` switches that tier to the Anthropic
Messages API; omit it for OpenAI-compatible endpoints. **Omit a key and that tier's work is
skipped** — the pipeline degrades to its offline behavior (see [architecture.md](architecture.md)).

### `parallelism` (object)
- `waves` (default 3) — how many analyze tasks run concurrently. Raise for throughput, lower if you
  hit rate limits.
- `chunkChars` (default 12000) — how long inputs are split before synthesis.

### `budget` (object)
- `maxCollectDocs` — hard cap on documents pulled during collection.
- `maxAnalyzeTokens` — optional ceiling on analyze spend (`null` = no cap).

### `language` (string, default `"en"`)
Output language for synthesized facts, reports, and answers.

### `privacy` (object)
- `secretsEnv` (default `.env`) — where keys are loaded from.
- `gitignoreOutputs` (default true) — the shipped `.gitignore` already excludes `out/`, `raw/`,
  caches, and vector stores; a project's data never becomes part of the tool.

### `out` (string, default `"out"`)
Output directory, resolved **relative to the config file**. Point different projects at different
dirs; they never collide.

### `healthPing` (object)
- `enabled` (default false) — turn on periodic drift checks.
- `intervalMinutes` (default 1440) — cadence when you loop it.
- `canaries` (string[]) — known-answer questions re-asked through `serve` to catch model drift.
See [operating.md](operating.md).
