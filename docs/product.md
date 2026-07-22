# Sitzplan — Produkt- und Architekturdesign

**Stand:** 22.07.2026  
**Status:** schriftlich freigegebene und bestätigte Spezifikation
**Ziel-Repository:** `arn0ld87/abschlussprojekt_beziehung`, derzeit öffentlich; vor einer Nutzung mit echten Daten auf privat umzustellen  
**Ziel:** selbst gehostete Single-User-PWA zum grafischen Planen, Speichern, Wiederherstellen und KI-gestützten Optimieren von Sitzordnungen

## 1. Problem

Lehrkräfte benötigen für Sitzpläne mehr als eine statische Tabelle. Räume unterscheiden sich in Größe und Einrichtung, Tische müssen frei angeordnet werden können, Schüler wechseln ihre Plätze und mehrere Planstände sollen dauerhaft verfügbar bleiben. Ein nur im Browser-Tab gespeicherter Zustand ist dafür ungeeignet. Gleichzeitig soll eine KI natürlich formulierte Änderungswünsche verstehen und bei der Sitzordnung helfen, ohne unkontrolliert den Plan zu verändern.

## 2. Produktziel

Sitzplan wird eine grafische, selbst gehostete Anwendung für eine einzelne Lehrkraft. Die Anwendung verwaltet wiederverwendbare Klassen und Raumvorlagen. Aus einer Klasse und einem Raum entstehen beliebig viele Sitzpläne. Änderungen werden automatisch in PostgreSQL gespeichert, lokal zwischengesichert und über benannte Versionen wiederherstellbar gemacht.

Der erste Release ist ausdrücklich ein Prototyp für Test- und Fantasiedaten. Eine Freigabe für echte Schuldaten ist nicht Bestandteil des MVP.

## 3. MVP-Funktionsumfang

1. Anmeldung für eine einzelne Lehrkraft.
2. Verwaltung mehrerer Klassen.
3. Schülerprofile mit Name, Initialen/Farbe, Foto, Lernstand, Verhalten, Freitextnotizen und strukturierten Sitzregeln.
4. CSV-Import für Klassenlisten.
5. Wiederverwendbare Raumvorlagen mit Breite, Länge und einstellbarem Raster.
6. Standardobjekte: rechteckiger Tisch, Doppeltisch, Lehrertisch, Tafel, Tür und Fenster.
7. Verschieben, Drehen, Duplizieren und Löschen von Raumobjekten.
8. Definierte Sitzplätze an Tischen.
9. Drag-and-drop-Zuordnung von Schülern zu Sitzplätzen.
10. Sichtbare Ablage für noch nicht platzierte Schüler.
11. Undo/Redo innerhalb der laufenden Bearbeitung.
12. Lokale Entwurfssicherung in IndexedDB.
13. Serverseitiges Autosave mit Revisionskontrolle.
14. Benannte, unveränderliche Planversionen mit Vorschau und Wiederherstellung.
15. Papierkorb statt sofortiger endgültiger Löschung.
16. Regelbasierter, deterministischer Sitzplanoptimierer.
17. KI-Chat für natürlich formulierte Regeln und Planänderungen.
18. Änderungsvorschau vor Übernahme von KI-Kommandos.
19. Konfigurierbarer OpenAI-kompatibler BYOK-Endpunkt.
20. Ollama-Unterstützung.
21. Druckansicht, PDF- und PNG-Export.
22. Blickrichtung wahlweise von der Tafel oder aus Sicht der Klasse.
23. Export und Import einer Klasse einschließlich Raum und Sitzplänen.
24. Docker-Compose-Installation, Healthcheck, Backup und Restore.

## 4. Nicht im MVP

- mehrere Benutzer, Rollen oder Mandanten
- Echtzeit-Zusammenarbeit
- runde Tische, U-Formen und frei zusammengesetzte Tischgruppen
- beliebig geformte Möbel
- vollständige Ereignishistorie jeder einzelnen Bewegung
- native iOS- oder Android-App
- Freigabe für den produktiven Einsatz mit echten Schuldaten
- Schulverwaltung, Notenbuch, Anwesenheit oder Unterrichtsplanung
- automatisches Verschicken oder Teilen von Sitzplänen

## 5. Nutzerabläufe

### 5.1 Ersteinrichtung

Die Lehrkraft meldet sich an, legt eine Klasse an oder importiert eine CSV-Datei, ergänzt bei Bedarf Profile und erstellt anschließend eine Raumvorlage mit realen Maßen.

