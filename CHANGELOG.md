# Changelog

All notable project changes are documented here. The project intends to follow
[Semantic Versioning](https://semver.org/) once public API stability begins.

## Unreleased

### Added

- Professional repository foundations: contribution, conduct, governance, support, release, compatibility,
  troubleshooting, and documentation-index files.
- GitHub issue forms, pull-request template, CODEOWNERS, Dependabot configuration, and SHA-pinned workflows for CI,
  CodeQL, dependency review, OpenSSF Scorecard, and draft release artifacts.
- Node built-in unit, CLI, retrieval, and isolated keyless pipeline tests.
- ESLint, Markdown lint, Prettier, local-link validation, Mermaid parsing, JSON validation, UTF-8 checks, and an
  automated English-only/Cyrillic-free repository gate.
- A JSON Schema for the example project configuration.
- A package-content check that prevents generated output, logs, environment files, caches, and local project data from
  entering a package archive.

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

- Raised the supported runtime floor from end-of-life Node.js 18 to Node.js 22.13 and added Node 22/24 CI coverage on
  Linux, macOS, and Windows.
- Replaced language-specific Cyrillic regular-expression ranges with Unicode property escapes, preserving
  multilingual corpus processing while keeping repository content English-only.
- Marked the package private until a deliberate trusted-publishing release process is enabled, added a strict file
  allowlist, and removed automatically installed Playwright from the core package.
- Reworded status, verification, discovery, audit, cost, and security claims to match the alpha implementation rather
  than the target roadmap.
- Fixed the GitHub-rendered Mermaid diagram by replacing a reserved `graph` node identifier.
- Fixed an unmatched Markdown fence in the operating guide and corrected connector/config documentation drift.

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
