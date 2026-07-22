# Roadmap

Veritas is a verification-first knowledge pipeline: facts earn a status, contested knowledge is labeled, and an audit gate decides GO/NO-GO. The roadmap follows one idea — **make disagreement, staleness, and human judgment first-class citizens of the corpus**.

## v0.1.x (current)

- ✅ 10 source collectors, provider-agnostic compute tiers, keyless degradation
- ✅ Truth ledger: TRUTH / PLAUSIBLE / NEEDS-VERIFICATION / CONTRADICTED
- ✅ **DISPUTED status + expert-conflict detection** — same-domain facts are paired deterministically and judged by the analyze tier; verdicts are cached so they never silently flip; `CONFLICTS.md` names who disagrees with whom
- ✅ Interview collector (lite): `Speaker: text` transcripts with per-expert attribution
- ✅ Answering AI presents both sides of a dispute with attribution, never picks a winner

## v0.2 — human adjudication

- `veritas review` CLI: `--list` / `--approve` / `--reject` / `--resolve <conflictId> --winner <factId>`, all with `--by`
- Append-only decision ledger (`review-decisions.json`); human decisions outrank derived statuses, provenance keeps both
- Orphan handling: decisions and conflicts whose facts vanished after a re-run are surfaced, never silently dropped
- ID validation with "did you mean" before anything is written to the ledger
- Full interview collector (JSON turns, multi-file merging, richer parsing)
- Audit gains a `warn` level + `review:unresolved-conflicts` check

## v0.3 — freshness

- `collectedAt` / `verifiedAt` timestamps on facts (file mtime for file sources — knowledge age, not pipeline age)
- `staleness` config (global + per-domain TTL) → `stale` flag, never status decay: truth and freshness are orthogonal
- `next-targets.md` lists stale facts to re-verify; optional audit budget check

## Later

- HTTP API for serve · embeddings-optional retrieval · multi-project workspaces · integrations

Contributions and issue reports welcome — especially real-world corpora where experts disagree.
