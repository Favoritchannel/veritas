# Troubleshooting

## The example stops before audit

Run the failing stage directly and inspect `out/veritas.log`. The bundled example should not need model-provider keys.
Clear only the example's generated `out/` directory before reproducing; never delete an unrelated project path.

## A collector is skipped

Some collectors require an external package, credential, binary, network endpoint, or data export. Read
[Source modules](source-modules.md), install only the connector dependency you need, and keep credentials in the
configured environment file.

## The graph does not open

Confirm `graph.html` exists and is larger than an empty shell. Serve it from a local static HTTP server if the browser
restricts local-file behavior. A successful local audit currently checks the artifact, not complete browser behavior;
see the [production roadmap](production-roadmap.md).

## An audit says GO but the corpus is not trustworthy

The current local GO is a structural pipeline result, not factuality, source-independence, freshness, or production
security certification. Review `verified.json`, source provenance, contradictions, and oracle coverage manually.

## Repository checks fail

Run the failing command separately:

```bash
npm run lint:code
npm run lint:markdown
npm run lint:repository
npm run format:check
npm test
npm run pack:check
```

The repository deliberately rejects Cyrillic characters in tracked text. Runtime corpora may still be multilingual;
use Unicode-aware code without embedding a specific alphabet range in the repository.
