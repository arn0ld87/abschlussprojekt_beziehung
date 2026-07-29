import { redirect } from "next/navigation";
import { getSession } from "../../src/services/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedPage() {
  const user = await getSession();

  if (!user) {
    redirect("/signin");
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Geschützter Bereich</h1>
      <p>Willkommen, {user.email}!</p>
      <p>
        Diese Seite ist nur mit einer gültigen Sitzung erreichbar (M1 #42).
      </p>
    </main>
  );
}
