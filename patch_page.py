import re

with open('app/page.tsx', 'r') as f:
    content = f.read()

# Fix 1: Add Next/Link import
content = content.replace('import { listRoutes, getMeta, type RouteStatus } from "./route-meta";',
                          'import Link from "next/link";\nimport { listRoutes, getMeta, type RouteStatus } from "./route-meta";')

# Fix 2: Replace <a> with <Link>
content = re.sub(r'<a\s+href=([^\s>]+)(.*?)>(.*?)</a>', r'<Link href=\1\2>\3</Link>', content, flags=re.DOTALL)

# Fix 3: Add missing texts for tests
replacement = """      <h1>Abschlussprojekt Beziehung — M0 Foundation</h1>
      <p style={{ color: "#555" }}>
        Stack: Next.js 16 (App Router) + TypeScript strict + Vitest.
      </p>
      <p style={{ color: "#555" }}>
        Nächster Meilenstein: M1 Klassen (Issue #3).
      </p>
      <p style={{ color: "#555" }}>
        Grenzen: <code>src/domain</code> (rein), <code>src/services</code> (Orchestrierung), <code>src/infrastructure</code> (DB/Auth).
      </p>
      <p style={{ color: "#555" }}>
        Live aus <code>app/</code> gescannt"""

content = content.replace('      <h1>Abschlussprojekt Beziehung — Dev-Übersicht</h1>\n      <p style={{ color: "#555" }}>\n        Live aus <code>app/</code> gescannt', replacement)

with open('app/page.tsx', 'w') as f:
    f.write(content)
