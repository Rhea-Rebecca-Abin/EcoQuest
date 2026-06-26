import { useEffect, useState, useCallback } from "react";
import {
  fetchActions,
  fetchMission,
  fetchSummary,
  fetchLeaderboard,
  logAction,
  createAction,
} from "./api";
import "./Dashboard.css";
import MyActionsPage    from "./MyActionsPage";
import MissionsPage     from "./MissionsPage";
import TeamChallengePage from "./TeamChallengePage";
import LeaderboardsPage from "./LeaderboardsPage";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_ORDER = ["Water", "Transport", "Energy", "Waste", "Food", "Compute", "Meetings"];

const CAT_META = {
  Water:     { icon: "💧", label: "Water" },
  Transport: { icon: "🚗", label: "Commute & Transport" },
  Energy:    { icon: "🖥️", label: "Desk & Device / Energy" },
  Waste:     { icon: "♻️", label: "Waste" },
  Food:      { icon: "☕", label: "Office Consumables & Food" },
  Compute:   { icon: "💻", label: "Compute & Cloud" },
  Meetings:  { icon: "🤝", label: "Meetings & Collaboration" },
};

const NAV_ITEMS = [
  { id: "dashboard",  label: "Dashboard",       icon: "⊟" },
  { id: "actions",    label: "My Actions",       icon: "✓" },
  { id: "missions",   label: "Missions",         icon: "◎" },
  { id: "team",       label: "Team Challenge",   icon: "⚑" },
  { id: "leaderboard",label: "Leaderboards",     icon: "⊞" },
];

const FOREST_STAGES = [
  { cls: "plant-sprout",  glyph: "🌱" },
  { cls: "plant-sapling", glyph: "🌿" },
  { cls: "plant-small",   glyph: "🌲" },
  { cls: "plant-full",    glyph: "🌳" },
];

function getPlantStage(i) {
  if (i === 0) return FOREST_STAGES[0];
  if (i === 1) return FOREST_STAGES[1];
  if (i === 2) return FOREST_STAGES[2];
  return FOREST_STAGES[3];
}

function greet(name) {
  const h = new Date().getHours();
  const salutation = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  if (!name) return `${salutation}!`;
  const display = name.includes("@") ? name.split("@")[0] : name;
  return `${salutation}, ${display.charAt(0).toUpperCase() + display.slice(1)}!`;
}

function fmtDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.round((now - d) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div className={`stat-card${accent ? " stat-card-accent" : ""}`}>
      <div className="stat-icon-wrap">{icon}</div>
      <div className="stat-body">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
        {sub && <span className="stat-sub">{sub}</span>}
      </div>
    </div>
  );
}

function MiniBar({ weekly }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const max = Math.max(...weekly.map(w => w.co2), 0.01);
  return (
    <div className="mini-bar-chart">
      {days.map((d, i) => {
        const entry = weekly[i];
        const val = entry ? entry.co2 : 0;
        const h = Math.round((val / max) * 60);
        return (
          <div key={d} className="mini-bar-col">
            <div
              className="mini-bar-fill"
              style={{ height: `${Math.max(h, 2)}px` }}
              title={`${val} kg CO₂`}
            />
            <span className="mini-bar-label">{d}</span>
          </div>
        );
      })}
    </div>
  );
}

function Forest({ treeCount, ecoScore }) {
  const nextAt = (Math.floor(ecoScore / 50) + 1) * 50;
  const level = Math.floor(ecoScore / 100) + 1;
  const levelNames = ["Seedling","Young Sapling","Sapling","Small Grove","Young Forest","Forest","Ancient Forest"];
  const lvlName = levelNames[Math.min(level - 1, levelNames.length - 1)];
  const xp = ecoScore % 100;
  return (
    <div className="forest-card">
      <div className="forest-card-top">
        <div>
          <div className="forest-badge">Level {level}</div>
          <div className="forest-lvl-name">{lvlName}</div>
          <div className="forest-xp-note">{100 - xp} XP to Level {level + 1}</div>
        </div>
        <div className="forest-grove-small">
          {treeCount === 0 && <span className="forest-empty-small">Complete actions to grow your first tree!</span>}
          {Array.from({ length: Math.min(treeCount, 8) }).map((_, i) => {
            const s = getPlantStage(i);
            return <span key={i} className={`plant ${s.cls}`} title={`Tree #${i + 1}`}>{s.glyph}</span>;
          })}
          {treeCount > 8 && <span className="forest-more">+{treeCount - 8} more</span>}
        </div>
      </div>
      <div className="forest-xp-bar-wrap">
        <div className="forest-xp-bar" style={{ width: `${xp}%` }} />
      </div>
      <div className="forest-xp-label">{xp} / 100 XP · next tree at {nextAt} pts</div>
    </div>
  );
}

