# Security policy

## Current data boundary

Sitzplan is an M0 development prototype for test and fantasy data. It is not approved for production data: **no real student data** may be used while the repository is public. Production-data readiness belongs to M12 and is not an implied current property of the application or repository.

Never place secrets, real student data or identifying production data in git, logs, fixtures or prompts. Sanitize diagnostics and examples before sharing them.

Provider keys must enter through runtime configuration only. Do not commit keys, embed them in client bundles, store them in fixtures or copy them into prompts. Local runtime configuration must remain outside version control.

## Reporting a vulnerability

Use GitHub Private Vulnerability Reporting under **Security → Report a vulnerability** as the sole private reporting channel. The repository owner must enable that feature before any external release or invitation for external vulnerability reports. Until it is enabled, do not solicit external reports; there is no public issue fallback.

Do not open a public issue or disclose reproduction details publicly before the owner has assessed and coordinated a fix. In the private report, include the affected revision, impact, minimal reproduction steps and any known mitigations without including real student data or secrets.

The repository does not currently claim a public security response SLA. The owner coordinates acknowledgement, remediation and disclosure appropriate to the prototype stage.
