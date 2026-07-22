import type { ReactNode } from "react";

export const metadata = {
  title: "Abschlussprojekt Beziehung — Sitzplan M0",
  description:
    "M0 Foundation: Next.js App Router scaffold for the Sitzplan planning PWA. Domain contracts land in M3.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
