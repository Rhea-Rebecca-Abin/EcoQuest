import { useEffect, useState } from "react";
import { fetchTeamSummary } from "./api";

const GOAL_PTS = 5000;

function initials(username) {
  if (!username) return "?";
  const name = username.includes("@") ? username.split("@")[0] : username;
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "#2d7d46","#1565c0","#e65100","#6a1b9a","#c62828","#00838f","#2e7d32","#ad1457",
];

export default function TeamChallengePage({ user }) {
  const [data, setData]   = useState(null);
  const [error, setError] = useState("");
  const teamName = user.teamName;

  useEffect(() => {
    if (!teamName) { setError("no-team"); return; }
    fetchTeamSummary(teamName)
      .then(d => {
        if (d && d.error) setError(d.error);
        else if (d && d.team) setData(d);
        else setError("Could not load team data.");
      })
      .catch(() => setError("Could not load team data."));
  }, [teamName]);

  if (error === "no-team") {
    return (
      <div className="inner-page">
        <div className="inner-page-header">
          <h2 className="inner-page-title">Team Challenge</h2>
        </div>
        <div className="ip-card ip-empty-state">
          <div className="ip-empty-icon">⚑</div>
          <div className="ip-empty-title">You haven&apos;t joined a team yet</div>
          <p className="ip-empty-body">
            When you sign up, add a <strong>Team Name</strong> to be grouped with your
            colleagues and compete together.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return <div className="page-loading">Loading…</div>;

  const goalPct  = Math.min(Math.round((data.team_pts / GOAL_PTS) * 100), 100);
  const remaining = Math.max(GOAL_PTS - data.team_pts, 0);

  return (
    <div className="inner-page">
      <div className="inner-page-header">
        <h2 className="inner-page-title">Team Challenge</h2>
        <p className="inner-page-sub">
          <strong>{data.team}</strong> · competing with {data.total_teams} team{data.total_teams !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Team summary stats */}
      <div className="ip-stats-row">
        <div className="ip-stat">
          <span className="ip-stat-icon">🏆</span>
          <span className="ip-stat-val">{data.team_pts.toLocaleString()}</span>
          <span className="ip-stat-label">Team Points</span>
        </div>
        <div className="ip-stat">
          <span className="ip-stat-icon">🌍</span>
          <span className="ip-stat-val">{data.team_co2} kg</span>
          <span className="ip-stat-label">CO₂ Saved Together</span>
        </div>
        <div className="ip-stat">
          <span className="ip-stat-icon">📊</span>
          <span className="ip-stat-val">#{data.rank}</span>
          <span className="ip-stat-label">Team Rank</span>
        </div>
        <div className="ip-stat">
          <span className="ip-stat-icon">👥</span>
          <span className="ip-stat-val">{data.members.length}</span>
          <span className="ip-stat-label">Members</span>
        </div>
      </div>

      {/* Monthly goal */}
      <div className="ip-card">
        <div className="ip-card-title">Monthly Team Goal</div>
        <div className="ip-goal-row">
          <span className="ip-goal-pts">{data.team_pts.toLocaleString()} pts earned</span>
          <span className="ip-goal-pct">{goalPct}%</span>
        </div>
        <div className="ip-bar-wrap ip-bar-lg">
          <div className="ip-bar" style={{ width: `${goalPct}%`, background: "#2d7d46" }} />
        </div>
        <div className="ip-goal-note">
          {remaining > 0
            ? <>{remaining.toLocaleString()} pts to reach the {GOAL_PTS.toLocaleString()} pt goal</>
            : <>🎉 Goal reached! Amazing team effort!</>
          }
        </div>
      </div>

      {/* Members list */}
      <div className="ip-card">
        <div className="ip-card-title">Team Members</div>
        <div className="ip-member-list">
          {data.members.map((m, i) => {
            const isMe = m.username === user.username;
            const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
            const name = m.username ? (m.username.includes("@") ? m.username.split("@")[0] : m.username) : "?";
            return (
              <div key={m.username} className={`ip-member-row${isMe ? " ip-member-me" : ""}`}>
                <div className="ip-member-av" style={{ background: color }}>
                  {initials(m.username)}
                </div>
                <div className="ip-member-info">
                  <span className="ip-member-name">{name}{isMe ? " (you)" : ""}</span>
                  <span className="ip-member-meta">{m.week_count} actions this week · {m.action_count} total</span>
                </div>
                <div className="ip-member-right">
                  <span className="ip-member-pts">{m.pts} pts</span>
                  <span className="ip-member-co2">{m.co2} kg CO₂</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
