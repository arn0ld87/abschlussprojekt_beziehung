# src/services

Application Services — orchestrieren Anwendungsfälle gegen die Domäne.

## Abhängigkeitsrichtung

`services` importiert aus `src/domain` und verknüpft Anwendungsfälle über Repositories/Infrastruktur-Ports. UI ruft Services über Route-Handler auf, niemals direkt.

## Status M1

- `src/services/auth`: `AuthService` und `getSession()` Helper für Benutzerregistrierung, Anmeldung, Abmeldung und Session-Validierung.
