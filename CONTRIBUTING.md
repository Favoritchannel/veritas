# Contributing to Veritas KB

Thank you for helping improve Veritas KB. This project welcomes focused bug fixes, tests, documentation, security
hardening, source connectors, and evidence-model improvements.

## Before you start

- Search existing issues and pull requests before opening a duplicate.
- Use a discussion issue for a substantial design change before investing in an implementation.
- Report vulnerabilities privately according to [SECURITY.md](SECURITY.md).
- Keep pull requests small enough to review and explain the user-facing reason for the change.

## Development setup

Requirements: Node.js 22.13 or newer and npm 11.

```bash
git clone https://github.com/Favoritchannel/veritas.git
cd veritas
npm ci --ignore-scripts
npm run check
```

The core example is keyless and must remain deterministic:

```bash
npm run example
```

Generated files under `out/`, local corpora, credentials, and model-provider keys must never be committed.

## Repository language

Repository-facing prose, filenames, identifiers, examples, issue text, and pull-request text must be in English. The
runtime may process multilingual corpora. Use Unicode character properties such as `\p{L}` and `\p{N}` instead of
hard-coded language-specific alphabet ranges. `npm run lint:repository` enforces a Cyrillic-free repository and valid
UTF-8 text.

## Pull-request checklist

1. Add or update tests for changed behavior.
2. Update documentation and the Unreleased changelog when users are affected.
3. Run `npm run check` on a clean checkout.
4. Confirm `npm run pack:check` excludes local data and generated outputs.
5. Explain security, compatibility, or migration impact where applicable.
6. Do not claim factual verification, production readiness, or attack immunity beyond what the implementation tests.

## Commit and review expectations

Use concise, imperative commit subjects. Maintainers may request changes for correctness, scope, security, tests,
documentation, or maintainability. At least one maintainer approval and all required checks are expected before a
merge. Squash merging is preferred for a focused pull request.

By contributing, you agree that your contribution is licensed under the repository's [MIT License](LICENSE) and that
you have the right to submit it.
