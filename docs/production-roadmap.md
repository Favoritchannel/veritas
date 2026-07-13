# Production roadmap

This roadmap describes how to evolve Veritas KB from a compact reference implementation into a dependable,
security-conscious knowledge platform. It is deliberately domain-neutral: the same quality bar should apply to
product documentation, research, operations, education, policy, technical communities, and other focused knowledge
systems.

The order matters. Verification semantics and reproducibility come before a polished UI or larger models. A system
that retrieves faster but labels unsupported claims as truth is not an improvement.

## Current maturity

The repository is an early `0.1.x` implementation that demonstrates the full workflow with very little machinery.
That is useful for learning and prototyping, but the current `GO` result must not be interpreted as a production
security or factuality certification.

Known gaps that drive this roadmap:

- `confidence: high` currently becomes `TRUTH` without requiring independent or oracle evidence;
- source independence is not modeled, so mirrors and correlated publishers can look like corroboration;
- contradiction detection is partly inferred from free-form notes instead of structured evidence verdicts;
- API-backed oracle verification is declared but not yet generalized;
- the audit truth-ratio check currently accepts any non-negative ratio, including zero verified facts;
- artifacts have no immutable run manifest, input hashes, lineage, freshness proof, or atomic publish step;
- errors are often degraded or swallowed, which can leave a run apparently complete after partial collection;
- retrieval is exact-token matching rather than multilingual BM25/hybrid retrieval and has no relevance floor;
- generated citations are not validated against supporting spans;
- discovery produces useful hypotheses, but its output contract does not retain required evidence locators;
- the bundled demo begins with already structured facts, so it validates plumbing more than extraction quality;
- public-service controls—authentication, tenant isolation, rate limits, abuse handling, and a hardened API—do not
  exist yet;
- there is no automated test suite, CI quality gate, lockfile, release pipeline, or published benchmark.

## Product promise and non-goals

The production promise should be narrow and testable:

> Given approved sources and explicit domain policy, Veritas KB produces inspectable claims with evidence, answers only
> when retrieved evidence supports an answer, exposes uncertainty and contradiction, and blocks publication when its
> configured quality gates fail.

Non-goals:

- proving universal or philosophical truth;
- treating model confidence as evidence;
- guaranteeing immunity to prompt injection or hallucination;
- replacing a domain expert in high-stakes decisions;
- becoming an unrestricted general-purpose assistant or autonomous web agent;
- hiding uncertainty to make answers sound more decisive.

## System invariants

These invariants should become executable tests, not documentation-only aspirations:

1. **No verified claim without evidence.** A verified status requires machine-readable supporting evidence or a
   deterministic oracle result.
2. **No factual answer without support.** Every externally visible factual claim maps to one or more source spans.
3. **No evidence means abstention.** Missing or weak retrieval produces a friendly, deterministic no-evidence answer.
4. **Hypotheses are never facts.** Discovery output remains `HYPOTHESIS` until an oracle, experiment, or authorized
   reviewer promotes it.
5. **Untrusted text never grants authority.** User text, documents, web pages, tool results, and model output are data,
   not authorization or policy.
6. **The model cannot expand its own powers.** Tools, source scopes, tenant boundaries, and permissions are enforced by
   application code.
7. **A partial run cannot publish.** Stale, missing, invalid, or incomplete stages fail closed in production mode.
8. **Every result is reproducible and traceable.** A manifest records inputs, hashes, versions, models, prompts, and
   outputs for every run.
9. **Every expensive operation is bounded.** Input size, tokens, time, concurrency, retries, sources, and money all
   have enforced ceilings.
10. **Security claims are measurable.** Each release runs a versioned attack and over-refusal evaluation suite.

## Target architecture

```text
operator-approved sources
        |
        v
fetch sandbox -> quarantine -> type/size/malware/PII/injection checks
        |
        v
immutable source snapshots + provenance locators + content hashes
        |
        v
claim extraction -> canonicalization -> evidence graph -> oracle adapters
        |
        v
structured verification -> contradiction sets -> hypothesis workspace
        |
        v
immutable candidate release -> schema/quality/security/eval gates
        |
        +---- NO-GO: retain for diagnosis, never publish
        |
        `---- GO: atomic publish of a versioned corpus
                         |
                         v
public request gateway -> topic/abuse gate -> trusted retrieval only
                         |
                         v
