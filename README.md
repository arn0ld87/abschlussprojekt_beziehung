# Sitzplan

Grafische, selbst gehostete Single-User-PWA zum Erstellen, dauerhaften Speichern, Wiederherstellen und KI-gestützten Optimieren von Sitzordnungen.

> **Projektstatus: M0 — Foundation.** Der aktuelle Stand ist ein Entwicklungsprototyp für Test- und Fantasiedaten. Nicht mit echten Schuldaten verwenden.

## Produktziel

Sitzplan unterstützt eine einzelne Lehrkraft beim visuellen Planen von Klassen, Räumen und Sitzordnungen. Der erste Release bleibt ein selbst gehosteter Prototyp und verarbeitet keine echten Schuldaten.

## MVP in Kürze

Das MVP verbindet Klassen- und Raumverwaltung, einen grafischen Sitzplan-Editor, sichere Speicherung und Wiederherstellung, einen deterministischen Optimierer, KI-gestützte Änderungsvorschläge sowie Druck- und Exportfunktionen.

## Geplanter Stack

Next.js mit App Router und TypeScript, React-Konva, PostgreSQL mit Drizzle ORM, Zod, Better Auth, Vercel AI SDK, IndexedDB und Docker Compose. Die bestätigte Architektur steht in `docs/product.md`.

## Entwicklungsstatus

Der verifizierte Istzustand steht in `docs/STATUS.md`. Produktcode ist noch nicht begonnen; der aktuelle Freigabepunkt ist M0.

## Dokumentationshierarchie

`README.md` → `docs/STATUS.md` → `ROADMAP.md` → GitHub Issues

Diese Reihenfolge trennt Einstieg, überprüfbaren Istzustand, strategische Milestones und ausführbare Arbeit. Produkt- und Architekturdetails bleiben verbindlich in:

- [`docs/product.md`](docs/product.md) — bestätigte Produkt- und Architekturspezifikation (Was und Wie).
- [`docs/architecture.md`](docs/architecture.md) — Modulgrenzen, Abhängigkeitsrichtung und Verträge (Wie im Detail).

## Arbeitsweise

Ein GitHub Issue beschreibt einen vertikalen, testbaren Slice. Änderungen folgen RED → GREEN → Refactor und werden mit passenden Prüfungen sowie einem unabhängigen Review abgeschlossen.

## Projektgrenzen

Keine Mehrbenutzerfunktionen, keine Echtzeit-Zusammenarbeit und keine Freigabe für echte Schuldaten gehören zum MVP. KI darf nur validierte Änderungsvorschläge erzeugen und verändert nie direkt Datenbank oder Canvas.

## Repository

Ziel-Repository: `arn0ld87/abschlussprojekt_beziehung`.
