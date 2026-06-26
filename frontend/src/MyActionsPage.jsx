import { useEffect, useState } from "react";
import { fetchLogs } from "./api";

const CAT_META = {
  Water:     { icon: "💧", color: "#0ea5e9" },
  Transport: { icon: "🚗", color: "#f59e0b" },
  Energy:    { icon: "🖥️", color: "#8b5cf6" },
  Waste:     { icon: "♻️", color: "#10b981" },
  Food:      { icon: "☕", color: "#d97706" },
  Compute:   { icon: "💻", color: "#3b82f6" },
  Meetings:  { icon: "🤝", color: "#ec4899" },
};

function fmtDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.round((now - d) / 60000);
  if (diff < 1)    return "just now";
  if (diff < 60)   return `${diff}m ago`;
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function MyActionsPage({ user }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchLogs(user.userId, 50)
      .then(d => setData(d && d.logs !== undefined ? d : null))
      .catch(() => setData({ logs: [], categories: [], streak: 0, week_count: 0, total_count: 0 }));
  }, [user.userId]);

  if (!data) return <div className="page-loading">Loading…</div>;

  const { logs, categories, streak, week_count, total_count } = data;
  const maxCat = Math.max(...categories.map(c => c.cnt), 1);
  const bestCat = categories.reduce((a, b) => (b.cnt > (a?.cnt ?? 0) ? b : a), null);

  return (
    <div className="inner-page">
      <div className="inner-page-header">
        <h2 className="inner-page-title">My Actions</h2>
        <p className="inner-page-sub">Your personal sustainability history &amp; progress</p>
      </div>

      {/* Top stats */}
      <div className="ip-stats-row">
        <div className="ip-stat">
          <span className="ip-stat-icon">✅</span>
          <span className="ip-stat-val">{total_count}</span>
          <span className="ip-stat-label">Total Actions</span>
        </div>
        <div className="ip-stat">
          <span className="ip-stat-icon">📅</span>
          <span className="ip-stat-val">{week_count}</span>
          <span className="ip-stat-label">This Week</span>
        </div>
        <div className="ip-stat">
          <span className="ip-stat-icon">🔥</span>
          <span className="ip-stat-val">{streak}</span>
          <span className="ip-stat-label">Day Streak</span>
        </div>
        <div className="ip-stat">
          <span className="ip-stat-icon">{bestCat ? (CAT_META[bestCat.category]?.icon ?? "🌿") : "🌿"}</span>
          <span className="ip-stat-val" style={{ fontSize: "1.1rem" }}>{bestCat?.category ?? "—"}</span>
          <span className="ip-stat-label">Best Category</span>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="ip-card">
        <div className="ip-card-title">Category Breakdown</div>
        {categories.length === 0 && <p className="ip-empty">No actions logged yet.</p>}
        <div className="ip-cat-list">
          {[...categories].sort((a, b) => b.cnt - a.cnt).map(c => {
            const meta = CAT_META[c.category] || { icon: "🔹", color: "#2d7d46" };
            const pct = Math.round((c.cnt / maxCat) * 100);
            return (
              <div key={c.category} className="ip-cat-row">
                <span className="ip-cat-icon">{meta.icon}</span>
                <div className="ip-cat-info">
                  <div className="ip-cat-name-row">
                    <span className="ip-cat-name">{c.category}</span>
                    <span className="ip-cat-cnt">{c.cnt} actions · {Number(c.co2).toFixed(2)} kg CO₂</span>
                  </div>
                  <div className="ip-bar-wrap">
                    <div className="ip-bar" style={{ width: `${pct}%`, background: meta.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full log */}
      <div className="ip-card">
        <div className="ip-card-title">Action Log <span className="ip-card-count">({logs.length})</span></div>
        {logs.length === 0 && <p className="ip-empty">No actions yet. Start from the Dashboard!</p>}
        <div className="ip-log-list">
          {logs.map((l, i) => {
            const meta = CAT_META[l.category] || { icon: "🔹", color: "#2d7d46" };
            return (
              <div key={i} className="ip-log-row">
                <span className="ip-log-cat-icon">{meta.icon}</span>
                <div className="ip-log-info">
                  <span className="ip-log-name">{l.name}</span>
                  <span className="ip-log-cat" style={{ color: meta.color }}>{l.category}</span>
                </div>
                <div className="ip-log-right">
                  <span className="ip-log-pts">+{l.points_earned} pts</span>
                  <span className="ip-log-co2">+{Number(l.co2_earned).toFixed(2)} kg</span>
                  <span className="ip-log-time">{fmtDate(l.timestamp)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
