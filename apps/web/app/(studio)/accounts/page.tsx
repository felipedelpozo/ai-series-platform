"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ai-series/ui";
import { Building2, KeyRound, UserRound } from "lucide-react";
import { EmptyState, InlineNotice, PageHeader, SectionPanel } from "@/components/ui";
import { studioMutation } from "@/lib/studio-mutation";

type Workspace = { workspace: { id: string; name: string; slug: string }; role: string };
type PendingAction = "login" | "register" | "identity" | "workspace" | null;
type Feedback = { kind: "error" | "success"; title: string; message: string } | null;

export default function AccountsPage() {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<{ user: { email: string }; workspaces: Workspace[] } | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [newWorkspace, setNewWorkspace] = useState("");

  async function loadMe(t: string, successMessage?: string) {
    setPendingAction("identity");
    try {
      const res = await fetch("/api/me", { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) {
        setFeedback({
          kind: "error",
          title: "Workspace access could not be loaded",
          message: "Your session is active. Try loading your identity and workspaces again.",
        });
        return false;
      }

      setMe(await res.json());
      if (successMessage) {
        setFeedback({ kind: "success", title: "Account ready", message: successMessage });
      }
      return true;
    } catch {
      setFeedback({
        kind: "error",
        title: "Workspace access could not be loaded",
        message: "Check the connection and try loading your identity and workspaces again.",
      });
      return false;
    } finally {
      setPendingAction(null);
    }
  }

  async function login(
    successMessage = "You are signed in and your workspace access is up to date.",
  ) {
    setFeedback(null);
    setPendingAction("login");
    try {
      const res = await studioMutation("accounts.login", "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          kind: "error",
          title: "Sign in failed",
          message:
            data.error ?? "The account could not be signed in. Review the details and try again.",
        });
        return;
      }

      setToken(data.token);
      const loaded = await loadMe(data.token, successMessage);
      if (loaded) setPassword("");
    } catch {
      setFeedback({
        kind: "error",
        title: "Sign in failed",
        message: "The request could not be completed. Check the connection and try again.",
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function register() {
    setFeedback(null);
    setPendingAction("register");
    try {
      const res = await studioMutation("accounts.register", "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          kind: "error",
          title: "Account creation failed",
          message:
            data.error ?? "The account could not be created. Review the details and try again.",
        });
        return;
      }

      await login("Your account was created and you are now signed in.");
    } catch {
      setFeedback({
        kind: "error",
        title: "Account creation failed",
        message: "The request could not be completed. Check the connection and try again.",
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function createWorkspace() {
    if (!token) return;
    setFeedback(null);
    setPendingAction("workspace");
    try {
      const res = await studioMutation("accounts.workspace", "/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newWorkspace,
          slug: newWorkspace.toLowerCase().replace(/\s+/g, "-"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          kind: "error",
          title: "Workspace creation failed",
          message:
            data.error ?? "The workspace could not be created. Review the name and try again.",
        });
        return;
      }

      setNewWorkspace("");
      const refreshed = await loadMe(token);
      if (!refreshed) return;
      setFeedback({
        kind: "success",
        title: "Workspace created",
        message: "The new workspace is available in your access list.",
      });
    } catch {
      setFeedback({
        kind: "error",
        title: "Workspace creation failed",
        message: "The request could not be completed. Check the connection and try again.",
      });
    } finally {
      setPendingAction(null);
    }
  }

  const authPending =
    pendingAction === "login" || pendingAction === "register" || pendingAction === "identity";

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        eyebrow="Access control"
        title="Accounts & workspaces"
        description="Authenticate your identity, then review the workspaces and roles available to this session."
      />

      {feedback ? (
        <InlineNotice
          title={feedback.title}
          variant={feedback.kind === "error" ? "destructive" : "success"}
        >
          {feedback.message}
        </InlineNotice>
      ) : null}

      {!token ? (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)]">
          <SectionPanel
            title="Authenticate"
            description="Use an existing identity or create one before working with workspace-scoped production."
          >
            <Tabs
              value={authMode}
              onValueChange={(value) => setAuthMode(value as "login" | "register")}
              className="max-w-lg"
            >
              <TabsList aria-label="Authentication method">
                <TabsTrigger value="login" disabled={authPending}>
                  Login
                </TabsTrigger>
                <TabsTrigger value="register" disabled={authPending}>
                  Register
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form
                  className="space-y-5"
                  aria-busy={authPending}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void login();
                  }}
                >
                  <AuthFields
                    mode="login"
                    email={email}
                    password={password}
                    name={name}
                    onEmailChange={setEmail}
                    onPasswordChange={setPassword}
                    onNameChange={setName}
                    errorMessage={feedback?.kind === "error" ? feedback.message : undefined}
                  />
                  <Button type="submit" disabled={authPending} className="w-full sm:w-auto">
                    {pendingAction === "login" || pendingAction === "identity"
                      ? "Logging in…"
                      : "Login"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form
                  className="space-y-5"
                  aria-busy={authPending}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void register();
                  }}
                >
                  <AuthFields
                    mode="register"
                    email={email}
                    password={password}
                    name={name}
                    onEmailChange={setEmail}
                    onPasswordChange={setPassword}
                    onNameChange={setName}
                    errorMessage={feedback?.kind === "error" ? feedback.message : undefined}
                  />
                  <Button type="submit" disabled={authPending} className="w-full sm:w-auto">
                    {pendingAction === "register" ||
                    pendingAction === "login" ||
                    pendingAction === "identity"
                      ? "Creating account…"
                      : "Register"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </SectionPanel>

          <SectionPanel
            title="Access boundary"
            description="Authentication is separate from production content."
          >
            <div className="divide-y text-sm leading-relaxed text-muted-foreground">
              <div className="flex gap-3 pb-4">
                <KeyRound className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>Your credentials establish the current identity for this browser session.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <Building2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>Workspace membership and roles are loaded only after authentication succeeds.</p>
              </div>
            </div>
          </SectionPanel>
        </div>
      ) : me ? (
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(15rem,0.7fr)_minmax(0,1.3fr)]">
          <SectionPanel
            title="Current identity"
            description="The authenticated identity for this session."
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center text-muted-foreground">
                <UserRound className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="break-all text-sm font-medium">{me.user.email}</p>
                <Badge variant="success" className="mt-2">
                  Authenticated
                </Badge>
              </div>
            </div>
          </SectionPanel>

          <SectionPanel
            title="Workspaces"
            description="Create a workspace or review the roles assigned to your identity."
          >
            <form
              className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end"
              aria-busy={pendingAction === "workspace"}
              onSubmit={(event) => {
                event.preventDefault();
                void createWorkspace();
              }}
            >
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="workspace-name">Workspace name</Label>
                <Input
                  id="workspace-name"
                  name="workspaceName"
                  autoComplete="organization"
                  value={newWorkspace}
                  onChange={(event) => setNewWorkspace(event.target.value)}
                  placeholder="Example: Editorial team"
                  required
                  aria-invalid={feedback?.title === "Workspace creation failed"}
                />
              </div>
              <Button
                type="submit"
                disabled={pendingAction === "workspace" || newWorkspace.trim().length === 0}
                className="w-full sm:w-auto"
              >
                {pendingAction === "workspace" ? "Creating workspace…" : "Create workspace"}
              </Button>
            </form>

            <div className="mt-6 border-t pt-5">
              {me.workspaces.length === 0 ? (
                <EmptyState
                  compact
                  icon={Building2}
                  title="No workspace access yet"
                  description="Create the first workspace for this identity to establish a production context."
                />
              ) : (
                <ul className="min-w-0 divide-y border-y">
                  {me.workspaces.map((workspaceAccess) => (
                    <li key={workspaceAccess.workspace.id} className="min-w-0 py-4">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold">
                            {workspaceAccess.workspace.name}
                          </p>
                          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                            {workspaceAccess.workspace.slug}
                          </p>
                        </div>
                        <Badge variant="muted" className="shrink-0 capitalize">
                          {workspaceAccess.role}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </SectionPanel>
        </div>
      ) : (
        <SectionPanel
          title="Workspace access unavailable"
          description="The session is active, but identity data is not loaded."
        >
          <Button
            variant="outline"
            disabled={pendingAction === "identity"}
            onClick={() => void loadMe(token)}
          >
            {pendingAction === "identity" ? "Loading access…" : "Try again"}
          </Button>
        </SectionPanel>
      )}
    </div>
  );
}

function AuthFields({
  mode,
  email,
  password,
  name,
  onEmailChange,
  onPasswordChange,
  onNameChange,
  errorMessage,
}: {
  mode: "login" | "register";
  email: string;
  password: string;
  name: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onNameChange: (value: string) => void;
  errorMessage?: string;
}) {
  const errorId = `${mode}-auth-error`;
  return (
    <div className="space-y-4">
      {mode === "register" ? (
        <div className="space-y-2">
          <Label htmlFor="account-name">Name</Label>
          <Input
            id="account-name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Your name"
            required
            aria-invalid={Boolean(errorMessage)}
            aria-describedby={errorMessage ? errorId : undefined}
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`${mode}-email`}>Email address</Label>
        <Input
          id={`${mode}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="you@example.com"
          required
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? errorId : undefined}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${mode}-password`}>Password</Label>
        <Input
          id={`${mode}-password`}
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder={mode === "login" ? "Enter your password" : "Create a password"}
          required
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? errorId : undefined}
        />
      </div>
      {errorMessage ? (
        <p id={errorId} className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
