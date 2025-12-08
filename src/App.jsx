// src/App.jsx
import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase";
import "./App.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:3000" : "https://api.lhsathletictraining.org");

const provider = new GoogleAuthProvider();

const options = [
  {
    title: "Roster",
    detail: "Manage provider access and statuses.",
    icon: "RS",
    key: "roster",
    requiresManage: true,
  },
];

function App() {
  const [user, setUser] = useState(null);
  const [appUser, setAppUser] = useState(null);
  const [status, setStatus] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [currentView, setCurrentView] = useState("dashboard");
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState("");
  const [rosterNotice, setRosterNotice] = useState("");
  const [rosterTab, setRosterTab] = useState("active");
  const [draftChanges, setDraftChanges] = useState({});
  const [savingUserId, setSavingUserId] = useState("");
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");

  // Auto-clear the transient success toast after login.
  useEffect(() => {
    if (status === "Signed in. Access granted.") {
      const timer = setTimeout(() => setStatus(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Auto-clear sign-out confirmation.
  useEffect(() => {
    if (status === "Signed out.") {
      const timer = setTimeout(() => setStatus(""), 2500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    const fetchCurrentUser = async (currentUser) => {
      setIsCheckingAccess(true);
      setStatus("Checking account access...");

      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(`${API_BASE_URL}/api/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 200) {
          const data = await response.json();
          setAppUser(data);
          setStatus("Signed in. Access granted.");
          return;
        }

        if (response.status === 403) {
          const body = await response.json();
          setAppUser(null);
          setStatus(body.message || "Access pending. Please contact an administrator.");
          return;
        }

        if (response.status === 401) {
          await signOut(auth);
          setStatus("Session expired. Please sign in again.");
          return;
        }

        setStatus("Could not verify access. Please try again.");
      } catch (error) {
        console.error("Error loading user from API", error);
        setStatus("Unable to reach the API. Please try again.");
      } finally {
        setIsCheckingAccess(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setStatus(currentUser ? "Signed in with Google." : "");
      setAppUser(null);
      setIsCheckingAccess(Boolean(currentUser));
      setIsSigningIn(false);
      setCurrentView("dashboard");
      setRoster([]);
      setRosterError("");
      setRosterNotice("");
      setDraftChanges({});

      if (currentUser) {
        fetchCurrentUser(currentUser);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setIsSigningIn(true);
      setStatus("Signing in with Google...");
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      setStatus(`Sign-in failed: ${err.message}`);
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setStatus("Signed out.");
      setAppUser(null);
      setIsCheckingAccess(false);
      setCurrentView("dashboard");
      setRoster([]);
      setRosterError("");
      setRosterNotice("");
      setDraftChanges({});
    } catch (err) {
      console.error(err);
      setStatus(`Error signing out: ${err.message}`);
    }
  };

  const isAuthorized = Boolean(appUser && appUser.status === "active");

  const canManageUsers =
    isAuthorized &&
    (appUser?.role === "super_user" || appUser?.role === "provider");

  const loadRoster = async () => {
    if (!user || !canManageUsers) {
      return;
    }

    setRosterLoading(true);
    setRosterError("");
    setRosterNotice("");

    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setRosterError(body.error || "Unable to load roster.");
        return;
      }

      const data = await response.json();
      setRoster(data);
    } catch (error) {
      console.error("Error loading roster", error);
      setRosterError("Unable to load roster.");
    } finally {
      setRosterLoading(false);
    }
  };

  const handleOptionClick = (item) => {
    if (item.key === "roster") {
      if (!canManageUsers) {
        setStatus("Roster is limited to provider or super user roles.");
        return;
      }
      setCurrentView("roster");
      setRosterTab("active");
      loadRoster();
      return;
    }

    setStatus("");
  };

  const handleRosterSelectChange = (uid, field, value) => {
    setDraftChanges((prev) => ({
      ...prev,
      [uid]: {
        ...prev[uid],
        [field]: value,
      },
    }));
  };

  const handleSaveUser = async (userToUpdate) => {
    const draft = draftChanges[userToUpdate.uid] || {};
    const payload = {};

    if (draft.role && draft.role !== userToUpdate.role) {
      payload.role = draft.role;
    }
    if (draft.status && draft.status !== userToUpdate.status) {
      payload.status = draft.status;
    }

    if (!payload.role && !payload.status) {
      return;
    }

    try {
      setSavingUserId(userToUpdate.uid);
      setRosterNotice("");
      const token = await user.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userToUpdate.uid}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setRosterError(body.error || "Unable to save changes.");
        return;
      }

      setRoster((prev) =>
        prev.map((item) =>
          item.uid === userToUpdate.uid ? { ...item, ...payload } : item
        )
      );
      setDraftChanges((prev) => {
        const next = { ...prev };
        delete next[userToUpdate.uid];
        return next;
      });
      setRosterNotice(`Saved changes for ${userToUpdate.displayName || userToUpdate.email}`);
    } catch (error) {
      console.error("Error saving user", error);
      setRosterError("Unable to save changes.");
    } finally {
      setSavingUserId("");
    }
  };

  const userInitial = user?.displayName?.[0]?.toUpperCase() ?? "U";
  const firstName = user?.displayName?.split(" ")[0] || user?.email || "there";
  const headline = user ? "Dashboard" : "Sign-In Portal";
  const filteredRoster = roster
    .filter((entry) =>
      rosterTab === "active" ? entry.status === "active" : entry.status !== "active"
    )
    .sort((a, b) => {
      const left = a.displayName || a.email || "";
      const right = b.displayName || b.email || "";
      return left.localeCompare(right);
    });
  const shouldShowRoster = currentView === "roster";

  useEffect(() => {
    if (!isAuthorized || !user) {
      setShowWelcomeToast(false);
      return;
    }

    setWelcomeMessage(`Welcome ${firstName}`);
    setShowWelcomeToast(true);

    const timer = setTimeout(() => setShowWelcomeToast(false), 2800);
    return () => clearTimeout(timer);
  }, [firstName, isAuthorized, user]);

  return (
    <div className="app-shell">
      <div className="surface">
        {showWelcomeToast && (
          <div className="welcome-toast" role="status" aria-live="polite">
            {welcomeMessage}
          </div>
        )}
        <header className="topbar">
          <div className="brand">
            <div>
              <p className="eyebrow">Lynbrook Athletic Training</p>
              <h1>{headline}</h1>
              {!user && <p className="muted">Secure access for athletic training staff and partners.</p>}
            </div>
          </div>

          {user ? (
            <div className="user-chip">
              {user.photoURL ? (
                <img
                  className="avatar"
                  src={user.photoURL}
                  alt={user.displayName || "Signed in user"}
                />
              ) : (
                <div className="avatar-fallback">{userInitial}</div>
              )}
              <div className="user-meta">
                <span className="user-name">{user.displayName || user.email}</span>
                <button className="link-button" type="button" onClick={handleLogout}>
                  Sign out
                </button>
              </div>
            </div>
          ) : null}
        </header>

        {!user ? (
          <section className="auth-panel">
            <div className="auth-card">
              <div>
                <h2>Sign in</h2>
                <p className="muted">Google sign-in only. Content is restricted until authenticated.</p>
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={handleGoogleLogin}
                disabled={isSigningIn}
              >
                <span className="google-badge">G</span>
                {isSigningIn ? "Signing in..." : "Sign in with Google"}
              </button>
              {status && <p className="status-note">{status}</p>}
            </div>
          </section>
        ) : isAuthorized ? (
          shouldShowRoster ? (
            <section className="roster">
              <div className="roster-header">
                <div>
                  <p className="eyebrow">Roster</p>
                  <h2>Account access</h2>
                  <p className="muted">Review active providers and pending accounts.</p>
                </div>
                <div className="roster-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setCurrentView("dashboard")}
                  >
                    Back to dashboard
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={loadRoster}
                    disabled={rosterLoading}
                  >
                    {rosterLoading ? "Refreshing..." : "Refresh roster"}
                  </button>
                </div>
              </div>

              <div className="roster-tabs">
                <button
                  type="button"
                  className={`tab-button ${rosterTab === "active" ? "active" : ""}`}
                  onClick={() => setRosterTab("active")}
                >
                  Active
                </button>
                <button
                  type="button"
                  className={`tab-button ${rosterTab === "inactive" ? "active" : ""}`}
                  onClick={() => setRosterTab("inactive")}
                >
                  Inactive
                </button>
              </div>

              {rosterNotice && <p className="status-note">{rosterNotice}</p>}
              {rosterError && <p className="status-note error">{rosterError}</p>}

              <div className="roster-list">
                {rosterLoading ? (
                  <div className="roster-empty">Loading roster...</div>
                ) : filteredRoster.length === 0 ? (
                  <div className="roster-empty">
                    {rosterTab === "active" ? "No active accounts yet." : "No inactive accounts."}
                  </div>
                ) : (
                  filteredRoster.map((entry) => {
                    const draft = draftChanges[entry.uid] || {};
                    const currentRole = draft.role || entry.role;
                    const currentStatus = draft.status || entry.status;
                    const isSuperUser = entry.role === "super_user";
                    const disableEdits =
                      !canManageUsers || (appUser?.role === "provider" && isSuperUser);
                    const hasChanges =
                      (draft.role && draft.role !== entry.role) ||
                      (draft.status && draft.status !== entry.status);
                    const roleOptions =
                      appUser?.role === "provider"
                        ? ["provider", "intern"]
                        : ["super_user", "provider", "intern"];

                    return (
                      <div className="roster-row" key={entry.uid}>
                        <div className="roster-meta">
                          <div className="avatar-fallback small">
                            {(entry.displayName || entry.email || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="roster-name">{entry.displayName || entry.email}</div>
                            <div className="roster-email">{entry.email}</div>
                            <div
                              className={`pill subtle ${
                                currentStatus === "active" ? "pill-success" : "pill-muted"
                              }`}
                            >
                              {currentStatus === "active" ? "Active" : currentStatus}
                            </div>
                          </div>
                        </div>

                        <div className="roster-controls">
                          <label className="control">
                            <span>Role</span>
                            <select
                              value={currentRole}
                              onChange={(e) =>
                                handleRosterSelectChange(entry.uid, "role", e.target.value)
                              }
                              disabled={disableEdits || savingUserId === entry.uid}
                            >
                              {roleOptions.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="control">
                            <span>Status</span>
                            <select
                              value={currentStatus}
                              onChange={(e) =>
                                handleRosterSelectChange(entry.uid, "status", e.target.value)
                              }
                              disabled={disableEdits || savingUserId === entry.uid}
                            >
                              <option value="active">active</option>
                              <option value="pending">pending</option>
                              <option value="disabled">disabled</option>
                            </select>
                          </label>
                          <div className="control">
                            <span className="sr-only">Save</span>
                            <button
                              type="button"
                              className="save-button"
                              disabled={disableEdits || !hasChanges || savingUserId === entry.uid}
                              onClick={() => handleSaveUser(entry)}
                            >
                              {savingUserId === entry.uid ? "Saving..." : "Save"}
                            </button>
                          </div>
                        </div>
                        {disableEdits && isSuperUser && appUser?.role === "provider" ? (
                          <p className="muted note">Super user accounts require another super user to edit.</p>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          ) : (
            <section className="dashboard">
              <div className="grid">
                {options
                  .filter((item) => !item.requiresManage || canManageUsers)
                  .map((item) => (
                    <button
                      key={item.title}
                      type="button"
                      className="option-card"
                      onClick={() => handleOptionClick(item)}
                    >
                      <div className="option-text">
                        <h3>{item.title}</h3>
                        <p className="muted">{item.detail}</p>
                      </div>
                    </button>
                  ))}
              </div>
            </section>
          )
        ) : (
          <section className="auth-panel">
            <div className="auth-card">
              <div>
                <h2>{isCheckingAccess ? "Verifying access" : "Access pending"}</h2>
                <p className="muted">
                  {isCheckingAccess
                    ? "Hold on while we verify your account with the API."
                    : "Your login succeeded, but an administrator needs to enable your access."}
                </p>
              </div>
              <button type="button" className="link-button" onClick={handleLogout}>
                Sign out
              </button>
              {status && <p className="status-note">{status}</p>}
            </div>
          </section>
        )}

        {status && user && isAuthorized && <div className="status-bar">{status}</div>}
      </div>
    </div>
  );
}

export default App;
