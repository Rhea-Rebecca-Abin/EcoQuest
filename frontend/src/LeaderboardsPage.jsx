import { useEffect, useState } from "react";
import { fetchLeaderboard, fetchLeaderboardTeams } from "./api";

const MEDALS = ["🥇", "🥈", "🥉"];
const PERIODS = [
  { id: "week",  label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "all",   label: "All Time" },
];
const TABS = [
  { id: "individual", label: "Individual" },
  { id: "teams",      label: "Teams" },
];

function displayName(str) {
  if (!str) return "?";
  return str.includes("@") ? str.split("@")[0] : str;
}

function initials(str) {
  return displayName(str).slice(0, 2).toUpperCase();
}

const AV_COLORS = [
  "#2d7d46","#1565c0","#e65100","#6a1b9a","#c62828","#00838f","#2e7d32","#ad1457","#0277bd","#558b2f",
];

export default function LeaderboardsPage({ user }) {
  const [tab, setTab]       = useState("individual");
  const [period, setPeriod] = useState("month");
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetcher = tab === "teams"
      ? fetchLeaderboardTeams(period)
      : fetchLeaderboard(period);
    fetcher
      .then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setRows([]); setLoading(false); });
  }, [tab, period]);

  const displayRows = rows;

  return (
    <div className="inner-page">
      <div className="inner-page-header">
        <h2 className="inner-page-title">Leaderboards</h2>
        <p className="inner-page-sub">See how you and your teams rank across IBM EcoQuest</p>
      </div>

      {/* Tab + period filters */}
      <div className="lb-filters">
        <div className="lb-tab-group">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`lb-tab${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="lb-period-group">
          {PERIODS.map(p => (
            <button
              key={p.id}
              className={`lb-period${period === p.id ? " active" : ""}`}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ip-card">
        {loading && <p className="ip-empty">Loading…</p>}

        {!loading && displayRows.length === 0 && (
          <p className="ip-empty">No data yet for this period — start logging actions!</p>
        )}

        {!loading && displayRows.map((row, i) => {
          const isMe = tab !== "teams" && row.username === user.username;
          const name = tab === "teams"
            ? (row.team_name || "Unknown Team")
            : displayName(row.username);
          const sub = tab !== "teams" && row.team_name ? row.team_name : null;
          const valPts = row.total_pts || 0;
          const valCo2 = Number(row.total_co2 || 0).toFixed(2);
          const color  = AV_COLORS[i % AV_COLORS.length];
          const avatarStr = tab === "teams" ? (row.team_name || "?") : (row.username || "?");

          return (
            <div key={i} className={`lb-full-row${isMe ? " lb-full-me" : ""}`}>
              <span className="lb-full-rank">
                {i < 3 ? MEDALS[i] : <span className="lb-num">{i + 1}</span>}
              </span>
              <div className="lb-full-av" style={{ background: color }}>
                {initials(avatarStr)}
              </div>
              <div className="lb-full-name-wrap">
                <span className="lb-full-name">{name}</span>
                {sub && <span className="lb-full-sub">{sub}</span>}
                {tab === "teams" && row.member_count != null && (
                  <span className="lb-full-sub">{row.member_count} member{row.member_count !== 1 ? "s" : ""}</span>
                )}
              </div>
              <div className="lb-full-vals">
                <span className="lb-full-pts">{valPts} pts</span>
                <span className="lb-full-co2-sm">{valCo2} kg CO₂</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* My ranking callout */}
      {tab === "individual" && !loading && (
        (() => {
          const myRank = displayRows.findIndex(r => r.username === user.username);
          if (myRank === -1) return null;
          return (
            <div className="lb-my-rank-card">
              <span>Your rank this {period === "week" ? "week" : period === "month" ? "month" : "time"}:</span>
              <strong>#{myRank + 1}</strong>
              <span>with {displayRows[myRank].total_pts} pts</span>
            </div>
          );
        })()
      )}
    </div>
  );
}