function MissionBanner({ mission, onComplete, done }) {
  if (!mission) return null;
  return (
    <div className="mission-banner">
      <div className="mission-banner-left">
        <div className="mission-tag">
          <span className="mission-tag-star">★</span> Today&apos;s Mission
        </div>
        <div className="mission-title">{mission.name}</div>
        <div className="mission-pts-note">+{mission.points * 2} Points &nbsp;·&nbsp; 2× bonus</div>
      </div>
      <div className="mission-banner-right">
        {!done ? (
          <button className="mission-btn" onClick={onComplete}>I&apos;m On It! ✓</button>
        ) : (
          <span className="mission-done">✓ Completed!</span>
        )}
      </div>
    </div>
  );
}

function ActionCard({ action, isMission, onClick }) {
  const [flash, setFlash] = useState(false);
  function handleClick() {
    setFlash(true);
    setTimeout(() => setFlash(false), 450);
    onClick(action, isMission);
  }
  return (
    <button
      className={`action-card${isMission ? " is-mission" : ""}${flash ? " flash" : ""}`}
      onClick={handleClick}
    >
      <div className="ac-top">
        <span className="ac-name">{action.name}</span>
        <span className="ac-pts">+{isMission ? action.points * 2 : action.points} pts</span>
      </div>
      <div className="ac-co2">🌍 {action.co2_saved_kg} kg CO₂</div>
    </button>
  );
}

