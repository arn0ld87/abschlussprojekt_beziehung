export default function SignInPage() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Anmeldung</h1>
      <form action="/api/auth/sign-in" method="POST">
        <div>
          <label htmlFor="email">E-Mail:</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div>
          <label htmlFor="password">Passwort:</label>
          <input id="password" name="password" type="password" required />
        </div>
        <button type="submit">Anmelden</button>
      </form>
    </main>
  );
}
