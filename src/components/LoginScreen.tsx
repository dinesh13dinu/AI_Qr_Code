import { FormEvent, useState } from "react";
import euphoriaLogo from "../assets/euphoria-logo.svg";

type LoginScreenProps = {
  onLogin: () => void;
};

const ADMIN_USERNAME = "Dinesh";
const ADMIN_PASSWORD = "654123";

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (username.trim().toLowerCase() === ADMIN_USERNAME.toLowerCase() && password === ADMIN_PASSWORD) {
      window.localStorage.setItem("ai_qr_admin_session", "active");
      onLogin();
      return;
    }

    setError("Wrong username or password.");
  }

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="brand-lockup login-brand">
          <img src={euphoriaLogo} alt="Euphoria" />
        </div>
        <h1>Admin login</h1>
        <label htmlFor="admin-username">Username</label>
        <input
          id="admin-username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          placeholder="Dinesh"
        />
        <label htmlFor="admin-password">Password</label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          placeholder="654123"
        />
        {error && <p className="form-error">{error}</p>}
        <button type="submit">Login</button>
      </form>
    </main>
  );
}