### 5.2 Manuelles Planen

Die Lehrkraft wählt Klasse und Raum, erstellt einen Sitzplan und zieht Schüler aus der Ablage auf Sitzplätze. Der Editor zeigt jederzeit den Speicherzustand. Nach einem Neuladen wird der zuletzt bestätigte Serverstand geöffnet; ein neuerer lokaler Entwurf wird zur Wiederherstellung angeboten.

### 5.3 KI-Optimierung

Die Lehrkraft hinterlegt Regeln oder formuliert sie im Chat. Der Chat übersetzt Sprache in validierte Domänenkommandos. Der deterministische Optimierer berechnet daraus einen Vorschlag und meldet unlösbare Konflikte. Die Lehrkraft sieht eine Vorschau mit Begründung und entscheidet, ob der Vorschlag angewendet wird.

### 5.4 Versionen und Restore

Die Lehrkraft benennt wichtige Stände, beispielsweise „Nach den Herbstferien“. Beim Wiederherstellen wird der alte Stand nicht überschrieben. Stattdessen entsteht daraus eine neue aktuelle Revision, während die Historie erhalten bleibt.

### 5.5 Ausgabe

Die Lehrkraft wählt Blickrichtung und sichtbare Angaben. Die Anwendung erzeugt eine druckoptimierte Vorschau sowie PDF und PNG.

## 6. Visuelle Richtung

Die Oberfläche kombiniert „Klassenatelier“ und „Digitaler Lehrertisch“:

- warmer, ruhiger und heller Grundstil
- große Raumfläche als Mittelpunkt
- zurückhaltende Werkzeuge am Rand
- klare Kopfzeile mit Klasse, Speicherstatus und KI-Assistent
- Schülerablage am unteren Rand
- freundliche Initialen- und Farbmarkierungen
- kein dunkler CAD- oder Observability-Look
- keine generische Lovable-/KI-Dashboard-Optik

Die Bedienung soll sich wie ein spezialisiertes Lehrerwerkzeug anfühlen, nicht wie eine technische Zeichenanwendung.

## 7. Technische Architektur

### 7.1 Stack

- Next.js mit App Router
- TypeScript im Strict Mode
- React und React-Konva für den Raumeditor
- PostgreSQL
- Drizzle ORM und versionierte SQL-Migrationen
- Zod als Laufzeit- und Vertragsvalidierung
- Better Auth mit E-Mail/Passwort und PostgreSQL-Adapter
- Vercel AI SDK mit OpenAI-kompatiblem Provider und Ollama-Adapter
- IndexedDB für lokale Entwürfe
- Docker Compose für Anwendung und PostgreSQL

Es wird keine separate Backend-Anwendung eingeführt. Next.js Route Handler delegieren an framework-unabhängige Services. UI-Komponenten greifen nicht direkt auf Datenbank oder KI-Provider zu.

### 7.2 Module

| Modul | Verantwortung |
|---|---|
| Klassenbuch | Klassen, Schülerprofile, Fotos und CSV-Import |
| Raumplaner | Maße, Raster, Möbel und Sitzplätze |
| Sitzplan-Editor | Platzierung, Auswahl, Undo/Redo und lokale Entwürfe |
| Persistenz | Autosave, Revisionen, Snapshots, Papierkorb und Restore |
| Regelwerk | Harte Regeln, gewichtete Wünsche, Konflikte und Bewertung |
| Optimierer | Reproduzierbare Sitzvorschläge ohne LLM-Abhängigkeit |
| KI-Assistent | Chat, strukturierte Kommandos, Vorschau und Erklärung |
| Export | Druckansicht, PDF und PNG |
| Provider | OpenAI-kompatible Verbindung, Ollama und Verbindungstest |
| Betrieb | Authentifizierung, Backup, Restore und Healthchecks |

### 7.3 Abhängigkeitsrichtung

Die Domänenverträge und reine Fachlogik sind unabhängig von Next.js, React, Konva, Datenbank und KI-SDK. Infrastrukturmodule implementieren kleine Ports für Persistenz, Dateien und Modellzugriff. Der Editor verwendet denselben validierten Canvas-Vertrag wie Server, Versionierung, Export und KI-Vorschau.

## 8. Domänenmodell

### 8.1 Zentrale Begriffe

