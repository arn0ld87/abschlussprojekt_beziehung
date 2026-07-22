# ADR-0001: Next.js als Full-Stack-Anwendung

**Status:** Accepted<br>
**Date:** 2026-07-22

## Context

Der MVP benötigt Weboberfläche, Authentifizierung, Serverzugriff und selbst gehosteten Betrieb. Ein separates Frontend- und Backend-Deployment würde zusätzliche Schnittstellen und Betriebsaufwand schaffen, ohne für den Single-User-Prototyp einen belegten Nutzen zu liefern.

## Decision

**One Next.js App Router application.** Route Handler nehmen Anfragen an und delegieren an Application Services. Fachlogik bleibt außerhalb von React, Next.js und Transportdetails.

## Consequences

**Domain services stay framework-independent; no separate backend in MVP.** UI und Route Handler dürfen Domänenlogik nicht an das Framework binden. Eine spätere Trennung bleibt über die unabhängigen Services und Ports möglich.

## Superseding this decision

Ein neues ADR muss einen belegten Bedarf für getrennte Deployments benennen und zeigen, wie Domänenverträge, Migration und Betrieb ohne Doppelimplementierung erhalten bleiben.
