import React, { useState } from "react";
import Auth from "./Auth";
import Dashboard from "./Dashboard";

class Boundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { crashed: true, error };
  }
  render() {
    if (this.state.crashed) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          fontFamily: "-apple-system, 'Segoe UI', system-ui, sans-serif",
          background: "#f4f8f2", color: "#1e3320", gap: 16,
        }}>
          <div style={{ fontSize: "2rem" }}>🌿</div>
          <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>Something went wrong</div>
          <div style={{ fontSize: "0.84rem", color: "#5a7a5c", maxWidth: 320, textAlign: "center" }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </div>
          <button
            onClick={() => this.setState({ crashed: false, error: null })}
            style={{
              background: "#1a5c30", color: "#fff", border: "none",
              borderRadius: 8, padding: "10px 22px", fontWeight: 700,
              fontSize: "0.9rem", cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState(null);

  function handleAuth(userData) { setUser(userData); }
  function handleLogout()       { setUser(null); }

  return (
    <Boundary>
      {!user
        ? <Auth onAuth={handleAuth} />
        : <Dashboard user={user} onLogout={handleLogout} />
      }
    </Boundary>
  );
}