- **Klasse:** Gruppe von Schülerprofilen.
- **Schülerprofil:** Personendarstellung und für den Sitzplan relevante Eigenschaften.
- **Raumvorlage:** wiederverwendbare räumliche Geometrie und Möblierung ohne Schülerzuordnung.
- **Sitzplatz:** adressierbare Position an einem Tisch.
- **Sitzplan:** Verbindung einer Klasse mit einer Raumvorlage und einer konkreten Zuordnung.
- **Canvas-Dokument:** versionierter, validierter räumlicher Zustand des Editors.
- **Revision:** fortlaufende Nummer des aktuellen Serverstands.
- **Planversion:** unveränderlicher, benannter Snapshot.
- **Sitzregel:** harte Bedingung oder gewichteter Wunsch.
- **Planvorschlag:** noch nicht übernommene Änderung des Optimierers oder KI-Assistenten.

### 8.2 Persistenz

Relationale Tabellen speichern Benutzer, Klassen, Schüler, Räume, Sitzpläne, Planversionen, Providerkonfigurationen, Uploadmetadaten und Löschstatus. Raum- und Sitzplandokumente werden als JSONB gespeichert und vor jedem Schreiben gegen versionsgebundene Zod-Schemas validiert.

Fotos werden in einem persistenten Upload-Volume abgelegt. Die Datenbank speichert nur Metadaten und den internen Bezeichner. Die Dateischnittstelle bleibt austauschbar, damit später bei Bedarf S3-kompatibler Speicher ergänzt werden kann.

## 9. Speicherung und Wiederherstellung

1. Jede lokale Editoränderung aktualisiert sofort den Clientzustand.
2. Der Zustand wird gedrosselt in IndexedDB gespiegelt.
3. Nach einer kurzen Ruhezeit sendet Autosave das vollständige validierte Dokument zusammen mit der erwarteten Revision.
4. Der Server schreibt nur, wenn die erwartete Revision noch aktuell ist.
5. Bei Erfolg liefert der Server eine neue Revision und einen Zeitstempel.
6. Bei Konflikt bleibt der lokale Entwurf erhalten und die Oberfläche bietet Vergleich, Neuladen oder Duplizieren an.
7. Benannte Speicherstände erzeugen unveränderliche Snapshots.
8. Wiederherstellen kopiert einen Snapshot in eine neue aktuelle Revision.
9. Gelöschte Klassen, Räume und Pläne erhalten zunächst `deleted_at` und bleiben wiederherstellbar.

Autosave ist kein Ersatz für Versionen. Autosave schützt die laufende Arbeit; Snapshots schützen fachlich wichtige Stände.

## 10. KI und Optimierer

### 10.1 Sicherheitsgrenze im System

Ein Sprachmodell darf nie direkt Datenbank- oder Canvasmutationen ausführen. Es erzeugt ausschließlich strukturierte Kommandovorschläge. Jeder Vorschlag wird durch Zod validiert, gegen vorhandene Entitäten geprüft und als Diff angezeigt.

### 10.2 Kommandobeispiele

- Schüler auf einen bestimmten Sitzplatz verschieben
- zwei Schüler trennen
- zwei Schüler bevorzugt zusammensetzen
- Schüler in einen vorderen oder ruhigen Bereich setzen
- Sitzplatz sperren
- harte Regel in einen Wunsch umwandeln
- Optimierung mit definierter Zufallsquelle starten

### 10.3 Deterministischer Optimierer

Der Optimierer arbeitet ohne LLM-Abhängigkeit. Harte Regeln dürfen nicht verletzt werden. Gewichtete Wünsche fließen in einen transparenten Score ein. Dieselben Eingaben und derselbe Seed erzeugen dasselbe Ergebnis. Ist keine gültige Lösung möglich, liefert der Optimierer eine minimale, verständliche Konfliktmenge statt eines scheinbar erfolgreichen Plans.

Das Sprachmodell übernimmt Interpretation und Erklärung, nicht die fachliche Gültigkeit der Platzierung.

## 11. Fehlerbehandlung