function AddActionForm({ category, onAdd }) {
  const [open, setOpen]     = useState(false);
  const [name, setName]     = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onAdd(name.trim(), category);
    setName("");
    setSaving(false);
    setOpen(false);
  }

  if (!open) {
    return (
      <button className="action-card add-card" onClick={() => setOpen(true)}>
        <span className="add-icon">＋</span>
        <span>Add custom</span>
      </button>
    );
  }

  return (
    <form className="action-card add-form" onSubmit={submit}>
      <input
        autoFocus
        placeholder="Action name…"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <div className="add-form-btns">
        <button type="submit" disabled={saving}>{saving ? "…" : "Add"}</button>
        <button type="button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard({ user, onLogout }) {
  const [summary, setSummary]         = useState({ eco_score: 0, total_co2: 0, tree_count: 0, weekly: [], recent: [] });
  const [actions, setActions]         = useState({});
  const [mission, setMission]         = useState(null);
  const [missionDone, setMissionDone] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeNav, setActiveNav]     = useState("dashboard");

  const loadData = useCallback(async () => {
    const [s, a, m, lb] = await Promise.all([
      fetchSummary(user.userId),
      fetchActions(),
      fetchMission(),
      fetchLeaderboard(),
    ]);
    setSummary(s);
    setActions(a);
    setMission(m);
    setLeaderboard(lb);
  }, [user.userId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleActionClick(action, isMission) {
    await logAction(user.userId, action.id, isMission);
    if (isMission) setMissionDone(true);
    const s = await fetchSummary(user.userId);
    setSummary(s);
    const lb = await fetchLeaderboard();
    setLeaderboard(lb);
  }

  async function handleAddAction(name, category) {
    await createAction(name, category);
    const a = await fetchActions();
    setActions(a);
  }

  const initials = user.username.includes("@")
    ? user.username.split("@")[0].slice(0, 2).toUpperCase()
    : user.username.slice(0, 2).toUpperCase();

  const displayName = user.username.includes("@")
    ? user.username.split("@")[0]
    : user.username;

  const recent = summary.recent || [];
  const weekly = summary.weekly || [];

  const medalEmojis = ["🥇", "🥈", "🥉"];

  return (
    <div className="dash-layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo-circle">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="20" fill="#1a7a3c"/>
              <path d="M20 8c-6.6 0-12 5.4-12 12 0 3.5 1.5 6.7 3.8 9l2.1-2.1C12.3 25.1 11 22.7 11 20c0-5 4-9 9-9s9 4 9 9c0 2.7-1.3 5.1-3 6.9l2.1 2.1C30.5 26.7 32 23.5 32 20c0-6.6-5.4-12-12-12z" fill="white" opacity=".8"/>
              <path d="M20 14a6 6 0 100 12 6 6 0 000-12zm0 2a4 4 0 110 8 4 4 0 010-8z" fill="white"/>
              <circle cx="20" cy="20" r="2.5" fill="white"/>
            </svg>
          </div>
          <div>
            <div className="sidebar-brand-name">EcoQuest</div>
            <div className="sidebar-brand-sub">Workplace Sustainability</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`sidebar-item${activeNav === item.id ? " active" : ""}`}
              onClick={() => setActiveNav(item.id)}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-username">{displayName}</span>
            {user.teamName && <span className="sidebar-team">{user.teamName}</span>}
          </div>
          <div className="eco-level-mini">
            <span className="eco-lvl-label">Eco Level</span>
            <span className="eco-lvl-val">Level {Math.floor(summary.eco_score / 100) + 1}</span>
            <div className="eco-lvl-bar-wrap">
              <div className="eco-lvl-bar" style={{ width: `${summary.eco_score % 100}%` }} />
            </div>
            <span className="eco-lvl-xp">{summary.eco_score % 100} / 100 XP</span>
          </div>
          <button className="sidebar-logout" onClick={onLogout}>Sign out</button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="dash-main">
        {/* Top bar */}
        <header className="dash-topbar">
          <div>
            <h1 className="dash-greeting">
              {activeNav === "dashboard" ? `${greet(user.username)} 🌿` :
               activeNav === "actions"   ? "My Actions" :
               activeNav === "missions"  ? "Missions" :
               activeNav === "team"      ? "Team Challenge" :
               "Leaderboards"}
            </h1>
            <p className="dash-greeting-sub">
              {activeNav === "dashboard" ? "Small actions today, big impact tomorrow." :
               activeNav === "actions"   ? "Your full history, streaks & category breakdown" :
               activeNav === "missions"  ? "Daily mission, weekly challenges & badges" :
               activeNav === "team"      ? `${user.teamName || "Your team"} · collective impact` :
               "Rankings across IBM EcoQuest"}
            </p>
          </div>
          <div className="dash-topbar-right">
            <span className="dash-date">{new Date().toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}</span>
            <div className="dash-avatar-lg">{initials}</div>
            <span className="dash-topbar-name">{displayName}</span>
          </div>
        </header>

        {/* ── Sub-pages ── */}
        {activeNav === "actions" && <MyActionsPage user={user} />}
        {activeNav === "missions" && <MissionsPage user={user} />}
        {activeNav === "team" && <TeamChallengePage user={user} />}
        {activeNav === "leaderboard" && <LeaderboardsPage user={user} />}

        {/* ── Dashboard main view ── */}
        {activeNav === "dashboard" && (
        <div className="dash-content">
          {/* ── Stat Row ── */}
          <div className="stats-row">
            <StatCard
              icon={<span className="stat-leaf">🌿</span>}
              label="Eco Score"
              value={summary.eco_score}
              sub="pts total"
              accent
            />
            <StatCard
              icon={<span>🌍</span>}
              label="CO₂ Saved Today"
              value={`${summary.total_co2} kg`}
              sub="lifetime total"
            />
            <StatCard
              icon={<span>🌳</span>}
              label="Trees Equivalent"
              value={summary.tree_count}
              sub={summary.tree_count > 0 ? "Keep it up!" : "Log actions to plant!"}
            />
            <StatCard
              icon={<span>📅</span>}
              label="Actions Logged"
              value={recent.length > 0 ? `${recent.length}+` : 0}
              sub="recent actions"
            />
          </div>

          {/* ── 2-col middle grid ── */}
          <div className="dash-mid-grid">
            {/* Left: impact + forest */}
            <div className="dash-mid-left">
              {/* Today's Impact */}
              <div className="impact-card">
                <div className="card-header">
                  <span className="card-title">Your Impact Today</span>
                </div>
                <div className="impact-body">
                  <div className="impact-gauge-wrap">
                    <svg viewBox="0 0 100 60" className="impact-gauge">
                      <path d="M10 55 A40 40 0 0 1 90 55" stroke="#e5ede6" strokeWidth="10" fill="none" strokeLinecap="round"/>
                      <path
                        d="M10 55 A40 40 0 0 1 90 55"
                        stroke="#2d7d46"
                        strokeWidth="10"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray="126"
                        strokeDashoffset={126 - (Math.min(summary.eco_score, 200) / 200) * 126}
                      />
                    </svg>
                    <div className="impact-gauge-label">
                      <span className="impact-score">{summary.eco_score}</span>
                      <span className="impact-score-sub">eco pts</span>
                    </div>
                  </div>
                  <div className="impact-metrics">
                    <div className="impact-row"><span>🌍</span><span>CO₂ Saved</span><strong>{summary.total_co2} kg</strong></div>
                    <div className="impact-row"><span>⚡</span><span>Eco Score</span><strong>{summary.eco_score} pts</strong></div>
                    <div className="impact-row"><span>🌳</span><span>Trees</span><strong>{summary.tree_count}</strong></div>
                  </div>
                </div>
              </div>

              {/* Forest */}
              <Forest treeCount={summary.tree_count} ecoScore={summary.eco_score} />
            </div>

            {/* Right: Mission + leaderboard */}
            <div className="dash-mid-right">
              {mission && (
                <div className="mission-right-card">
                  <div className="mission-rc-tag"><span>★</span> Today&apos;s Mission</div>
                  <div className="mission-rc-title">{mission.name}</div>
                  <div className="mission-rc-sub">Small choice, big impact.</div>
                  {!missionDone ? (
                    <button
                      className="mission-rc-btn"
                      onClick={() => handleActionClick(mission, true)}
                    >
                      I&apos;m On It! ✓
                    </button>
                  ) : (
                    <span className="mission-rc-done">✓ Completed today!</span>
                  )}
                  <div className="mission-rc-pts">+{mission.points * 2} Points</div>
                </div>
              )}

              <div className="leaderboard-card">
                <div className="card-header">
                  <span className="card-title">Team Leaderboard</span>
                  <button className="card-link" onClick={() => setActiveNav("leaderboard")}>View All</button>
                </div>
                {leaderboard.slice(0, 5).map((row, i) => (
                  <div key={i} className={`lb-row${row.username === user.username ? " lb-row-me" : ""}`}>
                    <span className="lb-rank">{i < 3 ? medalEmojis[i] : i + 1}</span>
                    <div className="lb-name-wrap">
                      <span className="lb-name">
                        {row.username ? (row.username.includes("@") ? row.username.split("@")[0] : row.username) : "?"}
                      </span>
                      {row.team_name && <span className="lb-team">{row.team_name}</span>}
                    </div>
                    <span className="lb-pts">{row.total_pts} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Recent Actions + weekly chart ── */}
          <div className="dash-bottom-grid">
            <div className="recent-card">
              <div className="card-header">
                <span className="card-title">Recent Actions</span>
                <button className="card-link" onClick={() => setActiveNav("actions")}>View All</button>
              </div>
              {recent.length === 0 && (
                <p className="empty-state">No actions logged yet. Start below!</p>
              )}
              {recent.map((r, i) => (
                <div key={i} className="recent-row">
                  <div className="recent-icon">🌿</div>
                  <div className="recent-info">
                    <span className="recent-name">{r.name}</span>
                    <span className="recent-time">{fmtDate(r.timestamp)}</span>
                  </div>
                  <span className="recent-co2">+{r.co2} kg CO₂</span>
                </div>
              ))}
            </div>

            <div className="weekly-card">
              <div className="card-header">
                <span className="card-title">Carbon Saved This Week</span>
              </div>
              <MiniBar weekly={weekly} />
              <div className="weekly-total">
                Weekly Total: <strong>{weekly.reduce((s, w) => s + w.co2, 0).toFixed(2)} kg CO₂</strong>
              </div>
            </div>
          </div>

          {/* ── Action Categories ── */}
          <div className="section-divider">Log an Action</div>

          <MissionBanner
            mission={mission}
            done={missionDone}
            onComplete={() => mission && handleActionClick(mission, true)}
          />

          {CATEGORY_ORDER.map(cat => {
            const catActions = actions[cat] || [];
            const meta = CAT_META[cat] || { icon: "🔹", label: cat };
            return (
              <div key={cat} className="category-section">
                <div className="cat-header">
                  <span className="cat-icon">{meta.icon}</span>
                  <span className="cat-name">{meta.label}</span>
                </div>
                <div className="actions-grid">
                  {catActions.map(a => (
                    <ActionCard
                      key={a.id}
                      action={a}
                      isMission={!missionDone && mission?.id === a.id}
                      onClick={handleActionClick}
                    />
                  ))}
                  <AddActionForm category={cat} onAdd={handleAddAction} />
                </div>
              </div>
            );
          })}
        </div>
        )}
      </main>
    </div>
  );
}
