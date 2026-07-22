export default function HomePage() {
  return (
    <main>
      <h1>Abschlussprojekt Beziehung — M0 Foundation</h1>
      <p>
        Foundation scaffold aktiv. Domänenverträge folgen in M3, Services in
        M5, Persistenz und KI-Adapter ab M6/M9.
      </p>
      <ul>
        <li>Stack: Next.js 14 (App Router) + TypeScript strict + Vitest.</li>
        <li>
          Modulgrenzen: <code>src/domain</code>, <code>src/services</code>,{" "}
          <code>src/infrastructure</code> — in M0 leer, Stubs dokumentieren die
          Abhängigkeitsrichtung.
        </li>
        <li>Nächster Meilenstein: M3 — Domain Contracts (Issue #20).</li>
      </ul>
    </main>
  );
}