- **Netzwerk unterbrochen:** Entwurf bleibt lokal; Autosave wird mit begrenztem Backoff erneut versucht.
- **Revisionskonflikt:** kein stilles Überschreiben; lokaler Stand bleibt erhalten.
- **Ungültiges Canvas-Dokument:** Server lehnt den Schreibvorgang ab; letzter gültiger Stand bleibt aktiv.
- **KI nicht erreichbar:** alle manuellen Funktionen und der Optimierer bleiben verwendbar.
- **Ungültige KI-Ausgabe:** keine Mutation; verständliche Fehlermeldung und optional erneuter Versuch.
- **Widersprüchliche Regeln:** Konflikte werden benannt; kein erzwungener ungültiger Plan.
- **Uploadfehler:** Profil bleibt speicherbar; kein Verweis auf eine unvollständige Datei.
- **Exportfehler:** Plan und gespeicherte Daten bleiben unverändert.
- **Restorefehler:** aktuelle Revision bleibt erhalten; Snapshot wird nicht verändert.

Fehlerantworten besitzen stabile Fehlercodes. UI-Texte werden nicht aus ungefilterten Provider- oder Datenbankfehlern erzeugt.

## 12. Teststrategie

### 12.1 Wichtigster Akzeptanzpfad

Klasse anlegen → Raum gestalten → Schüler platzieren → speichern → Browser neu laden → Stand wiederherstellen → KI-Vorschlag prüfen → PDF exportieren.

### 12.2 Testebenen

- Vitest für Domänenverträge, Commands, Versionierung und Optimierer.
- Property-Tests für Optimierer-Invarianten: kein Schüler doppelt, nur existierende Sitzplätze, keine harte Regelverletzung.
- React Testing Library für Formulare und Editorsteuerung.
- Playwright für zentrale Browserabläufe.
- echte PostgreSQL-Serviceinstanz in CI.
- visuelle Referenzen für Editor, Druckansicht und kritische Zustände.
- Backup/Restore-Smoke-Test vor jedem Release.
- Accessibility-Prüfung für Oberfläche und Tastaturbedienung.

Tests prüfen beobachtbares Verhalten an möglichst hohen Systemgrenzen. Implementierungsdetails werden nur getestet, wenn sie selbst eine stabile öffentliche Modulgrenze bilden.

## 13. Repository-Governance

### 13.1 Aktive Arbeitsquellen

1. `README.md` — Produkt, Einstieg, Grenzen und Release-Linie.
2. `docs/STATUS.md` — verifizierter Istzustand.
3. `ROADMAP.md` — strategische Milestones.
4. GitHub Issues — ausführbare Arbeit mit Akzeptanzkriterien und Blockern.

ADRs, Architektur- und Runbook-Dateien sind verbindliche Referenzen, aber keine konkurrierenden Roadmaps.

### 13.2 Matt-Pocock-Workflow

1. `/setup-matt-pocock-skills` konfiguriert GitHub Issues, Standardlabels und das Single-Context-Domänenlayout.
2. `/grill-with-docs` klärt größere Produktbereiche und aktualisiert gemeinsame Begriffe und ADRs.
3. `/to-spec` veröffentlicht die freigegebene Spezifikation als Parent-Issue.
4. `/to-tickets` erzeugt vertikale Slices mit expliziten Blockern.
5. `/implement` setzt genau einen freigegebenen Slice mit TDD um.
6. `/code-review` prüft Standards und Spezifikation getrennt.
7. Erst grüne Gates und ein freigegebener Review erlauben einen Merge.

### 13.3 Agentenrollen

- `sitzplan-lead-m3`: Architektur, Verträge und Issue-Auswahl.
- `sitzplan-frontend-m3`: Konva, React, UI und Accessibility.
- `sitzplan-domain-m3`: Persistenz, Versionierung und Optimierer.
- `sitzplan-ai-m3`: Provider, Chat und Command-Übersetzung.
- `sitzplan-test-m3`: Vitest, Property-Tests und Playwright.
- `sitzplan-doc-m3`: STATUS, CHANGELOG, ADRs und Runbooks.
- `sitzplan-reviewer-m3`: schreibgeschützter Abschlussreview gegen Spec und Standards.

Maximal zwei nachweislich unabhängige Worker arbeiten gleichzeitig. Jeder schreibende Worker verwendet einen eigenen Worktree und erzeugt einen atomaren lokalen Commit. Der Lead prüft Diff, Tests und Gates selbst. Workerzusammenfassungen gelten nicht als Nachweis.

## 14. Architekturentscheidungen

Die initiale ADR-Reihe dokumentiert:

