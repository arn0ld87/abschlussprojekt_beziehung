# Roadmap

Diese Roadmap beschreibt ausschließlich strategische Auslieferungsschritte. Konkrete Umsetzung, Akzeptanzkriterien und Blocker werden in GitHub Issues gepflegt.

## M0 — Foundation

**Ziel:** Repository, Dokumentation, CI, Docker und Designsystem bilden eine verifizierbare Grundlage für die Produktentwicklung.

**Freigabekriterien:** Governance, Architekturentscheidungen, Agentenworkflow, Dokumentationsgate und Milestone-Planung sind überprüft.

**Nicht enthalten:** Produktfunktionen für Klassen, Räume oder Sitzpläne.

## M1 — Klassen

**Ziel:** Auth, Klassen, Schülerprofile, Fotos und CSV stehen als fachliche Grundlage bereit.

**Freigabekriterien:** Die Klassenverwaltung erfüllt ihre spezifizierten Akzeptanzpfade und speichert ausschließlich Prototypdaten.

**Nicht enthalten:** Raumplanung, Sitzplatzzuordnung und Optimierung.

## M2 — Raumeditor

**Ziel:** Maße, Raster, Möbel, Drag-and-drop und Rotation ermöglichen wiederverwendbare Raumvorlagen.

**Freigabekriterien:** Raumvorlagen und adressierbare Sitzplätze sind über die vereinbarten Verträge verifiziert.

**Nicht enthalten:** Dauerhafte Sitzpläne, Versionen und KI-Unterstützung.

## M3 — Persistente Pläne

**Ziel:** Zuordnung, Autosave, Versionen, Restore und Papierkorb machen Sitzpläne dauerhaft nutzbar.

**Freigabekriterien:** Speichern, Konfliktbehandlung, Wiederherstellung und reversible Löschung sind entlang der Produktspezifikation geprüft.

**Nicht enthalten:** Optimierung, KI-Chat und Ausgabeformate.

## M4 — Optimierer

**Ziel:** Regeln, Konflikte, Scoring und reproduzierbare Vorschläge ergänzen den Sitzplan um fachliche Optimierung.

**Freigabekriterien:** Harte Regeln, nachvollziehbare Konflikte und deterministische Ergebnisse sind verifiziert.

**Nicht enthalten:** Sprachmodell-Interpretation oder direkte KI-Änderungen.

## M5 — KI-Assistent

**Ziel:** BYOK, Ollama, Chat, Commands und Vorschau übersetzen natürliche Wünsche in validierte Vorschläge.

**Freigabekriterien:** Providerzugriff, Command-Validierung und bestätigungspflichtige Vorschauen sind geprüft.

**Nicht enthalten:** Direkte Mutation von Canvas, Diensten oder Datenbank durch ein Sprachmodell.

## M6 — Ausgabe und PWA

**Ziel:** Offline-Entwurf, Druck, PDF, PNG und Import/Export machen den Prototyp alltagstauglich.

**Freigabekriterien:** Die vereinbarten Ausgabe- und Übertragungsabläufe sind mit wiederherstellbaren Daten geprüft.

**Nicht enthalten:** Produktivfreigabe für echte Schuldaten.

## M7 — MVP-Härtung

**Ziel:** E2E, Accessibility, Backup/Restore, Dokumentation und Release härten den MVP-Prototypen ab.

**Freigabekriterien:** Zentrale Akzeptanzpfade, Zugänglichkeit, Backup/Restore und Release-Gates sind grün.

**Nicht enthalten:** Erweiterungen nach dem MVP oder Mehrbenutzerbetrieb.

## M8 — Erweiterter Raumeditor

**Ziel:** Runde Tische, Tischgruppen, U-Formen und frei definierte Sitzplätze erweitern den Raumeditor.

**Freigabekriterien:** Neue Raumformen bleiben mit den bestehenden Canvas- und Sitzplatzverträgen kompatibel.

**Nicht enthalten:** Änderungen am Persistenzmodell ohne separate Entscheidung.

## M9 — Persistenzmodell v2

**Ziel:** Granularere relationale Speicherung einzelner Raum- und Sitzobjekte wird nur bei nachgewiesenem Nutzen vorbereitet.

**Freigabekriterien:** Ein akzeptiertes ADR belegt Bedarf, Migration und Nutzen gegenüber dem Snapshot-Ansatz.

**Nicht enthalten:** Eine Umsetzung ohne vorherige Architekturentscheidung.

## M10 — Audit-Historie

**Ziel:** Vollständiges Ereignisprotokoll und feingranulare Zeitreise werden bei nachgewiesenem Bedarf bewertet.

**Freigabekriterien:** Ein akzeptiertes ADR belegt, dass Snapshots reale Anforderungen nicht ausreichend erfüllen.

**Nicht enthalten:** Ereignisprotokollierung ohne Entscheidung und tragfähiges Persistenzkonzept.

## M11 — Mehrbenutzerbetrieb

**Ziel:** Rollen, getrennte Datenbereiche und gemeinsame Vorlagen öffnen das Produkt für mehrere Nutzende.

**Freigabekriterien:** Autorisierung, Datenisolation und gemeinsame Vorlagen sind gegen die dafür freigegebenen Anforderungen geprüft.

**Nicht enthalten:** Eine implizite Freigabe für echte Schuldaten.

## M12 — Produktivfreigabe

**Ziel:** Datenschutzkonzept, Löschfristen, technische Schutzmaßnahmen und Freigabeprozess ermöglichen den Umgang mit echten Schuldaten.

**Freigabekriterien:** Datenschutz, technische Schutzmaßnahmen, Betriebsprozesse und eine ausdrückliche Produktfreigabe sind nachweisbar erfüllt.

**Nicht enthalten:** Eine Freigabe ohne dokumentierte Prüfung und explizite Entscheidung.
