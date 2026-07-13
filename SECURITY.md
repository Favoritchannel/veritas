# Security policy

## Project status

Veritas KB is currently an early reference implementation. The local CLI demonstrates the architecture, but it should
not be exposed directly as an untrusted public service without the controls described in
[Security, prompt injection, and abuse prevention](docs/security-and-abuse.md).

No LLM deployment can promise complete immunity to prompt injection or hallucination. Security reports that show a
realistic path to unauthorized data access, cross-tenant disclosure, unsafe tool execution, secret leakage, stored
script execution, SSRF, denial of wallet, or bypass of a documented control are especially valuable.

## Reporting a vulnerability

Please do not open a public issue for an unpatched vulnerability.

Use GitHub's private vulnerability reporting for this repository:

1. Open the repository's **Security** tab.
2. Select **Report a vulnerability**.
3. Include the affected commit/version, prerequisites, reproduction steps, impact, and a minimal proof of concept.
4. Remove API keys, personal data, private corpora, and unrelated secrets from the report.

If private reporting is unavailable, open a public issue containing no exploit details and ask the maintainer for a
private contact channel.

## What to expect

- acknowledgement as soon as a maintainer is available;
- validation and severity assessment before a public disclosure date is agreed;
- coordinated remediation and a regression test where practical;
- credit in the advisory unless the reporter prefers anonymity.

Response times are best-effort until the project publishes a formal supported-version and security-SLA policy.

## Safe research rules

- Test only installations, accounts, tenants, data, and API keys you own or are explicitly authorized to use.
- Do not access, modify, retain, or disclose another person's data.
- Avoid denial of service, high-volume best-of-N attacks, or provider-cost generation against public deployments.
- Stop after demonstrating minimum impact and report promptly.
- Follow the model provider's usage policy and coordinated disclosure program.

## Security design

The security blueprint covers:

- direct and indirect prompt injection;
- topic restriction and general-model proxy abuse;
- evidence grounding and hallucination containment;
- source poisoning and ingestion quarantine;
- tool authorization, sandboxing, and data exfiltration;
- safe output handling;
- authentication, tenancy, rate limiting, cooldowns, and denial of wallet;
- logging, red-team evaluation, incident response, and kill switches.

See [the production roadmap](docs/production-roadmap.md) for implementation order and release criteria.
