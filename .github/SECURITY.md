# Security Policy

This file is GitHub's standard vulnerability-reporting policy for this
repository. For the platform's full technical security posture
(authentication, authorization, CORS, logging, secrets handling), see
[docs/SECURITY.md](../docs/SECURITY.md).

## Supported Versions

| Version | Supported |
| --- | --- |
| v1.0.0-beta (current) | ✅ Yes |
| Pre-release / unversioned commits | ❌ No |

This project is currently in **beta** — see
[docs/RELEASE_NOTES_v1.0.0-beta.md](../docs/RELEASE_NOTES_v1.0.0-beta.md)
for known limitations. Only the latest `main` branch is actively
maintained; there is no long-term support (LTS) branch at this stage.

## Reporting Vulnerabilities

**Do not open a public GitHub issue for a security vulnerability.**
Public issue templates (see `.github/ISSUE_TEMPLATE/`) are for
functional bugs, not security reports.

Instead:

1. Use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability)
   feature (Security tab → "Report a vulnerability") if enabled for this
   repository, **or**
2. Contact the repository owner directly (see [CODEOWNERS](CODEOWNERS))
   with a description of the issue, affected component(s), and
   reproduction steps.

Please include:

- The affected app/area (Storefront, Admin Portal, API, Background
  Worker, Firestore Rules).
- Steps to reproduce, or a proof of concept.
- The potential impact as you understand it.

You should receive an acknowledgment within a reasonable timeframe.
Given this is a small, actively-developed project rather than a
dedicated security team, please be patient — but a genuine, exploitable
vulnerability will be treated as a priority.

## Responsible Disclosure

- Please give the maintainer a reasonable opportunity to investigate and
  remediate a reported issue before any public disclosure.
- Do not access, modify, or exfiltrate data beyond what's necessary to
  demonstrate the vulnerability.
- Do not perform testing that could degrade the service for real users
  (e.g. no load testing, no bulk data manipulation, no spamming the
  WhatsApp send endpoint — see [Known limitations](../docs/SECURITY.md#rate-limiting)
  regarding the current lack of rate limiting).
- Automated scanning for *known* categories (dependency CVEs, exposed
  `.env` files, etc.) is welcome; active exploitation is not.

## Secret Management

- Real secrets (Meta WhatsApp access token, Firebase service-account
  private key) are **never** committed to this repository. Production
  secrets live in the relevant deployment platform's environment
  variable settings (Render for `api/`).
- `api/appsettings.Development.json` and `api/appsettings.*.local.json`
  are git-ignored specifically because they are the expected local
  location for a developer's real credentials during development — see
  [.gitignore](../.gitignore).
- If you discover a real secret committed to this repository's history
  (past or present), report it immediately via the process above — this
  requires token rotation, not just a follow-up commit removing it (git
  history retains it regardless).

## Environment Variables

All configuration that varies by environment or contains a secret is
supplied via environment variables, never hardcoded:

- `api/` uses ASP.NET Core's double-underscore convention
  (`Firebase__PrivateKey`, `WhatsApp__AccessToken`, etc.) — see
  [docs/setup/environment-variables.md](../docs/setup/environment-variables.md)
  for the complete list.
- `web/`'s Firebase **web** config (`apiKey`, etc.) is intentionally
  public and committed — Firebase's security model relies on Firestore/
  Storage Security Rules, not client key secrecy. This is not an
  oversight; see [docs/SECURITY.md](../docs/SECURITY.md#secrets).

See also: [docs/FIREBASE_SETUP.md](../docs/FIREBASE_SETUP.md),
[docs/META_WHATSAPP_SETUP.md](../docs/META_WHATSAPP_SETUP.md).
