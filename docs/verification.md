# Verification model and current limits

Veritas KB records provenance, confidence, and a status on each claim. In the current alpha release, those statuses are
**provisional prioritization signals**, not factual certifications. This document describes the implementation as it
exists today and separates it from the stronger evidence model planned for production.

## Current status rules

`verify` calls `deriveStatus(fact)` in `src/lib/schema.mjs`:

```text
if the note contains a contradiction keyword  -> CONTRADICTED
if confidence is high                         -> TRUTH
if confidence is medium                       -> TRUTH with 3 source references, otherwise PLAUSIBLE
otherwise                                     -> NEEDS-VERIFICATION
```

| Status               | Current implementation meaning                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| `TRUTH`              | Legacy label assigned by the rule above or by an oracle comparison that returns `CONFIRMED`. It is not proof. |
| `PLAUSIBLE`          | Medium confidence with fewer than three source references and no detected contradiction keyword.              |
| `NEEDS-VERIFICATION` | Low confidence or otherwise unresolved by the current rules.                                                  |
| `CONTRADICTED`       | A note matches a contradiction keyword or an oracle comparison returns `REFUTED`.                             |

Confidence may originate from source data or an LLM. A high-confidence LLM result can therefore receive the current
`TRUTH` label without independent evidence. Source references are counted as strings; the current release does not
prove that publishers, mirrors, authors, or upstream evidence are independent.

## Optional oracle comparison

An oracle can point to code or a dataset under the project root. When an analyze key is available, `verify` selects
uncertain claims, finds oracle lines with overlapping terms, and asks the analyze model for `CONFIRMED`, `REFUTED`, or
`UNCLEAR`.

Important current constraints:

- `oracle.type: api` is declared but not implemented for per-claim verification;
- only a bounded subset of non-`TRUTH` claims is compared;
- existing `TRUTH` claims are not rechecked by the oracle;
- term overlap can miss relevant evidence or select incomplete context;
- the verdict does not yet preserve a precise page, line, span, or content hash;
- an LLM verdict remains probabilistic and requires evaluation.

Without an oracle and analyze key, statuses rely only on confidence, source-reference count, and note keywords.

## Emitted artifacts

- `verified.json` — claims, provisional statuses, tally, and detected gaps;
- `VERIFIED.md` — a human-readable view grouped by status;
- `expert-report.md` — a deterministic summary of selected status-labeled claims;
- `next-targets.md` — thin domains, unresolved claims, and flagged gaps.

These artifacts support review. Their names do not imply that every contained claim is verified.

## Discovery findings

`discover` asks the analyze model to propose relationships between the corpus and oracle material. Findings are
hypotheses for expert review. The current JSON contract does not yet require machine-verifiable citations or test
artifacts, so novel findings must not be presented as established facts.

## Production evidence model

The [production roadmap](production-roadmap.md) replaces confidence-driven `TRUTH` with explicit evidence and more
precise states such as asserted, corroborated, oracle-verified, contradicted, and unknown. A production claim should
carry:

- a stable claim identifier and schema version;
- immutable source snapshots and content hashes;
- exact supporting or contradicting excerpts and locators;
- publisher or provenance groups used to assess independence;
- version and validity dates;
- structured oracle or human-review verdicts;
- a complete audit trail from source to published corpus.

Until those controls and domain-specific evaluations exist, treat every generated status as decision support and
inspect the underlying evidence before relying on it.
