# Release process

Veritas KB uses Semantic Versioning while the public interface is unstable: `0.x` releases may contain breaking changes,
which must be called out in the changelog and release notes.

The npm package is intentionally private today. Releases are source and package-preview artifacts for review; npm
publishing requires a separate decision, trusted publishing through OIDC, provenance, and maintainer approval.

## Release checklist

1. Confirm the branch is current and the worktree is clean.
2. Move relevant Unreleased changelog entries into a dated version section.
3. Set the same version in `package.json` and `package-lock.json`.
4. Run `npm ci --ignore-scripts` and `npm run check` on a clean checkout.
5. Review the exact output of `npm pack --dry-run --json`.
6. Create a signed, annotated `vX.Y.Z` tag from a protected commit and push the tag.
7. Approve the protected `release` environment after the tag workflow passes.
8. Review the draft GitHub Release, package tarball, checksum, and artifact attestation before publishing the release.

Never publish from a developer laptop with a long-lived registry token. See the
[production roadmap](docs/production-roadmap.md) for the future npm and supply-chain release requirements.
