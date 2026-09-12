# Security Policy

Resux treats vulnerabilities in the framework runtime, compiler, CLI, build pipeline, generated templates, and release tooling as release-critical issues.

## Supported versions

Before `1.0.0`, security fixes are applied to the latest published `0.x` release line when practical.

After `1.0.0` is released, the latest stable `1.x` release line is the supported production line. Older minors may receive fixes when a safe backport is practical, but users should upgrade to the latest stable release for security updates. Prerelease versions are not intended for production use.

## Reporting a vulnerability

Please do not publish exploit details, credentials, private data, or a working proof of concept in a public issue.

Use GitHub's **Report a vulnerability** / private vulnerability reporting flow for this repository when it is available. Include:

- the affected Resux version or commit;
- the affected package, runtime, compiler, CLI, template, or workflow;
- reproduction steps with the minimum data needed to demonstrate the issue;
- the expected impact and realistic attack prerequisites;
- any proposed mitigation or patch, if known.

If private vulnerability reporting is unavailable, open a public issue containing only a request for a private security contact. Do not include sensitive vulnerability details in that issue.

## What happens after a report

Maintainers will validate the report, determine affected versions, prepare tests and a fix, and coordinate disclosure when appropriate. Security fixes should include regression coverage whenever the issue can be reproduced safely.

A report may be closed as not applicable when it depends on behavior outside Resux's control, requires an already-compromised trusted maintainer or release environment, or cannot affect supported Resux versions. The reasoning should be documented without exposing sensitive exploit details.

## Release security expectations

Production releases should not be cut with known release-blocking security findings. Release candidates should pass the repository's required quality, compatibility, packaging, deployment, and security checks before publication.

Release credentials must not be committed to the repository or embedded in generated packages. GitHub Actions used for publishing should follow least privilege, pin third-party actions to reviewed commits, and prefer short-lived trusted-publishing credentials with provenance over long-lived npm tokens.
