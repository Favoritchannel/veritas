# Source modules

A **source** is where raw material comes from. Each source is one entry in your config's `sources`
array and maps to one module in `src/stages/collect/`. veritas ships ten; adding your own is one
small file.

## The contract

A source module exports a single async function:

```js
export async function collect(project, cfg) {
  // project — the loaded project (log, tiers, config, out helpers)
  // cfg     — this source's `config` block from veritas.config.json
  // returns — an array of raw entries
  return [ /* rawEntry, rawEntry, … */ ];
}
```

`collect/index.mjs` imports `./<type>.mjs` for each configured source, calls `collect()`, stamps
each entry with its `type`, and writes the union to `out/raw-entries.json`.

### A raw entry

Only `text` is required. Everything else is an optional hint that improves the graph and the
verification later.

```jsonc
{
  "text": "the claim or passage",              // REQUIRED
  "source": { "ref": "url-or-id", "title": "Human title" },
  "domain": "which sub-area this belongs to",  // else inferred later
  "confidence": "high | medium | low",         // your source's own reliability
  "dependsOn": ["input A", "input B"],          // structured hints → graph edges
  "affects":   ["output X"],
  "breakpoints": ["threshold notes"],
  "hidden": false,                              // true = a non-obvious/implied link
  "kind": "fact"
}
```

If you can populate `dependsOn`/`affects`, do — the dependency graph then has real edges even in
offline mode. If you can't, leave them out; `synthesize` will extract them with the analyze model.

## Built-in modules

| `type` | Source | Key `config` fields | Notes |
|--------|--------|---------------------|-------|
| `files` | Local `.md` / `.txt` / `.json` | `path` (glob) | Zero network. JSON entries keep their structured fields; markdown is split into fact units. The keyless demo path. |
| `web` | Websites | `seeds[]`, `maxPages`, `vision` | Playwright crawl; `vision:true` reads charts/images via the vision tier. |
| `youtube` | Video | `ids[]`, `channels[]`, `transcribe` | Captions first, Whisper fallback. |
| `chat-export` | Discord/Slack/Telegram/WhatsApp exports | `path`, `format` | Parses common export formats. Token (if any) via `.env`, never config. |
| `reddit` | Threads/subreddits | `urls[]`, `subreddits[]` | Public JSON endpoints. |
| `rss` | Feeds | `feeds[]` | Blogs, changelogs, news. |
| `api` | Any JSON API | `url`, `method`, `path` | Pulls a JSON array/field into entries. |
| `github` | Repos/issues/discussions | `repos[]`, `what` | `GITHUB_TOKEN` from `.env` for rate limits/private. |
| `database` | SQL | `driver`, `dsn`, `query` | sqlite/postgres/mysql via optional drivers; each row → an entry. |
| `pdf` | Papers/manuals | `path` (glob) | Text extraction; vision for figures where enabled. |

All modules **degrade gracefully**: a missing optional dependency (e.g. Playwright, a DB driver),
a missing key, or an unreachable source logs a warning and returns what it can, rather than
crashing the run.

## Writing your own (social networks, messengers, ticketing, wikis…)

1. Create `src/stages/collect/<type>.mjs` exporting `collect(project, cfg)`.
2. Return raw entries. Use the tiers if you need an LLM/vision:

   ```js
   import { chat, vision } from "../../lib/llm.mjs";

   export async function collect(project, cfg) {
     const t = project.tier("collect");           // { baseURL, model, keyEnv }
     const items = await fetchYourSource(cfg);
     const out = [];
     for (const it of items) {
       // optional: normalize noisy text with the cheap tier (skipped if no key)
       const text = t ? await chat(t, "Extract the factual claim.", it.body).catch(() => it.body) : it.body;
       out.push({ text, source: { ref: it.url, title: it.title }, confidence: "medium" });
     }
     return out;
   }
   ```

3. Reference it in config: `{ "type": "<type>", "config": { … } }`.
4. **Degrade gracefully** — wrap network/deps in try/catch, honor `project.log`, and never throw on
   a single bad record.
5. **Secrets** — read tokens from `process.env` (loaded from `.env`), never from `cfg`.

That's it — the new source joins `collect` automatically. Contributions of new modules are the most
welcome kind of PR.
