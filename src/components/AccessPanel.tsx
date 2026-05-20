import { FormEvent, useEffect, useState } from "react";
import { Plus, RefreshCw, UserRound } from "lucide-react";
import { createAccessUser, getCurrentAccessUser, listAccessUsers } from "../lib/api";
import type { AccessUser } from "../lib/supabase";

const emptyForm = {
  name: "",
  email: "",
  username: "",
  password: "",
};

export function AccessPanel() {
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadUsers() {
    setError("");
    setIsLoading(true);

    try {
      setUsers(await listAccessUsers());
    } catch (caught) {
      const currentUser = getCurrentAccessUser();
      if (currentUser) {
        setUsers([currentUser]);
      }
      const message = getErrorMessage(caught, "Could not load users.");
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function updateField<Field extends keyof typeof form>(field: Field, value: (typeof form)[Field]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.username.trim() || !form.password.trim()) {
      setError("Name, email, username, and password are required.");
      return;
    }

    if (form.password.trim().length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      setIsSaving(true);
      await createAccessUser({
        name: form.name.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        password: form.password,
      });
      setForm(emptyForm);
      await loadUsers();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not create access.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Create access</h2>
            <p>Add a user account by entering their name, email, username, and password.</p>
          </div>
        </div>

        <form className="merchant-form" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="access-name">Name</label>
            <input
              id="access-name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="access-email">Email</label>
            <input
              id="access-email"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="access-username">Username</label>
            <input
              id="access-username"
              value={form.username}
              onChange={(event) => updateField("username", event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="access-password">Password</label>
            <input
              id="access-password"
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="form-footer wide">
            <span className="slug-preview">Share this username and password with the user after creating access.</span>
            <button type="submit" disabled={isSaving}>
              <Plus size={18} />
              {isSaving ? "Creating" : "Create user"}
            </button>
          </div>
          {error && <p className="form-error wide">{error}</p>}
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Access users</h2>
            <p>These users can log in with their own username and password.</p>
          </div>
          <div className="panel-actions">
            <button className="refresh-button data-refresh" type="button" onClick={loadUsers}>
              <RefreshCw size={18} />
              Refresh
            </button>
            {isLoading && <span className="loading">Loading</span>}
          </div>
        </div>

        <div className="access-list">
          {users.map((user) => (
            <article className="access-card" key={user.id}>
              <div className="access-icon">
                <UserRound size={20} />
              </div>
              <div>
                <h3>{user.name}</h3>
                <p>{user.email}</p>
                <span>{user.username}</span>
              </div>
              {user.is_admin && <strong>Admin</strong>}
            </article>
          ))}
          {users.length === 0 && !isLoading && !error && (
            <div className="empty-state">
              <UserRound size={32} />
              <h2>No users yet</h2>
              <p>Create the first access user and it will appear here.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function getErrorMessage(caught: unknown, fallback: string) {
  if (caught instanceof Error) return caught.message;
  if (caught && typeof caught === "object" && "message" in caught) {
    return String((caught as { message?: unknown }).message || fallback);
  }
  return fallback;
}
