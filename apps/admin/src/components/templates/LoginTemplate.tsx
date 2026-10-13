import LoginForm from "../organisms/LoginForm";

export default function LoginTemplate() {
  return (
    <main>
      <header>
        <h1>atomic</h1>
      </header>

      <section>
        <h2>Connexion</h2>
        <LoginForm />
      </section>

      <footer>
        <p>© 2026 atomic</p>
      </footer>
    </main>
  );
}
