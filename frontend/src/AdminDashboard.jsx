import { useEffect, useState, useCallback } from "react";
import {
  fetchAdminOverview,
  fetchAdminTeamStatus,
  fetchAdminEsgSummary,
  fetchAdminCo2Trend,
  fetchAdminTopContributors,
} from "./api";
import "./AdminDashboard.css";

const ESG_ICONS = {
  "Compute & Cloud":          "💻",
  "Desk & Device":            "🖥️",
  "Commute & Transport":      "🚗",
  "Meetings & Collaboration": "🤝",
  "Office Consumables":       "☕",
};

const STATUS_META = {
  green: { label: "On Track", bg: "#e6f4e8", color: "#1a5c30", dot: "#2d7d46" },
  amber: { label: "At Risk",  bg: "#fff8e1", color: "#8a5a00", dot: "#f59e0b" },
  red:   { label: "Behind",   bg: "#fef2f2", color: "#b91c1c", dot: "#ef4444" },
};

const AV_COLORS = [
  "#2d7d46","#1565c0","#e65100","#6a1b9a","#c62828",
];

function fmtMonth() {
  return new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function displayUser(username) {
  if (!username) return "?";
  return username.includes("@") ? username.split("@")[0] : username;
}

function initials(username) {
  return displayUser(username).slice(0, 2).toUpperCase();
}

// ── Subcomponents ──────────────────────────────────────────────────────────

function AdminStatCard({ icon, label, value, sub, highlight }) {
  return (
    <div className={`adm-stat${highlight ? " adm-stat-hl" : ""}`}>
      <div className="adm-stat-icon">{icon}</div>
      <div className="adm-stat-body">
        <span className="adm-stat-label">{label}</span>
        <span className="adm-stat-value">{value}</span>
        {sub && <span className="adm-stat-sub">{sub}</span>}
      </div>
    </div>
  );
}

function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div className="adm-prog-wrap">
      <div className="adm-prog-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function EsgBar({ value, max }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div className="adm-esg-bar-wrap">
      <div className="adm-esg-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

// SVG line chart — pure inline SVG, no library needed
function TrendChart({ data }) {
  if (!data || data.length === 0) return <p className="adm-empty">No trend data yet.</p>;

  const W = 560, H = 140, PAD = { top: 14, right: 20, bottom: 28, left: 44 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxCo2 = Math.max(...data.map(d => d.co2), 0.01);
  const pts = data.map((d, i) => {
    const x = PAD.left + (i / (data.length - 1)) * innerW;
    const y = PAD.top + innerH - (d.co2 / maxCo2) * innerH;
    return { x, y, ...d };
  });

  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaD = `${pathD} L${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${pts[0].x.toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;

  // Y-axis gridlines (3 lines)
  const gridLines = [0.25, 0.5, 0.75, 1].map(frac => ({
    y: PAD.top + innerH - frac * innerH,
    label: (frac * maxCo2).toFixed(1),
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="adm-trend-svg" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={g.y} x2={W - PAD.right} y2={g.y}
            stroke="#eef5eb" strokeWidth="1" />
          <text x={PAD.left - 6} y={g.y + 4} textAnchor="end"
            fill="#8aab8c" fontSize="9">{g.label}</text>
        </g>
      ))}
      {/* Area fill */}
      <path d={areaD} fill="#2d7d46" opacity="0.08" />
      {/* Line */}
      <path d={pathD} fill="none" stroke="#2d7d46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots + labels */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#2d7d46" />
          <text x={p.x} y={H - 6} textAnchor="middle" fill="#5a7a5c" fontSize="9">
            {p.label.split(" ")[0]}
          </text>
          {/* Value tooltip above dot */}
          {p.co2 > 0 && (
            <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#0f3d20" fontSize="9" fontWeight="700">
              {p.co2}
            </text>
          )}
        </g>
      ))}
      {/* Y-axis label */}
      <text x="10" y={H / 2} textAnchor="middle" fill="#8aab8c" fontSize="9"
        transform={`rotate(-90, 10, ${H / 2})`}>kg CO₂</text>
    </svg>
  );
}

// Export ESG data as CSV
function exportCSV(esg, trend) {
  const now = new Date().toISOString().split("T")[0];
  let csv = `IBM EcoQuest ESG Export — ${fmtMonth()}\n\n`;

  csv += "=== CO2 by Category ===\n";
  csv += "Category,This Month (kg),Last Month (kg),Change %\n";
  (esg?.categories || []).forEach(c => {
    csv += `"${c.category}",${c.this_month},${c.last_month},${c.change_pct ?? "N/A"}\n`;
  });
  csv += `TOTAL,${esg?.total_this_month ?? 0},${esg?.total_last_month ?? 0},\n\n`;

  csv += "=== 6-Month Trend ===\n";
  csv += "Month,CO2 Saved (kg),Active Employees\n";
  (trend || []).forEach(t => {
    csv += `"${t.label}",${t.co2},${t.active}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `ecoquest-esg-${now}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main component ─────────────────────────────────────────────────────────

export default function AdminDashboard({ user, onLogout }) {
  const [overview,     setOverview]     = useState(null);
  const [teams,        setTeams]        = useState([]);
  const [esg,          setEsg]          = useState(null);
  const [trend,        setTrend]        = useState([]);
  const [contributors, setContributors] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [lastRefresh,  setLastRefresh]  = useState(new Date());

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchAdminOverview(user.userId),
      fetchAdminTeamStatus(user.userId),
      fetchAdminEsgSummary(user.userId),
      fetchAdminCo2Trend(user.userId),
      fetchAdminTopContributors(user.userId),
    ])
      .then(([ov, ts, es, tr, co]) => {
        setOverview(ov && !ov.error ? ov : null);
        setTeams(Array.isArray(ts) ? ts : []);
        setEsg(es && es.categories ? es : null);
        setTrend(Array.isArray(tr) ? tr : []);
        setContributors(Array.isArray(co) ? co : []);
        setLastRefresh(new Date());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user.userId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const displayName = displayUser(user.username);
  const esgMax = esg ? Math.max(...esg.categories.map(c => c.this_month), 0.01) : 0.01;

  return (
    <div className="adm-layout">

      {/* ── Top bar ── */}
      <header className="adm-topbar">
        <div className="adm-topbar-left">
          <div className="adm-logo">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="20" fill="#1a7a3c"/>
              <path d="M20 8c-6.6 0-12 5.4-12 12 0 3.5 1.5 6.7 3.8 9l2.1-2.1C12.3 25.1 11 22.7 11 20c0-5 4-9 9-9s9 4 9 9c0 2.7-1.3 5.1-3 6.9l2.1 2.1C30.5 26.7 32 23.5 32 20c0-6.6-5.4-12-12-12z" fill="white" opacity=".8"/>
              <path d="M20 14a6 6 0 100 12 6 6 0 000-12zm0 2a4 4 0 110 8 4 4 0 010-8z" fill="white"/>
              <circle cx="20" cy="20" r="2.5" fill="white"/>
            </svg>
            <div>
              <div className="adm-logo-name">IBM EcoQuest</div>
              <div className="adm-logo-badge">Admin Console</div>
            </div>
          </div>
        </div>
        <div className="adm-topbar-right">
          <span className="adm-refresh-note">
            Updated {lastRefresh.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button className="adm-refresh-btn" onClick={loadAll}>↻ Refresh</button>
          <div className="adm-admin-pill">
            <span className="adm-admin-dot" />
            {displayName}
          </div>
          <button className="adm-logout" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      {/* ── Page heading ── */}
      <div className="adm-page-head">
        <div>
          <h1 className="adm-page-title">Sustainability Overview</h1>
          <p className="adm-page-sub">{fmtMonth()} · Company-wide metrics</p>
        </div>
      </div>

      {loading && <div className="adm-loading">Loading data…</div>}

      {!loading && (
        <div className="adm-body">

          {/* ── Stat cards ── */}
          <div className="adm-stats-row">
            <AdminStatCard icon="🌍" label="CO₂ Saved (Month to Date)"
              value={overview ? `${overview.total_co2_mtd} kg` : "—"}
              sub="across all employees" highlight />
            <AdminStatCard icon="👥" label="Active Employees"
              value={overview ? overview.active_employees : "—"}
              sub="logged at least one action this month" />
            <AdminStatCard icon="📊" label="Teams on Track"
              value={overview ? `${overview.teams_on_track} / ${overview.total_teams}` : "—"}
              sub="meeting expected monthly progress" />
          </div>

          {/* ── CO2 Trend + Top Contributors (2-col) ── */}
          <div className="adm-mid-grid">

            {/* Trend chart */}
            <div className="adm-card">
              <div className="adm-card-header">
                <div>
                  <div className="adm-card-title">CO₂ Saved — 6-Month Trend</div>
                  <div className="adm-card-sub">Company-wide total per calendar month (kg)</div>
                </div>
              </div>
              <TrendChart data={trend} />
              {trend.length > 1 && (() => {
                const last = trend[trend.length - 1].co2;
                const prev = trend[trend.length - 2].co2;
                const pct  = prev > 0 ? (((last - prev) / prev) * 100).toFixed(1) : null;
                if (pct === null) return null;
                const up = Number(pct) >= 0;
                return (
                  <div className="adm-trend-footer">
                    <span className={`adm-trend-badge ${up ? "up" : "down"}`}>
                      {up ? "▲" : "▼"} {Math.abs(pct)}% vs last month
                    </span>
                    <span className="adm-trend-note">
                      {up ? "Engagement is growing" : "Dip vs prior month — check team activity"}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Top contributors */}
            <div className="adm-card">
              <div className="adm-card-header">
                <div>
                  <div className="adm-card-title">Top Contributors</div>
                  <div className="adm-card-sub">Individual employees this month — recognition champions</div>
                </div>
              </div>
              {contributors.length === 0 && (
                <p className="adm-empty">No employee activity logged yet this month.</p>
              )}
              <div className="adm-contrib-list">
                {contributors.map((c, i) => {
                  const color = AV_COLORS[i % AV_COLORS.length];
                  const name  = displayUser(c.username);
                  return (
                    <div key={i} className="adm-contrib-row">
                      <span className="adm-contrib-rank">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="adm-rank-num">{i + 1}</span>}
                      </span>
                      <div className="adm-contrib-av" style={{ background: color }}>
                        {initials(c.username)}
                      </div>
                      <div className="adm-contrib-info">
                        <span className="adm-contrib-name">{name}</span>
                        {c.team_name && <span className="adm-contrib-team">{c.team_name}</span>}
                      </div>
                      <div className="adm-contrib-vals">
                        <span className="adm-contrib-pts">{c.pts} pts</span>
                        <span className="adm-contrib-co2">{c.co2} kg CO₂</span>
                        <span className="adm-contrib-actions">{c.actions} actions</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Team status ── */}
          <div className="adm-card">
            <div className="adm-card-header">
              <div>
                <div className="adm-card-title">Team Status</div>
                <div className="adm-card-sub">Monthly target: 5,000 pts per team · Sorted by teams needing attention first</div>
              </div>
              <div className="adm-legend">
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <span key={k} className="adm-legend-item">
                    <span className="adm-legend-dot" style={{ background: v.dot }} />
                    {v.label}
                  </span>
                ))}
              </div>
            </div>
            {teams.length === 0 && (
              <p className="adm-empty">No team data yet. Employees need to set a Team Name when signing up.</p>
            )}
            <div className="adm-team-list">
              {teams.map((t, i) => {
                const meta = STATUS_META[t.status] || STATUS_META.red;
                const pct  = Math.min(Math.round((t.score / t.monthly_target) * 100), 100);
                return (
                  <div key={i} className="adm-team-row">
                    <div className="adm-team-name-col">
                      <span className="adm-team-dot" style={{ background: meta.dot }} />
                      <div>
                        <span className="adm-team-name">{t.team_name}</span>
                        <span className="adm-team-members">{t.member_count} member{t.member_count !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div className="adm-team-progress-col">
                      <ProgressBar value={t.score} max={t.monthly_target} color={meta.dot} />
                      <div className="adm-team-prog-labels">
                        <span>{t.score.toLocaleString()} pts</span>
                        <span className="adm-team-prog-target">target {t.monthly_target.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="adm-team-pct-col">
                      <span className="adm-team-pct" style={{ color: meta.dot }}>{pct}%</span>
                    </div>
                    <div className="adm-team-badge-col">
                      <span className="adm-status-badge" style={{ background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── ESG Summary ── */}
          <div className="adm-card">
            <div className="adm-card-header">
              <div>
                <div className="adm-card-title">ESG Summary</div>
                <div className="adm-card-sub">
                  Sustainability metrics — exportable for ESG reporting &nbsp;·&nbsp;
                  {fmtMonth()} vs prior month
                </div>
              </div>
              <div className="adm-esg-header-right">
                {esg && (
                  <div className="adm-esg-totals">
                    <span className="adm-esg-total-val">{esg.total_this_month} kg CO₂</span>
                    <span className="adm-esg-total-label">saved this month</span>
                  </div>
                )}
                <button
                  className="adm-export-btn"
                  onClick={() => exportCSV(esg, trend)}
                  disabled={!esg}
                  title="Download ESG data as CSV"
                >
                  ↓ Export CSV
                </button>
              </div>
            </div>

            {!esg && <p className="adm-empty">No ESG data yet.</p>}

            {esg && (
              <div className="adm-esg-list">
                {esg.categories.map(c => {
                  const icon = ESG_ICONS[c.category] || "🌿";
                  const up   = c.change_pct !== null && c.change_pct >= 0;
                  const changeLabel = c.change_pct !== null
                    ? `${up ? "+" : ""}${c.change_pct}% vs last month`
                    : "No prior month data";
                  return (
                    <div key={c.category} className="adm-esg-row">
                      <span className="adm-esg-icon">{icon}</span>
                      <div className="adm-esg-info">
                        <div className="adm-esg-name-row">
                          <span className="adm-esg-name">{c.category}</span>
                          <span className={`adm-esg-change ${up ? "up" : c.change_pct === null ? "neutral" : "down"}`}>
                            {changeLabel}
                          </span>
                        </div>
                        <EsgBar value={c.this_month} max={esgMax} />
                        <div className="adm-esg-vals">
                          <span className="adm-esg-this">{c.this_month} kg this month</span>
                          <span className="adm-esg-last">{c.last_month} kg last month</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      <footer className="adm-footer">
        IBM EcoQuest · Admin Console · Data refreshes on page load
      </footer>
    </div>
  );
}
