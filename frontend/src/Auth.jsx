import { useState } from "react";
import { apiLogin, apiSignup } from "./api";
import "./Auth.css";

export default function Auth({ onAuth }) {
  const [mode, setMode]               = useState("login"); // "login" | "signup"
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [teamName, setTeamName]       = useState("");
  const [productName, setProductName] = useState("");
  const [organization, setOrganization] = useState("");
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail.endsWith("@ibm.com")) {
      setError("Only @ibm.com email addresses are permitted.");
      return;
    }

    setLoading(true);
    let res;
    if (mode === "login") {
      res = await apiLogin(trimmedEmail, password);
    } else {
      res = await apiSignup(trimmedEmail, password, {
        teamName: teamName.trim(),
        productName: productName.trim(),
        organization: organization.trim(),
      });
    }
    setLoading(false);

    if (!res.ok) {
      setError(res.data.error || "Something went wrong");
      return;
    }
    onAuth({
      userId:       res.data.user_id,
      username:     res.data.username,
      teamName:     res.data.team_name || "",
      productName:  res.data.product_name || "",
      organization: res.data.organization || "",
      role:         res.data.role || "employee",
    });
  }

  return (
    <div className="auth-bg">
      {/* Left branding panel */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-brand">
            <div className="auth-brand-logo">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="20" fill="#1a7a3c"/>
                <path d="M20 8c-6.6 0-12 5.4-12 12 0 3.5 1.5 6.7 3.8 9l2.1-2.1C12.3 25.1 11 22.7 11 20c0-5 4-9 9-9s9 4 9 9c0 2.7-1.3 5.1-3 6.9l2.1 2.1C30.5 26.7 32 23.5 32 20c0-6.6-5.4-12-12-12z" fill="white" opacity=".8"/>
                <path d="M20 14a6 6 0 100 12 6 6 0 000-12zm0 2a4 4 0 110 8 4 4 0 010-8z" fill="white"/>
                <circle cx="20" cy="20" r="2.5" fill="white"/>
              </svg>
            </div>
            <div>
              <div className="auth-brand-name">IBM EcoQuest</div>
              <div className="auth-brand-sub">Workplace Sustainability</div>
            </div>
          </div>

          <div className="auth-hero">
            <h1 className="auth-hero-title">Small actions,<br/>big impact.</h1>
            <p className="auth-hero-body">
              Track your daily green habits, earn eco points, and grow your
              virtual forest — one sustainable choice at a time.
            </p>
          </div>

          <div className="auth-feature-list">
            <div className="auth-feature">
              <span className="auth-feat-icon">🌿</span>
              <span>Log daily sustainable actions</span>
            </div>
            <div className="auth-feature">
              <span className="auth-feat-icon">📊</span>
              <span>Track your CO₂ savings</span>
            </div>
            <div className="auth-feature">
              <span className="auth-feat-icon">🏆</span>
              <span>Compete on team leaderboards</span>
            </div>
            <div className="auth-feature">
              <span className="auth-feat-icon">🌳</span>
              <span>Grow your personal forest</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2 className="auth-card-title">
              {mode === "login" ? "Sign in to your account" : "Create your account"}
            </h2>
            <p className="auth-card-sub">
              {mode === "login"
                ? "Welcome back! Use your IBM email to continue."
                : "Join EcoQuest with your IBM email to start your journey."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label>IBM Email</label>
              <input
                type="email"
                placeholder="yourname@ibm.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="auth-field">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {mode === "signup" && (
              <>
                <div className="auth-field-row">
                  <div className="auth-field">
                    <label>Team Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Cloud Squad"
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                    />
                  </div>
                  <div className="auth-field">
                    <label>Product / Project</label>
                    <input
                      type="text"
                      placeholder="e.g. Watson X"
                      value={productName}
                      onChange={e => setProductName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="auth-field">
                  <label>Organization / Department</label>
                  <input
                    type="text"
                    placeholder="e.g. IBM Research"
                    value={organization}
                    onChange={e => setOrganization(e.target.value)}
                  />
                </div>
              </>
            )}

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <p className="auth-toggle">
            {mode === "login" ? "New to EcoQuest?" : "Already have an account?"}
            {" "}
            <button
              className="auth-link"
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            >
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </p>

          <p className="auth-ibm-note">
            🔒 Access restricted to <strong>@ibm.com</strong> employees only.
          </p>
        </div>
      </div>
    </div>
  );
}
