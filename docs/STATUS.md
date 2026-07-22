# Projektstatus

**Stand:** 22.07.2026<br>
**Phase:** M0 — Foundation<br>
**Produktcode:** noch nicht begonnen

## Verifiziert vorhanden

- bestätigte Produkt- und Architektur-Spezifikation unter `docs/product.md`
- Zielstack und MVP-Grenzen sind entschieden
- Projekt-Bootstrap, Agentenworkflow und Dokumentationsgate sind verifiziert
- dreizehn offene Milestone-Parent-Issues mit dokumentierten Blockern

## Noch nicht vorhanden

- Next.js-Anwendung
- Datenbankschema und Migrationen
- automatisierte Produkt-Tests
- Docker-Laufzeit
- Release-Artefakt

## Nächster Freigabepunkt

Die einzige aktuelle Frontier ist [M0 — Foundation](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/2). Das Parent-Issue wird vor Umsetzung über `/to-tickets` in ausführbare Child-Slices zerlegt; es ist selbst nicht `ready-for-agent`.

## Milestone-Frontier

| Milestone | Parent-Issue | Status |
|---|---|---|
| M0 | [#2 Foundation: Repository und Agentenworkflow](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/2) | einzige aktuelle Frontier |
| M1 | [#3 Klassen: Auth, Klassen und Schülerprofile](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/3) | blockiert durch M0 |
| M2 | [#4 Raumeditor: Maße, Möbel und Sitzplätze](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/4) | blockiert durch M0 |
| M3 | [#5 Persistente Pläne: Autosave, Versionen und Restore](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/5) | blockiert durch M1 und M2 |
| M4 | [#6 Optimierer: Regeln, Konflikte und reproduzierbare Vorschläge](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/6) | blockiert durch M3 |
| M5 | [#7 KI-Assistent: BYOK, Chat und validierte Commands](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/7) | blockiert durch M4 |
| M6 | [#8 Ausgabe und PWA: Entwürfe, PDF, PNG und Import/Export](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/8) | blockiert durch M3 |
| M7 | [#9 MVP-Härtung: E2E, Accessibility, Backup und Release](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/9) | blockiert durch M4, M5 und M6 |
| M8 | [#10 Erweiterter Raumeditor: Tischgruppen und freie Sitzplätze](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/10) | blockiert durch M7 |
| M9 | [#11 Decision Gate: Granulareres Persistenzmodell](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/11) | blockiert durch M7 |
| M10 | [#12 Decision Gate: Ereignisprotokoll und Zeitreise](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/12) | blockiert durch M7 und M9 |
| M11 | [#13 Mehrbenutzerbetrieb: Rollen und gemeinsame Vorlagen](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/13) | blockiert durch M7 |
| M12 | [#14 Produktivfreigabe für echte Schuldaten](https://github.com/arn0ld87/abschlussprojekt_beziehung/issues/14) | blockiert durch M11 |
