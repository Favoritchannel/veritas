---
name: veritas
description: >-
  Turn a TOPIC + diverse SOURCES into a verified knowledge base with an answering AI. Use when a
  user wants to research a subject deeply from many sources (web, video, chat exports, PDFs, DBs,
  APIs), separate what's TRUE from what's merely claimed, discover connections nobody stated, and
  end with a cited, status-tagged answering AI plus a go/no-go audit. Runs guided (hand-hold a
  newcomer) or autonomous (configure once, run to the audit gate).
---

# veritas — the agent runbook

You are running **veritas**: a pipeline that turns a topic + diverse sources into a *verified*
knowledge base and an answering AI. Your job is to pick the mode, walk or run the pipeline, and
hand back a finished project **only after the auditor returns GO**.

## 0. Detect the mode

- **Guided** — the user is new to this topic/tool, unsure what sources exist, or says "walk me
  through it." You ask questions one step at a time and stop at the completeness critic.
- **Autonomous** — the user already knows their sources, wants it built unattended, or this is a
  recurring/CI run. You configure, run `run --auto`, and report the audit result.

If unsure, ask once: *"Want me to walk you through setup, or configure it and run the whole build
unattended?"*

## 1. Setup (both modes)

Produce a `veritas.config.json` (copy from `veritas.config.example.json`) with:

1. **`topic`** — one line.
2. **`domains`** — the sub-areas facts split into. These become the graph's nuclei. Propose a set
   from the topic and confirm.
3. **`oracle`** — *the highest-leverage question you can ask.* Is there an authoritative reference —
   a codebase, an API, a dataset, a spec — that could confirm or refute claims? If yes, set its
   `type` (`code` | `api` | `dataset`) and `ref`. If not, `type: "none"` (veritas still
   cross-checks sources against each other).
4. **`sources`** — add one entry per source. Built-in types: `web · youtube · chat-export · reddit
   · rss · api · github · database · pdf · files`. Push for **breadth** — more diverse sources =
   more cross-checking = higher-confidence truth. If the user needs a source that isn't built in,
   write a module (see `docs/source-modules.md`) before running.
5. **`compute`** — the tiers. Cheap model for `collect`/`vision`, strong model for `analyze`, any
   for `serve`. Keys go in `.env` (never in config, never in chat). If the user has no keys, tell
   them the pipeline still runs offline for structured inputs, just without LLM synthesis/verify.

In **guided** mode, ask for these one at a time, explaining why each matters. In **autonomous**
mode, infer sensible defaults from the user's brief, state your choices in one line, and proceed.

## 2. Build

- **Guided:** run stages one at a time, narrating what each produced:
  `collect → consolidate → synthesize → merge → verify`. **Stop after verify** and read the user
  `out/next-targets.md` — the completeness critic's list of thin domains. Ask whether to add
  sources and re-collect, or continue to `discover → rag-pack → graph → audit`.
- **Autonomous:** `node bin/veritas.mjs run --auto veritas.config.json`. It runs the whole chain
  and stops on the first hard error (or at the audit gate). If it stops mid-way, read the failing
  stage's message, fix the config or the offending source, and re-run **that stage** (state is on
  disk — you don't restart from scratch).

## 3. Verify before handover — this is non-negotiable

Run the auditor: `node bin/veritas.mjs audit veritas.config.json`. Read `out/audit-report.md`.

- **GO** → proceed to handover.
- **NO-GO** → do **not** hand the project off. Report which checks failed (coverage floor, ledger
  sanity, RAG size, graph render, or a **secret leak**), fix the cause, and re-run the failing
  stage then audit again. A secret-scan hit is a stop-everything: find it, remove it, rotate it.

If the config has a **`qa`** block, the same auditor also runs functional tests: `qa:calc:*` (a
deterministic calculator matches golden fixtures), `qa:ai:*` (the answering AI returns non-trivial,
on-topic canary answers), and `qa:drift` (an external drift check exits clean). One gate then covers
the knowledge base **and** its calculator **and** its assistant — not just the corpus. See
`docs/operating.md`.

## 4. Serve & hand off

- Sanity-check the answering AI: `node bin/veritas.mjs serve veritas.config.json --ask "<a
  question the corpus should answer>"`. Confirm the answer is cited and status-tagged.
- Hand the user: the `out/` directory (verified ledger, `rag-corpus.jsonl`, `graph.html`,
  `audit-report.md`, `expert-report.md`, `NOVEL-FINDINGS.md`, `next-targets.md`), how to ask
  questions (`serve --ask` or `serve --repl`), and how to open the 3D graph.
- If they want ongoing assurance, offer **health-ping**: set `healthPing.enabled` + canary
  questions, and run `node bin/veritas.mjs health-ping veritas.config.json` on a schedule to catch
  drift in the served model.

## Guardrails

- **Never put a real API key in config or in chat.** Keys live in `.env` only.
- **Never claim a build is done on a NO-GO audit** or a failed serve smoke test.
- **Prefer more sources over more prompting.** The truth ledger gets stronger from independent
  corroboration, not from a cleverer synthesis prompt.
- **Re-run single stages, don't restart.** Every stage persists to `out/`.
- **When a domain is thin, say so** and point at `next-targets.md` — don't paper over gaps.

## One-glance command reference

```bash
node bin/veritas.mjs guide                       # print the guided checklist
node bin/veritas.mjs run --auto  config.json     # full autonomous build → out/
node bin/veritas.mjs <stage>     config.json     # collect|consolidate|synthesize|merge|verify|
                                                 #   discover|rag-pack|graph|serve|audit|health-ping
node bin/veritas.mjs serve config.json --ask "…" # one cited, status-tagged answer
node bin/veritas.mjs serve config.json --repl    # interactive Q&A
node bin/veritas.mjs audit config.json           # go/no-go gate (exit 2 on NO-GO)
```
