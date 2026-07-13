# Changelog

All notable project changes are documented here. The project intends to follow
[Semantic Versioning](https://semver.org/) once public API stability begins.

## Unreleased

### Added

- A concise, domain-neutral explanation of what people can build with veritas, who benefits most, and what the
  template does not promise.
- [`docs/production-roadmap.md`](docs/production-roadmap.md), a prioritized P0–P2 plan covering evidence semantics,
  reproducible runs, meaningful audit gates, retrieval, ingestion, testing, CI, service operations, observability,
  governance, and enterprise capabilities.
- [`docs/security-and-abuse.md`](docs/security-and-abuse.md), a provider-informed threat model and implementation
  blueprint for prompt injection, off-topic proxy abuse, hallucination, RAG poisoning, tool safety, data leakage,
  output handling, rate limits, escalating cooldowns, denial of wallet, monitoring, red teaming, and incident
  response.
- [`SECURITY.md`](SECURITY.md), with a private reporting path, safe-research expectations, and an explicit statement
  of the current security maturity.

### Changed

- Expanded the README security section to distinguish existing local secret handling from the controls required for
  an untrusted public deployment.
- Updated the agent runbook so a local audit `GO` is not reported as a production security or factuality
  certification.
- Added direct links to the security blueprint, roadmap, security policy, and changelog in the README documentation
  map.
- Clarified that veritas is a reusable template for focused knowledge products across many domains, not a prebuilt
  knowledge base for one industry and not an automatic truth machine.

### Why

The original README explained the pipeline well but could leave newcomers unsure who should use it and could make a
successful local `GO` build sound stronger than the current production guarantees. This update makes the intended
audience and use cases explicit, documents the work required for a best-in-class implementation, and prevents prompt
wording from being mistaken for a complete security boundary.