grounded generation -> claim/citation validation -> safe rendering
```

Separate the **build plane** from the **serve plane**. Collection and analysis may use broader operator-approved
access in an isolated environment. The public answering runtime should normally have no crawler, arbitrary URL fetch,
shell, unrestricted SQL, or write-capable tools.

## P0 — make the core honest, reproducible, and safe

P0 is release-blocking. Do not market the runtime as production-ready before these items are complete.

### P0.1 Typed contracts and immutable runs

Deliverables:

- runtime-validated, versioned schemas for `Config`, `SourceSnapshot`, `RawEntry`, `Claim`, `Evidence`, `Verdict`,
  `Finding`, `RagDocument`, `Answer`, and `RunManifest`;
- stable `claimId`, `evidenceId`, `sourceId`, and `runId` values derived from canonical content and scope;
- immutable `runs/<run-id>/` output directories;
- a manifest containing config hash, source hashes, git SHA, schema versions, model/provider identifiers, prompt
  versions, timing, token/cost totals, warnings, and artifact checksums;
- atomic publication: update `current` only after all required gates pass;
- stage locks, atomic file writes, cache invalidation, and cleanup of artifacts removed by a newer run;
- explicit `development` and fail-closed `production` modes;
- enforced document, byte, token, time, retry, concurrency, and monetary budgets.

Acceptance:

- frozen inputs produce semantically identical artifacts and stable content hashes;
- malformed JSON, partial collection, stale artifacts, and interrupted writes cannot publish;
- every published artifact validates against its declared schema;
- a published answer can be traced to a run, claim, source snapshot, and exact locator.

### P0.2 Evidence-first verification

Replace confidence-driven truth assignment with structured evidence evaluation.

Recommended status vocabulary:

- `ASSERTED` — present in at least one source, not independently checked;
- `CORROBORATED` — supported by independent evidence groups;
- `ORACLE_VERIFIED` — confirmed by an authoritative deterministic adapter;
- `CONTRADICTED` — material evidence or an oracle conflicts with the claim;
- `UNKNOWN` — insufficient or unusable evidence;
- `HYPOTHESIS` — candidate relationship awaiting a test or review.

Each evidence object should retain:

- publisher/author group and a separate independence group;
- source snapshot hash and canonical reference;
- exact quote plus page, line, character, row, commit, or timestamp locator;
- observed, published, and valid-from/valid-to dates;
- version, jurisdiction, product release, or other applicability scope;
- relation (`SUPPORTS`, `REFUTES`, `QUALIFIES`, `DUPLICATES`);
- extraction method and reviewer/oracle identity.

Rules:

- model confidence can prioritize review but can never independently produce a verified status;
- mirrors, syndication, shared upstream sources, and repeated claims from one author count as correlated evidence;
- oracle checks include high-confidence claims and report explicit coverage rather than silently truncating work;
- contradictions are first-class records, not words detected in a free-form note;
- numeric and version-sensitive facts come from deterministic adapters when available;
- discovery findings are excluded from ordinary answers until promoted by evidence.

Acceptance:

- no `CORROBORATED` or `ORACLE_VERIFIED` claim exists without qualifying evidence objects;
- an oracle refutation deterministically blocks the affected claim from verified answers;
- the ledger reports verification coverage, unresolved conflicts, stale evidence, and skipped checks;
- claim status calibration is evaluated against a human-reviewed gold set.

### P0.3 A meaningful audit gate

Replace one ambiguous `GO` with three independently useful gates:

- `PIPELINE_HEALTHY` — stages completed, schemas and manifests are valid, no partial/stale state;
- `KNOWLEDGE_READY` — evidence, coverage, freshness, contradictions, and domain-specific quality floors pass;
- `RUNTIME_READY` — retrieval, answer grounding, security, abuse controls, and canary evals pass.

Audit checks should include:

- artifact schema, hash, lineage, freshness, and current-run ownership;
- connector completeness and an explicit partial-data policy;
- oracle coverage and configurable status/contradiction thresholds;
- headless rendering and CSP validation of the graph rather than a file-size check;
- structured canary answers compared with expected claims and citations;
- prompt-injection, off-topic, leakage, XSS, SSRF, and denial-of-wallet regression suites;
- secret and PII scanning with pluggable scanners;
- dependency, license, and supply-chain checks.

Acceptance:

- zero-evidence and partial builds fail `KNOWLEDGE_READY`;
- a long but irrelevant canary response cannot pass;
- every audit row has a documented rationale, observable input, threshold, and remediation;
- audit output is stable JSON plus a human-readable report.

### P0.4 Grounded retrieval and answering

Minimum production retrieval:

- BM25 or SQLite FTS with Unicode-aware tokenization;
- language normalization and configurable stemming/lemmatization;
- metadata filters for tenant, topic, domain, version, date, status, and source policy;
- a measured relevance threshold and deterministic out-of-scope/no-evidence path;
- exclusion of contradicted claims and hypotheses from normal answer mode;
- context packing that preserves source spans and provenance.

The answer contract should be structured:

```json
{
  "answer": "...",
  "claims": [
    {
      "text": "...",
      "claimIds": ["claim:..."],
      "evidenceIds": ["evidence:..."],
      "status": "CORROBORATED"
    }
  ],
  "abstained": false,
  "reason": null
}
```

After generation, deterministic validation must confirm that every cited ID exists, was actually supplied to the
model, belongs to the current tenant/topic/version, and points to a supporting span. An entailment/groundedness check
may add another layer, but it cannot replace those deterministic checks.

Acceptance:

- citation identity validity is 100% on the release suite;
- unsupported generated claims are removed or cause abstention;
- low-relevance retrieval does not call the main generation model;
- output is safely encoded for its target renderer and never trusted as HTML.

### P0.5 Ingestion hardening

Deliverables:

- an allowlist of connector types and validated connector schemas;
- safe domain slugs, path containment, and prevention of dynamic path/import escape;
- SSRF protection: allowed schemes, exact hostname policy, DNS/private-network checks, redirect revalidation, and
  operator-configured domain allowlists;
- response/file/MIME/decompression/recursion/time limits;
- HTML, PDF, image, metadata, Unicode, and hidden-text normalization in quarantine;
- source snapshots with hashes, ETag/Last-Modified support, retry/backoff with jitter, and resumable checkpoints;
- precise page/line/row/timestamp/commit locators;
- explicit robots, terms, copyright/license, retention, PII, and deletion policy hooks;
- safe graph serialization and a restrictive Content Security Policy;
- operator commands represented as an executable plus validated argument array, not interpolated shell strings;
- a documented trust boundary: configuration capable of running programs is trusted operator code.

Acceptance:

- regression tests cover private-IP redirects, DNS rebinding, oversized responses, archive bombs, path traversal,
  malicious `</script>` content, and unsafe MIME types;
- a failed or skipped connector is visible in the manifest and cannot silently satisfy completeness;
- collected content never executes during ingestion, graph viewing, or answer rendering.

### P0.6 Tests, CI, and release hygiene

Add:

- unit tests for pure status, schema, deduplication, path, retrieval, and policy rules;
- property tests for canonicalization, path containment, serialization, and parser invariants;
- connector contract tests with recorded or mocked responses;
- provider integration tests for OpenAI-compatible and Anthropic-compatible payloads;
- golden end-to-end fixtures for success, empty inputs, malformed data, partial collection, oracle confirmation,
  oracle refutation, zero verified claims, stale output, prompt injection, SSRF, and stored XSS;
- GitHub Actions across supported Node versions and Windows/Linux/macOS;
- formatting, linting, type checking, coverage, mutation testing for critical rules, CodeQL, dependency review,
  secret scanning, license scanning, and `npm pack` smoke testing;
- a lockfile, explicit package contents, SemVer policy, signed tags, release notes, and reproducible build metadata.

Initial quality floors:

- at least 90% branch coverage for verification, authorization, policy, and audit code;
- mutation score of at least 70% for critical deterministic rules;
- no known critical/high vulnerabilities accepted without an explicit, time-bounded exception;
- all security regression tests pass before merge.

## P1 — production-quality retrieval and operations

P1 turns a reliable single-node core into an operable service.

### Retrieval and evaluation

- hybrid BM25 + embeddings combined with reciprocal rank fusion;
- optional graph expansion, followed by a cross-encoder or provider-neutral reranker;
- multilingual query normalization, aliases, acronym handling, and typo tolerance;
- version-aware and temporal retrieval;
- public, neutral eval sets covering technical documentation, research, support, and policy-style corpora;
- measured `Recall@k`, `nDCG`, citation precision, grounded claim precision, abstention, contradiction handling,
  prompt-injection attack success, and benign over-refusal.

Suggested release targets on the project's declared benchmark—not universal guarantees:

- `Recall@8 >= 0.90`;
- citation ID validity `= 1.00`;
- grounded claim precision `>= 0.98`;
- out-of-domain abstention `>= 0.95`;
- contradiction handling `>= 0.95`;
- zero critical cross-tenant or unauthorized-tool successes in the versioned security suite.

### Service architecture

- split stable packages such as `core`, `connectors`, `providers`, `retrieval`, `server`, `cli`, and `ui`;
- keep filesystem storage as the simple default, with optional object-store, Postgres, and vector adapters;
- introduce queues, bounded workers, idempotency, cancellation, deadlines, and backpressure;
- implement authentication, RBAC, tenant-scoped indexes, distributed rate limits, quotas, cooldowns, and cost budgets;
- encrypt transport and stored sensitive data; isolate credentials by service and tenant;
- add versioned API contracts and generated SDKs;
- provide a human-review UI showing claim and evidence side by side with approve, reject, merge, supersede, and
  conflict-resolution actions;
- record a tamper-evident review and publication history.

### Observability and operations

- OpenTelemetry traces, structured logs, and metrics keyed by run/request/source/model/policy version;
- latency, retry, token, cost, cache, refusal, retrieval-miss, freshness, and guardrail metrics;
- privacy-preserving user/session identifiers and automatic log redaction;
- SLOs for availability, p95 latency, error rate, freshness, groundedness, and cost per successful answer;
- alerts, runbooks, backups, restore tests, one-operation rollback, canary release, and global kill switches;
- a `doctor`, `validate`, `plan`, `status`, `explain`, and `eval` CLI experience with actionable errors;
- Docker images and deployment examples that do not imply one required cloud provider.

P1 acceptance:

- the regression dashboard passes for every pull request;
- load tests stay inside declared latency, concurrency, and cost budgets;
- tenant-isolation tests show no cross-tenant retrieval or cache leakage;
- any published corpus can be rolled back without rebuilding;
- a complete trace reconstructs the evidence behind every answer;
- staging/canary operation meets the selected SLO window before general availability.

## P2 — advanced and enterprise capabilities

P2 is modular. Projects should adopt only the capabilities their threat model and users require.

- distributed, resumable large-source processing and an incremental claim/evidence graph;
- temporal knowledge with `validFrom`, `validTo`, `supersedes`, branch, release, and jurisdiction scopes;
- deterministic code, API, dataset, formula, unit-aware numeric, and statistical oracle adapters;
- calibrated multi-model adjudication as a signal, never evidence by itself;
- experiment-plan generation for hypotheses with stored fixtures, results, reviewers, and promotion rules;
- signed and sandboxed connector packages with capability manifests and policy packs;
- enterprise SSO/SAML, SCIM, tenant-managed keys, retention/deletion controls, residency options, and audit export;
- SBOMs, signed releases, npm provenance, SLSA-aligned builds, external penetration tests, and periodic threat-model
  reviews;
- governance files and process: `CONTRIBUTING`, `CODEOWNERS`, code of conduct, ADRs, support matrix, deprecation
  policy, release train, and responsible disclosure SLAs;
- a public benchmark comparing Veritas KB with plain RAG baselines on grounding, abstention, provenance, contradiction
  handling, and reviewed discovery precision.

P2 acceptance:

- an independent security assessment has no unresolved critical/high findings;
- tenant-isolation and disaster-recovery exercises are documented and repeatable;
- releases are reproducible, signed, and accompanied by SBOM/provenance;
- discovery precision is measured on an externally reviewed benchmark;
- no discovery finding can be published as established knowledge without evidence or a recorded review decision.

## Workstreams and ownership

Use independent workstreams, but keep P0 dependencies explicit:

| Workstream                | Owns                                                                   | Depends on                 |
| ------------------------- | ---------------------------------------------------------------------- | -------------------------- |
| Evidence and verification | schemas, independence, oracle verdicts, calibration                    | immutable source snapshots |
| Pipeline runtime          | manifests, atomic publish, budgets, resume/cache                       | schemas                    |
| Retrieval and answering   | indexes, filters, answer contract, citation validator                  | verified evidence model    |
| Security                  | threat model, ingestion/serve controls, abuse response, red-team suite | all trust boundaries       |
| Evaluation                | gold sets, metrics, release thresholds, over-refusal                   | stable contracts           |
| Platform                  | API, auth, tenancy, queues, storage, observability                     | safe P0 core               |
| Developer experience      | CLI, examples, docs, packaging, migrations                             | stable public interfaces   |
| Governance                | review policy, disclosure, releases, provenance                        | organizational ownership   |

## Release decision record

Every release candidate should answer these questions in a machine-readable report:

1. Which exact sources, snapshots, configs, prompts, models, and code produced it?
2. Which stages were complete, partial, skipped, degraded, or stale?
3. What percentage of claims are asserted, corroborated, oracle-verified, contradicted, unknown, or hypotheses?
4. Can every externally visible factual claim be traced to supporting evidence?
5. How did retrieval, grounding, citation, abstention, contradiction, and multilingual evals perform?
6. How did direct/indirect prompt injection, off-topic proxy abuse, leakage, cross-tenant, XSS, SSRF, and resource-abuse
   tests perform?
7. Did benign quality or over-refusal regress while security improved?
8. Are budgets, SLOs, incident controls, rollback, and owner contacts operational?
9. What known risks were accepted, by whom, until when, and with what compensating controls?

If any answer is absent, the release is not ready for an untrusted public runtime.
