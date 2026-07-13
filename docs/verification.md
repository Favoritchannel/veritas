# Verification — the truth ledger

This is what separates veritas from "chat with your docs." Every fact carries **provenance,
confidence, and a status** — and the status is **derived from evidence**, never asserted by the
model that wrote the fact.

## The four statuses

| Status | Meaning | When it's assigned |
|--------|---------|--------------------|
| **`TRUTH`** | Corroborated; safe to rely on. | High-confidence facts, or medium-confidence facts backed by ≥3 independent sources, or facts the oracle confirms. |
| **`PLAUSIBLE`** | Reasonable and uncontradicted, but not independently confirmed. | Medium-confidence facts with fewer than 3 sources. |
| **`NEEDS-VERIFICATION`** | Weak — collect more before relying on it. | Low-confidence facts, or single thin sources. |
| **`CONTRADICTED`** | Sources or the oracle disagree. | The fact's note contains a contradiction signal (the oracle refuted it, or a source correction was found). Surfaced, never silently dropped. |

## How status is derived

`verify` calls `deriveStatus(fact)` (`src/lib/schema.mjs`). The rule, in order:

```
if the fact's note signals a contradiction  → CONTRADICTED
if confidence == high                        → TRUTH
if confidence == medium                      → TRUTH if ≥3 sources, else PLAUSIBLE
otherwise                                    → NEEDS-VERIFICATION
```

- **Confidence** comes from the source (a collector hint) and/or the synthesis model's own
  assessment. High-quality references produce high-confidence facts; forum chatter produces
  medium/low.
- **Source count** is how many independent entries carry the same fact after consolidation. Three
  independent mediums promote to TRUTH — corroboration is the whole point.
- **The contradiction signal** is set when a cross-check (source-vs-source, or oracle-vs-fact)
  finds disagreement. veritas keeps the contradicted claim in the ledger with its status so you can
  see *what* the sources fight about, not just a sanitized "consensus."

## The oracle

The **oracle** is whatever you treat as ground truth for your topic:

| `oracle.type` | `ref` example | Used for |
|---------------|---------------|----------|
| `code` | a glob over a codebase | Cross-checking claims against the real implementation. |
| `api` | an endpoint | Confirming values/behavior against a live source of truth. |
| `dataset` | a json/csv path | Checking numbers/facts against authoritative data. |
| `none` | — | No oracle; veritas still cross-checks sources against each other. |

When an oracle is set, `verify` uses the **analyze** tier to compare facts against the relevant
oracle material (matched by shared terms) and annotates each fact with a confirmation or a
contradiction — which then feeds `deriveStatus`. This is the single highest-leverage thing you can
configure: it's the difference between "several blogs agree" and "the engine actually does this."

## What verify emits

- **`verified.json`** — every fact plus its derived `status`, and a `tally` of counts per status.
- **`VERIFIED.md`** — the ledger, human-readable, grouped by status.
- **`expert-report.md`** — a synthesized analysis of what's solid, what's contested, and why.
- **`next-targets.md`** — the **completeness critic's** output: which domains are thin, which
  facts are stuck at NEEDS-VERIFICATION, and what to collect next to promote them. This is your
  to-do list for the next collection pass.

## Discovery — beyond what sources state

`discover` (needs the analyze tier + an oracle) goes one step further: it cross-references the
verified library against the oracle to surface **interconnections nobody wrote down** — the
dependency two facts each imply but neither states. These land in `NOVEL-FINDINGS.md`, tagged with
the reasoning and the confidence. Without an oracle + analyze key, the stage is skipped.

## Why "derived, not asserted" matters

An LLM asked "is this true?" will happily rate its own hallucination as true. veritas never asks
that. Truth status is a **function of evidence** — confidence, corroboration count, and oracle
cross-check — computed outside the model. The model's job is to *extract and structure* claims; the
ledger's job is to *rank their trustworthiness*. That separation is the reason a veritas answer can
say "TRUTH (3 sources, oracle-confirmed)" instead of just sounding confident.