1. Next.js als Full-Stack-Anwendung.
2. React-Konva als Raumeditor.
3. Relationales Modell plus JSONB-Canvas-Vertrag.
4. Autosave mit unveränderlichen Snapshots.
5. KI erzeugt nur validierte Commands.
6. Deterministischer Optimierer statt LLM-Platzierung.
7. OpenAI-kompatibles BYOK plus Ollama.
8. Single-User-Prototyp mit Testdaten.
9. Lokale Entwürfe über IndexedDB.
10. Granularpersistenz und Ereignisprotokoll erst nach messbarem Bedarf.

## 15. Milestones bis zum MVP

| Milestone | Auslieferbares Ergebnis | Geschätzter KI-Aufwand |
|---|---|---:|
| M0 — Foundation | Repository, Dokumentation, CI, Docker und Designsystem | 6–10 h |
| M1 — Klassen | Auth, Klassen, Schülerprofile, Fotos und CSV | 12–18 h |
| M2 — Raumeditor | Maße, Raster, Möbel, Drag-and-drop und Rotation | 24–36 h |
| M3 — Persistente Pläne | Zuordnung, Autosave, Versionen, Restore und Papierkorb | 18–28 h |
| M4 — Optimierer | Regeln, Konflikte, Scoring und reproduzierbare Vorschläge | 18–30 h |
| M5 — KI-Assistent | BYOK, Ollama, Chat, Commands und Vorschau | 14–22 h |
| M6 — Ausgabe und PWA | Offline-Entwurf, Druck, PDF, PNG und Import/Export | 16–24 h |
| M7 — MVP-Härtung | E2E, Accessibility, Backup/Restore, Dokumentation und Release | 18–28 h |

Gesamtschätzung: 126–196 Agentenstunden. Bei intensiver Nutzung sind drei bis fünf Kalenderwochen realistisch; bei Entwicklung nebenbei sechs bis neun Wochen. Zusätzlich sind etwa 12–20 Stunden menschliche Sichtprüfung, Produktentscheidung und Abnahme erforderlich.

## 16. Milestones nach dem MVP

- **M8 — Erweiterter Raumeditor:** runde Tische, Tischgruppen, U-Formen und frei definierte Sitzplätze.
- **M9 — Persistenzmodell v2:** granularere relationale Speicherung einzelner Raum- und Sitzobjekte, sofern Zusammenarbeit, Abfragen oder Migrationen einen belegbaren Nutzen zeigen.
- **M10 — Audit-Historie:** vollständiges Ereignisprotokoll und feingranulare Zeitreise, sofern Snapshots für reale Anforderungen nicht ausreichen.
- **M11 — Mehrbenutzerbetrieb:** Rollen, getrennte Datenbereiche und gemeinsame Vorlagen.
- **M12 — Produktivfreigabe:** Datenschutzkonzept, Löschfristen, technische Schutzmaßnahmen und Freigabeprozess für echte Schuldaten.

M9 und M10 sind geplante Optionen. Ein ADR muss vor Beginn belegen, warum der bestehende Snapshot-Ansatz nicht mehr ausreicht.

## 17. Aufwand und laufende Kosten

Der Anwendungsstack ist Open Source. Für die Entwicklung mit MiniMax-M3 wird zunächst der Max-Token-Plan für 50 USD pro Monat empfohlen. Je nach Intensität und Laufzeit sind für den MVP ungefähr 50–150 USD Modellkosten einzuplanen. Ein kleiner selbst gehosteter Prototyp benötigt voraussichtlich einen VPS im Bereich von 5–10 EUR pro Monat, sofern er nicht lokal betrieben wird.

Die Kostenspanne ist eine Planungsannahme und keine Verbrauchsgarantie. Tatsächliche Kosten hängen besonders von Agentenparallelität, Kontextgröße, Wiederholungen und Reviewtiefe ab.

## 18. Erfolgskriterien des MVP

Der MVP ist freigabefähig, wenn:

1. der zentrale Akzeptanzpfad reproduzierbar grün ist;
2. ein gespeicherter Plan nach Browserneustart und auf einem zweiten Gerät identisch geladen wird;
3. lokale Entwürfe bei einem simulierten Netzwerkausfall nicht verloren gehen;
4. Revisionskonflikte kein stilles Überschreiben verursachen;
5. Restore die Historie erhält;
6. der Optimierer keine harten Regeln verletzt;
7. ungültige KI-Ausgaben keine Mutation auslösen;
8. PDF und PNG die gewählte Blickrichtung korrekt darstellen;
9. Backup und Restore in einem automatisierten Smoke-Test funktionieren;
10. Installation und Betrieb anhand der Dokumentation auf einem leeren System reproduzierbar sind.
