# ADR-0005: KI erzeugt validierte Domänenkommandos

**Status:** Accepted<br>
**Date:** 2026-07-22

## Context

Sprachmodelle können natürliche Wünsche interpretieren, liefern aber unzuverlässige oder ungültige Ausgaben. Ungeprüfte Modellantworten dürfen weder gespeicherte Daten noch den sichtbaren Sitzplan verändern.

## Decision

**LLMs emit validated domain commands only.** Modellantworten werden strukturell mit Zod, fachlich gegen vorhandene Entitäten und als zulässige Kommandos geprüft. Die Anwendung zeigt daraus einen Planvorschlag als Diff und verlangt eine Bestätigung.

## Consequences

**No direct database, service, or canvas mutation from model output.** Ungültige KI-Ausgabe bewirkt keine Mutation. Provider- und Promptwechsel bleiben hinter derselben validierten Kommandogrenze.

## Superseding this decision

Diese Sicherheitsgrenze darf nur durch ein neues ADR verändert werden, das mindestens gleich starke Validierung, Autorisierung, Vorschau, Bestätigung und Tests nachweist.
