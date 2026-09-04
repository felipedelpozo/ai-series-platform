"use client";

import { useState } from "react";
import { Button } from "@ai-series/ui";

type Workspace = { workspace: { id: string; name: string; slug: string }; role: string };

export default function AccountsPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<{ user: { email: string }; workspaces: Workspace[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newWorkspace, setNewWorkspace] = useState("");

  async function login() {
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Login failed");
      return;
    }
    setToken(data.token);
    await loadMe(data.token);
  }

  async function register() {
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Registration failed");
      return;
    }
    await login();
  }

  async function loadMe(t: string) {
    const res = await fetch("/api/me", { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) setMe(await res.json());
  }

  async function createWorkspace() {
    if (!token) return;
    setError(null);
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newWorkspace, slug: newWorkspace.toLowerCase().replace(/\s+/g, "-") }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create workspace");
      return;
    }
    setNewWorkspace("");
    await loadMe(token);
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold">Accounts</h2>

      {!token && (
        <div className="flex max-w-sm flex-col gap-2 rounded-lg border p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
          <div className="flex gap-2">
            <Button onClick={login}>Login</Button>
            <Button variant="outline" onClick={register}>
              Register
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {me && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Signed in as {me.user.email}</p>
          <div className="flex gap-2">
            <input
              value={newWorkspace}
              onChange={(e) => setNewWorkspace(e.target.value)}
              placeholder="New workspace name"
              className="rounded-md border bg-background px-2 py-1 text-sm"
            />
            <Button variant="outline" onClick={createWorkspace}>
              Create workspace
            </Button>
          </div>
          <ul className="flex flex-col gap-1">
            {me.workspaces.map((w) => (
              <li key={w.workspace.id} className="rounded-md border px-3 py-2 text-sm">
                {w.workspace.name} <span className="text-xs text-muted-foreground">({w.role})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
