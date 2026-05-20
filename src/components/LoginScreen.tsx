import { FormEvent, useState } from "react";
import euphoriaLogo from "../assets/euphoria-logo.svg";
import { loginAccessUser } from "../lib/api";
import type { AccessUser } from "../lib/supabase";

type LoginScreenProps = {
  onLogin: (user: AccessUser) => void;
};

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    try {
      setIsLoading(true);
      const user = await loginAccessUser(username, password);

      if (!user) {
        setError("Wrong username or password.");
        return;
      }

      window.localStorage.setItem("ai_qr_admin_session", JSON.stringify(user));
      onLogin(user);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not log in.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
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
          placeholder="Username"
        />
        <label htmlFor="admin-password">Password</label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          placeholder="Password"
        />
        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={isLoading}>{isLoading ? "Checking" : "Login"}</button>
      </form>
    </main>
  );
}
