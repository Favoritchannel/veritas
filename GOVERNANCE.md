# Governance

veritas currently uses a maintainer-led governance model appropriate for an early-stage reference implementation.

## Roles

- **Maintainer:** sets project direction, reviews and merges changes, manages releases, security reports, repository
  settings, and contributor access. The current maintainer is
  [@Favoritchannel](https://github.com/Favoritchannel).
- **Contributor:** proposes and implements changes through issues and pull requests.
- **Security reporter:** follows [SECURITY.md](SECURITY.md) and coordinates disclosure privately.

## Decisions

Routine changes are decided through pull-request review. Material changes to the evidence model, trust semantics,
security boundaries, public interfaces, or compatibility policy should begin with an issue and be recorded in a short
architecture decision record under `docs/adr/` when accepted.

The maintainer has final responsibility for merge and release decisions. Decisions should cite technical evidence,
document important tradeoffs, and avoid overstating the implementation's guarantees.

## Becoming a maintainer

Sustained contributors may be invited based on sound judgment, reliable reviews, security awareness, respectful
collaboration, and consistent ownership. Access follows least privilege and can be reduced when it is no longer
needed.

## Changes to governance

Governance changes use the same public pull-request process as code changes. Emergency security actions may be taken
privately first and documented after disclosure is safe.
