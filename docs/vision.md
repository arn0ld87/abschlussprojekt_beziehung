# Vision

**Stand:** 29.07.2026
**Status:** Leitbild; die verbindliche Spezifikation bleibt [`docs/product.md`](product.md)

## Warum es Sitzplan gibt

Lehrkräfte planen Sitzordnungen heute mit Papier, statischen Tabellen oder generischen Zeichenwerkzeugen. Keines dieser Werkzeuge kennt die fachliche Realität eines Klassenzimmers: Räume mit echten Maßen, Schüler mit unterschiedlichen Bedarfen, Regeln wie „nicht neben", und den Alltag, in dem Pläne wöchentlich angepasst und alte Stände wieder gebraucht werden.

Sitzplan existiert, um genau diese eine Aufgabe besser zu lösen als jedes Generikum: **grafisch planen, sicher speichern, nachvollziehbar optimieren.**

## Für wen

Eine einzelne Lehrkraft an einem eigenen Gerät oder auf einem eigenen Server. Kein Admin-Team, keine IT-Abteilung, kein Schulträger-Backend. Die Installationshürde ist ein `docker compose up`.

## Leitprinzipien

1. **Lehrerwerkzeug, nicht CAD.** Jede Interaktion misst sich daran, ob eine Lehrkraft sie ohne Handbuch versteht. Warm, ruhig, fachlich — kein technisches Dashboard.
2. **Der Mensch entscheidet, die KI schlägt vor.** KI-Ausgaben werden validiert, begründet und als Diff gezeigt. Kein Sprachmodell verändert Plan, Canvas oder Datenbank ohne ausdrückliche Bestätigung. Harte Sitzregeln sind unantastbar.
3. **Datenhoheit liegt bei der Lehrkraft.** Selbst gehostet, PostgreSQL vor Ort, BYOK für KI-Provider, Export und Backup als Bürgerrechte, nicht als Premium-Feature.
4. **Ehrliche Daten.** Bis zur ausdrücklichen Produktivfreigabe (M12) läuft das Produkt ausschließlich mit Test- und Fantasiedaten. Das ist ein Versprechen an Schüler und Eltern, keine technische Einschränkung.
5. **Determinismus vor Magie.** Der Optimierer liefert reproduzierbare Ergebnisse mit nachvollziehbarer Begründung. Ein Vorschlag, den man nicht erklären kann, ist keiner.
6. **Vertikale Slices, verifizierte Gates.** Jeder Entwicklungsschritt ist ein überprüfbarer, atomarer Schnitt durch alle Schichten. Was nicht grün ist, wird nicht gemergt.

## Was Sitzplan nie werden soll

- Keine Schulverwaltung: kein Notenbuch, keine Anwesenheit, keine Unterrichtsplanung.
- Keine Plattform: keine Mandanten, kein Marktplatz, kein Teilen per Link an Dritte.
- Keine Überwachung: keine Verhaltens-Scores, keine Schüler-Analytics über die planerische Notwendigkeit hinaus.
- Keine Abhängigkeit von einem KI-Anbieter: OpenAI-kompatible Endpunkte und lokale Modelle (Ollama) sind gleichwertige Bürger.
- Kein Feature-Friedhof: Erweiterungen nach dem MVP (M8+) brauchen eine belegte Anforderung; Persistenzmodell- und Historien-Umbauten (M9/M10) brauchen ein angenommenes ADR.

## Richtung nach dem MVP

Die Roadmap ist bewusst in dieser Reihenfolge gebaut: erst ein belastbarer Single-User-Kern (M1–M7), dann Raumvielfalt (M8), dann — nur bei nachgewiesenem Bedarf — tiefere Persistenz und Historie (M9/M10), dann Mehrbenutzerbetrieb (M11) und erst zuletzt, nach dokumentierter Datenschutzprüfung, die Freigabe für echte Schuldaten (M12).

Der Massstab für jeden Schritt bleibt derselbe: Hilft es einer Lehrkraft, schneller und besser zu einer tragfähigen Sitzordnung zu kommen — ohne ihre Daten, ihre Entscheidung oder ihre Übersicht abzugeben?
