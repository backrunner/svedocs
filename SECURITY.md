# Security Policy

## Supported Versions

svedocs is pre-1.0. Security fixes target the current `main` development line until the first stable release is published.

## Reporting a Vulnerability

Do not open a public issue for exploitable vulnerabilities. Report privately to the project maintainers with:

- affected package and version or commit;
- reproduction steps;
- impact assessment;
- whether credentials, Cloudflare bindings, generated OG assets, or search/AI endpoints are involved.

The maintainers will acknowledge the report, validate impact, prepare a fix, and coordinate disclosure timing before publishing details.

## Secret Handling

The repository must not contain real Cloudflare API tokens, account IDs, AI provider keys, private endpoints, or production `.dev.vars` values. Commit only placeholder examples in `.dev.vars.example` and template documentation.

## Deployment and Provider Tests

Cloudflare deploy, AI Search upload, and external provider tests should be opt-in through environment variables. Default test runs must not contact authenticated production services.
