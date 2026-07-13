# Compatibility

## Runtime support

The supported runtime lines are Node.js 22 and 24 on Linux, macOS, and Windows. The package currently declares Node
22.13 or newer because the repository's maintained quality tools require that baseline. Continuous integration tests
both supported LTS lines.

Support follows maintained Node.js release lines. A runtime may be removed after it reaches end of life; such a change
is documented in the changelog.

## Interface stability

Veritas KB is currently `0.x` software. Configuration fields, artifact schemas, status semantics, and CLI behavior may
change between minor releases. Pin a commit or release for production experiments and review migrations before
upgrading.

The current supported interface is the CLI and documented file artifacts. No stable programmatic JavaScript API is
promised yet.

## Model providers and connectors

The LLM client supports OpenAI-compatible and Anthropic-compatible endpoint shapes. A compatible HTTP shape does not
guarantee equivalent model behavior. Test every provider and model against a domain-specific evaluation set.

Connectors that require third-party packages are opt-in and may have narrower platform requirements. Their absence
must produce an explicit skip rather than silently implying successful ingestion.
