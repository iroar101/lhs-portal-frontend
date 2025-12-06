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

const provider = new GoogleAuthProvider();

const options = [
  {
    title: "Injury Reports",
    detail: "Track incidents and clearances.",
    icon: "IR",
  },
  {
    title: "Clearance Forms",
    detail: "Manage notes and RTP steps.",
    icon: "CF",
  },
  {
    title: "Schedules & Coverage",
    detail: "Coverage and on-call schedules.",
    icon: "SC",
  },
  {
    title: "Supplies & Inventory",
    detail: "Supplies and equipment status.",
    icon: "SI",
  },
  {
    title: "Athlete Outreach",
    detail: "Check-ins and reminders.",
    icon: "AO",
  },
  {
    title: "Training Resources",
    detail: "Protocols and rehab guides.",
    icon: "TR",
  },
];

function App() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setStatus(currentUser ? "Signed in with Google." : "");
      setIsSigningIn(false);
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
    } catch (err) {
      console.error(err);
      setStatus(`Error signing out: ${err.message}`);
    }
  };

  const handleOptionClick = (title) => {
    setStatus(`${title} is coming soon. The section is a placeholder for now.`);
  };

  const userInitial = user?.displayName?.[0]?.toUpperCase() ?? "U";
  const firstName = user?.displayName?.split(" ")[0] ?? "there";
  const headline = user ? "Dashboard" : "Sign-In Portal";

  return (
    <div className="app-shell">
      <div className="surface">
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
        ) : (
          <section className="dashboard">
            <div className="welcome-card">
              <div>
                <p className="eyebrow">Welcome</p>
                <h2>{firstName}, choose a section.</h2>
                <p className="muted">These links are placeholders until features land.</p>
              </div>
            </div>

            <div className="grid">
              {options.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  className="option-card"
                  onClick={() => handleOptionClick(item.title)}
                >
                  <div className="icon-circle">{item.icon}</div>
                  <div className="option-text">
                    <h3>{item.title}</h3>
                    <p className="muted">{item.detail}</p>
                    <span className="coming-soon">Coming soon</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {status && user && <div className="status-bar">{status}</div>}
      </div>
    </div>
  );
}

export default App;
