const BASE = "http://localhost:5000";

export async function apiSignup(username, password, { teamName, productName, organization } = {}) {
  const r = await fetch(`${BASE}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      password,
      team_name: teamName || "",
      product_name: productName || "",
      organization: organization || "",
    }),
  });
  return r.json().then(d => ({ ok: r.ok, data: d }));
}

export async function apiLogin(username, password) {
  const r = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return r.json().then(d => ({ ok: r.ok, data: d }));
}

export async function fetchActions() {
  const r = await fetch(`${BASE}/actions`);
  return r.json();
}

export async function fetchMission() {
  const r = await fetch(`${BASE}/mission`);
  return r.json();
}

export async function fetchSummary(userId) {
  const r = await fetch(`${BASE}/summary?user_id=${userId}`);
  return r.json();
}

export async function fetchLeaderboard(period = "month") {
  const r = await fetch(`${BASE}/leaderboard?period=${period}`);
  return r.json();
}

export async function fetchLeaderboardTeams(period = "month") {
  const r = await fetch(`${BASE}/leaderboard/teams?period=${period}`);
  return r.json();
}

export async function fetchLogs(userId, limit = 50) {
  const r = await fetch(`${BASE}/logs?user_id=${userId}&limit=${limit}`);
  return r.json();
}

export async function fetchChallenges(userId) {
  const r = await fetch(`${BASE}/challenges?user_id=${userId}`);
  return r.json();
}

export async function fetchTeamSummary(team) {
  const r = await fetch(`${BASE}/team-summary?team=${encodeURIComponent(team)}`);
  return r.json();
}

export async function logAction(userId, actionId, isMission) {
  const r = await fetch(`${BASE}/log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, action_id: actionId, is_mission: isMission }),
  });
  return r.json();
}

export async function createAction(name, category) {
  const r = await fetch(`${BASE}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, category }),
  });
  return r.json().then(d => ({ ok: r.ok, data: d }));
}
