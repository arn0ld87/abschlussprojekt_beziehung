# ADR-0007: OpenAI-kompatibles BYOK und Ollama

**Status:** Accepted<br>
**Date:** 2026-07-22

## Context

Der selbst gehostete Prototyp soll wahlweise einen konfigurierbaren OpenAI-kompatiblen Endpunkt oder ein lokales Ollama verwenden. Providerverfügbarkeit darf manuelle Planung und fachliche Optimierung nicht blockieren.

## Decision

**OpenAI-compatible BYOK plus Ollama.** Modellzugriff erfolgt über einen kleinen Providerport mit Adaptern für einen nutzereigenen OpenAI-kompatiblen Endpunkt und Ollama.

## Consequences

**Provider adapter remains replaceable and manual work works without AI.** Providerdetails gelangen nicht in Domänenkommandos oder Fachlogik. Verbindungsausfälle lassen Editor und deterministischen Optimierer funktionsfähig.

## Superseding this decision

Ein neues ADR muss Portabilität, Secret-Behandlung, Offlineverhalten und die Migration vorhandener Providerkonfigurationen berücksichtigen.
