import { useEffect, useState } from "react";
import { fetchChallenges, fetchMission, logAction, fetchSummary } from "./api";

const CAT_COLORS = {
  Transport: "#f59e0b",
  Compute:   "#3b82f6",
  Food:      "#d97706",
  Meetings:  "#ec4899",
};

export default function MissionsPage({ user }) {
  const [data, setData]         = useState(null);
  const [mission, setMission]   = useState(null);
  const [missionDone, setMissionDone] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchChallenges(user.userId),
      fetch("http://localhost:5000/mission").then(r => r.json()),
    ])
      .then(([ch, m]) => {
        setData(ch && ch.challenges ? ch : { challenges: [], badges: [] });
        setMission(m && m.id ? m : null);
      })
      .catch(() => {
        setData({ challenges: [], badges: [] });
        setMission(null);
      });
  }, [user.userId]);

  async function completeMission() {
    if (!mission || missionDone) return;
    try {
      await logAction(user.userId, mission.id, true);
      setMissionDone(true);
      const ch = await fetchChallenges(user.userId);
      if (ch && ch.challenges) setData(ch);
    } catch {
      // silently ignore — state already updated optimistically
    }
  }

  if (!data) return <div className="page-loading">Loading…</div>;

  const { challenges, badges } = data;
  const earnedBadges  = badges.filter(b => b.earned);
  const lockedBadges  = badges.filter(b => !b.earned);

  return (
    <div className="inner-page">
      <div className="inner-page-header">
        <h2 className="inner-page-title">Missions</h2>
        <p className="inner-page-sub">Daily mission, weekly challenges, and your earned badges</p>
      </div>

      {/* Daily mission */}
      {mission && (
        <div className="ip-card ip-mission-card">
          <div className="ip-mission-tag">★ Daily Mission · 2× Points</div>
          <div className="ip-mission-title">{mission.name}</div>
          <div className="ip-mission-meta">+{mission.points * 2} pts · {mission.co2_saved_kg} kg CO₂ saved</div>
          {!missionDone
            ? <button className="ip-mission-btn" onClick={completeMission}>I&apos;m On It! ✓</button>
            : <span className="ip-mission-done">✓ Completed today!</span>
          }
        </div>
      )}

      {/* Weekly challenges */}
      <div className="ip-card">
        <div className="ip-card-title">Weekly Challenges</div>
        <p className="ip-card-sub">Resets every Monday. Complete them for bonus points!</p>
        <div className="ip-challenge-list">
          {challenges.map(ch => {
            const color = CAT_COLORS[ch.category] || "#2d7d46";
            const pct   = Math.round((ch.progress / ch.target) * 100);
            return (
              <div key={ch.id} className="ip-challenge-row">
                <div className="ip-challenge-left">
                  <div className="ip-challenge-title">{ch.title}</div>
                  <div className="ip-challenge-prog-row">
                    <div className="ip-bar-wrap">
                      <div className="ip-bar" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="ip-challenge-frac" style={{ color }}>
                      {ch.progress} / {ch.target}
                    </span>
                  </div>
                </div>
                <span
                  className={`ip-challenge-badge ${ch.done ? "done" : ch.progress > 0 ? "progress" : "todo"}`}
                >
                  {ch.done ? "✓ Done" : ch.progress > 0 ? "In Progress" : "Not Started"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges earned */}
      <div className="ip-card">
        <div className="ip-card-title">Badges Earned <span className="ip-card-count">({earnedBadges.length}/{badges.length})</span></div>
        {earnedBadges.length === 0 && (
          <p className="ip-empty">No badges yet — log some actions to start earning!</p>
        )}
        <div className="ip-badge-grid">
          {earnedBadges.map(b => (
            <div key={b.id} className="ip-badge earned">
              <span className="ip-badge-icon">{b.icon}</span>
              <span className="ip-badge-name">{b.name}</span>
              <span className="ip-badge-desc">{b.desc}</span>
            </div>
          ))}
          {lockedBadges.map(b => (
            <div key={b.id} className="ip-badge locked">
              <span className="ip-badge-icon">{b.icon}</span>
              <span className="ip-badge-name">{b.name}</span>
              <span className="ip-badge-desc">{b.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
