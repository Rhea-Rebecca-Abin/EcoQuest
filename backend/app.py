import sqlite3, math, datetime, bcrypt
from flask import Flask, request, jsonify, g
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_PATH = "ecoquest.db"

SEED_ACTIONS = [
    # Water
    ("Reusable water bottle",                                "Water",           10,  0.08),
    ("Shorter shower",                                       "Water",            10,  0.05),
    # Transport
    ("Walk or cycle 2km+",                                   "Transport",        15,  0.40),
    ("Carpool or transit",                                   "Transport",        10,  0.25),
    ("Electric vehicle commute",                             "Transport",        10,  0.15),
    ("Combine errands with commute",                         "Transport",        10,  0.30),
    ("Use company shuttle service",                          "Transport",        10,  0.20),
    ("Park-and-ride",                                        "Transport",        10,  0.20),
    # Waste
    ("Skip single-use plastic bag",                          "Waste",            10,  0.06),
    ("Reusable coffee cup",                                  "Waste",            10,  0.05),
    ("Recycle or compost",                                   "Waste",            10,  0.10),
    # Energy
    ("Lights off when leaving",                              "Energy",            5,  0.02),
    ("Unplug unused chargers",                               "Energy",            5,  0.01),
    ("Air-dry clothes",                                      "Energy",           15,  0.30),
    ("Lower screen brightness for a full work day",          "Energy",            3,  0.02),
    ("Use battery saver / eco power mode for a day",         "Energy",            5,  0.05),
    ("Close unused background apps/tabs for the day",        "Energy",            3,  0.02),
    ("Use wired connection instead of Wi-Fi heavy syncing",  "Energy",            3,  0.02),
    # Food
    ("Plant-based meal",                                     "Food",             15,  0.50),
    ("Buy local/seasonal produce",                           "Food",             10,  0.15),
    ("Choose vegetarian/vegan option at office cafeteria",   "Food",             15,  0.50),
    ("Use refill station instead of bottled water",          "Food",             10,  0.08),
    ("Bring own cutlery/container instead of disposable",    "Food",             10,  0.06),
    ("Share a delivery order with a coworker",               "Food",             10,  0.20),
    # Compute & Cloud
    ("Terminate idle Kubernetes pods/namespaces",            "Compute",          10,  0.30),
    ("Delete orphaned storage (snapshots, disks)",           "Compute",          10,  0.20),
    ("Schedule heavy batch/training job for off-peak hours", "Compute",          15,  0.30),
    ("Use serverless function instead of standing VM",       "Compute",          10,  0.25),
    ("Set TTL/auto-expiry on temporary dev environment",     "Compute",          10,  0.30),
    # Meetings & Collaboration
    ("Use async updates instead of a sync meeting",          "Meetings",         10,  0.05),
    ("Record session once instead of repeating live",        "Meetings",         10,  0.10),
    ("Default to audio-only for a call",                     "Meetings",          5,  0.05),
    ("Keep recurring meeting to scheduled time",             "Meetings",          3,  0.02),
]

# ── DB ────────────────────────────────────────────────────────────────────────

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(exc=None):
    db = g.pop("db", None)
    if db: db.close()

def init_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            team_name     TEXT NOT NULL DEFAULT '',
            product_name  TEXT NOT NULL DEFAULT '',
            organization  TEXT NOT NULL DEFAULT '',
            role          TEXT NOT NULL DEFAULT 'employee',
            created_at    TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS actions (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            name         TEXT NOT NULL,
            category     TEXT NOT NULL,
            points       INTEGER NOT NULL DEFAULT 10,
            co2_saved_kg REAL    NOT NULL DEFAULT 0.1
        );
        CREATE TABLE IF NOT EXISTS logs (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER NOT NULL,
            action_id     INTEGER NOT NULL,
            points_earned INTEGER NOT NULL,
            co2_earned    REAL    NOT NULL,
            timestamp     TEXT NOT NULL DEFAULT (datetime('now'))
        );
    """)
    # Add new columns if upgrading from old schema
    for col, typedef in [
        ("team_name",    "TEXT NOT NULL DEFAULT ''"),
        ("product_name", "TEXT NOT NULL DEFAULT ''"),
        ("organization", "TEXT NOT NULL DEFAULT ''"),
        ("role",         "TEXT NOT NULL DEFAULT 'employee'"),
    ]:
        try:
            db.execute(f"ALTER TABLE users ADD COLUMN {col} {typedef}")
            db.commit()
        except Exception:
            pass

    if db.execute("SELECT COUNT(*) FROM actions").fetchone()[0] == 0:
        db.executemany(
            "INSERT INTO actions (name, category, points, co2_saved_kg) VALUES (?,?,?,?)",
            SEED_ACTIONS,
        )
    db.commit()
    db.close()

# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/signup")
def signup():
    d = request.get_json()
    username     = (d.get("username") or "").strip()
    password     = d.get("password") or ""
    team_name    = (d.get("team_name") or "").strip()
    product_name = (d.get("product_name") or "").strip()
    organization = (d.get("organization") or "").strip()
    if not username or not password:
        return jsonify({"error": "username and password required"}), 400
    if not username.lower().endswith("@ibm.com"):
        return jsonify({"error": "Only @ibm.com email addresses are allowed"}), 400
    db = get_db()
    if db.execute("SELECT id FROM users WHERE username=?", (username,)).fetchone():
        return jsonify({"error": "username taken"}), 409
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    cur = db.execute(
        "INSERT INTO users (username, password_hash, team_name, product_name, organization) VALUES (?,?,?,?,?)",
        (username, hashed, team_name, product_name, organization),
    )
    db.commit()
    return jsonify({
        "user_id": cur.lastrowid,
        "username": username,
        "team_name": team_name,
        "product_name": product_name,
        "organization": organization,
        "role": "employee",
    }), 201

@app.post("/login")
def login():
    d = request.get_json()
    username = (d.get("username") or "").strip()
    password = d.get("password") or ""
    if not username or not password:
        return jsonify({"error": "username and password required"}), 400
    db = get_db()
    row = db.execute(
        "SELECT id, password_hash, team_name, product_name, organization, role FROM users WHERE username=?",
        (username,)
    ).fetchone()
    if not row or not bcrypt.checkpw(password.encode(), row["password_hash"].encode()):
        return jsonify({"error": "incorrect username or password"}), 401
    return jsonify({
        "user_id": row["id"],
        "username": username,
        "team_name": row["team_name"] or "",
        "product_name": row["product_name"] or "",
        "organization": row["organization"] or "",
        "role": row["role"] or "employee",
    }), 200

# ── Actions ───────────────────────────────────────────────────────────────────

@app.get("/actions")
def get_actions():
    db = get_db()
    rows = db.execute("SELECT * FROM actions ORDER BY category, id").fetchall()
    grouped = {}
    for r in rows:
        grouped.setdefault(r["category"], []).append(dict(r))
    return jsonify(grouped)

@app.post("/actions")
def create_action():
    d = request.get_json()
    name     = (d.get("name") or "").strip()
    category = (d.get("category") or "").strip()
    if not name or not category:
        return jsonify({"error": "name and category required"}), 400
    db = get_db()
    cur = db.execute(
        "INSERT INTO actions (name, category, points, co2_saved_kg) VALUES (?,?,10,0.1)",
        (name, category),
    )
    db.commit()
    row = db.execute("SELECT * FROM actions WHERE id=?", (cur.lastrowid,)).fetchone()
    return jsonify(dict(row)), 201

# ── Mission ───────────────────────────────────────────────────────────────────

@app.get("/mission")
def get_mission():
    db = get_db()
    rows = db.execute("SELECT * FROM actions ORDER BY id").fetchall()
    if not rows:
        return jsonify({"error": "no actions"}), 404
    idx = datetime.date.today().timetuple().tm_yday % len(rows)
    return jsonify(dict(rows[idx]))

# ── Log ───────────────────────────────────────────────────────────────────────

@app.post("/log")
def log_action():
    d = request.get_json()
    user_id    = d.get("user_id")
    action_id  = d.get("action_id")
    is_mission = bool(d.get("is_mission", False))
    if not user_id or not action_id:
        return jsonify({"error": "user_id and action_id required"}), 400
    db = get_db()
    action = db.execute("SELECT * FROM actions WHERE id=?", (action_id,)).fetchone()
    if not action:
        return jsonify({"error": "action not found"}), 404
    pts = action["points"] * (2 if is_mission else 1)
    co2 = action["co2_saved_kg"]
    db.execute(
        "INSERT INTO logs (user_id, action_id, points_earned, co2_earned) VALUES (?,?,?,?)",
        (user_id, action_id, pts, co2),
    )
    db.commit()
    return jsonify({"points_earned": pts, "co2_earned": co2}), 201

# ── Summary ───────────────────────────────────────────────────────────────────

@app.get("/summary")
def summary():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    db = get_db()
    row = db.execute(
        "SELECT COALESCE(SUM(points_earned),0) as eco_score, "
        "COALESCE(SUM(co2_earned),0) as total_co2 "
        "FROM logs WHERE user_id=?", (user_id,)
    ).fetchone()
    eco_score  = row["eco_score"]
    total_co2  = round(row["total_co2"], 2)
    tree_count = math.floor(eco_score / 50)

    # Weekly logs (last 7 days)
    weekly = db.execute(
        "SELECT date(timestamp) as day, COALESCE(SUM(co2_earned),0) as co2 "
        "FROM logs WHERE user_id=? AND timestamp >= datetime('now','-6 days') "
        "GROUP BY date(timestamp) ORDER BY day",
        (user_id,)
    ).fetchall()
    weekly_data = [{"day": r["day"], "co2": round(r["co2"], 2)} for r in weekly]

    # Recent 5 actions
    recent = db.execute(
        "SELECT a.name, l.co2_earned, l.timestamp "
        "FROM logs l JOIN actions a ON a.id=l.action_id "
        "WHERE l.user_id=? ORDER BY l.timestamp DESC LIMIT 5",
        (user_id,)
    ).fetchall()
    recent_data = [{"name": r["name"], "co2": round(r["co2_earned"], 2), "timestamp": r["timestamp"]} for r in recent]

    return jsonify({
        "eco_score":   eco_score,
        "total_co2":   total_co2,
        "tree_count":  tree_count,
        "weekly":      weekly_data,
        "recent":      recent_data,
    })

# ── Logs (paginated) ──────────────────────────────────────────────────────────

@app.get("/logs")
def get_logs():
    user_id = request.args.get("user_id")
    limit   = int(request.args.get("limit", 50))
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    db = get_db()

    rows = db.execute(
        "SELECT a.name, a.category, l.points_earned, l.co2_earned, l.timestamp "
        "FROM logs l JOIN actions a ON a.id=l.action_id "
        "WHERE l.user_id=? ORDER BY l.timestamp DESC LIMIT ?",
        (user_id, limit),
    ).fetchall()

    # Category breakdown
    cat_rows = db.execute(
        "SELECT a.category, COUNT(*) as cnt, COALESCE(SUM(l.co2_earned),0) as co2 "
        "FROM logs l JOIN actions a ON a.id=l.action_id "
        "WHERE l.user_id=? GROUP BY a.category",
        (user_id,),
    ).fetchall()

    # Streak: count consecutive days up to today
    day_rows = db.execute(
        "SELECT DISTINCT date(timestamp) as day FROM logs "
        "WHERE user_id=? ORDER BY day DESC",
        (user_id,),
    ).fetchall()
    streak = 0
    today  = datetime.date.today()
    for i, r in enumerate(day_rows):
        expected = today - datetime.timedelta(days=i)
        if str(r["day"]) == str(expected):
            streak += 1
        else:
            break

    # This-week count
    week_count = db.execute(
        "SELECT COUNT(*) FROM logs WHERE user_id=? "
        "AND timestamp >= datetime('now', 'weekday 1', '-7 days')",
        (user_id,),
    ).fetchone()[0]

    total_count = db.execute(
        "SELECT COUNT(*) FROM logs WHERE user_id=?", (user_id,)
    ).fetchone()[0]

    return jsonify({
        "logs": [dict(r) for r in rows],
        "categories": [dict(r) for r in cat_rows],
        "streak":      streak,
        "week_count":  week_count,
        "total_count": total_count,
    })

# ── Challenges ────────────────────────────────────────────────────────────────

WEEKLY_CHALLENGES = [
    {"id": 1, "title": "Go car-free for 3 days",           "category": "Transport", "target": 3,  "action_filter": ["Walk or cycle 2km+", "Carpool or transit", "Use company shuttle service", "Park-and-ride", "Electric vehicle commute"]},
    {"id": 2, "title": "Delete 2 orphaned cloud resources","category": "Compute",   "target": 2,  "action_filter": ["Delete orphaned storage (snapshots, disks)", "Terminate idle Kubernetes pods/namespaces", "Set TTL/auto-expiry on temporary dev environment"]},
    {"id": 3, "title": "Log 5 plant-based meals",          "category": "Food",      "target": 5,  "action_filter": ["Plant-based meal", "Choose vegetarian/vegan option at office cafeteria"]},
    {"id": 4, "title": "Replace 3 meetings with async",    "category": "Meetings",  "target": 3,  "action_filter": ["Use async updates instead of a sync meeting", "Record session once instead of repeating live"]},
]

BADGE_DEFS = [
    {"id": "first_action", "name": "First Action",   "icon": "🌱", "desc": "Log your first action",              "check": lambda cnt, co2, streak, cats: cnt >= 1},
    {"id": "streak_3",     "name": "3-Day Streak",   "icon": "🔥", "desc": "Log actions 3 days in a row",        "check": lambda cnt, co2, streak, cats: streak >= 3},
    {"id": "streak_5",     "name": "5-Day Streak",   "icon": "🔥", "desc": "Log actions 5 days in a row",        "check": lambda cnt, co2, streak, cats: streak >= 5},
    {"id": "streak_10",    "name": "10-Day Streak",  "icon": "🚀", "desc": "Log actions 10 days in a row",       "check": lambda cnt, co2, streak, cats: streak >= 10},
    {"id": "co2_1kg",      "name": "1 kg CO₂ Saved", "icon": "🌍", "desc": "Save 1 kg of CO₂",                  "check": lambda cnt, co2, streak, cats: co2 >= 1},
    {"id": "co2_10kg",     "name": "10 kg CO₂ Saved","icon": "🌏", "desc": "Save 10 kg of CO₂",                 "check": lambda cnt, co2, streak, cats: co2 >= 10},
    {"id": "forest",       "name": "Forest Grower",  "icon": "🌳", "desc": "Earn 50 eco points",                 "check": lambda cnt, co2, streak, cats: cnt >= 5},
    {"id": "cloud_hero",   "name": "Cloud Hero",     "icon": "💻", "desc": "Log 3 Compute & Cloud actions",      "check": lambda cnt, co2, streak, cats: cats.get("Compute", 0) >= 3},
    {"id": "green_commuter","name":"Green Commuter",  "icon": "🚗", "desc": "Log 5 Transport actions",           "check": lambda cnt, co2, streak, cats: cats.get("Transport", 0) >= 5},
    {"id": "plant_lover",  "name": "Plant Lover",    "icon": "🌿", "desc": "Log 5 Food/plant-based actions",     "check": lambda cnt, co2, streak, cats: cats.get("Food", 0) >= 5},
]

@app.get("/challenges")
def get_challenges():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    db = get_db()

    # Count completions per action name in the current week (Mon–Sun)
    week_logs = db.execute(
        "SELECT a.name, COUNT(*) as cnt FROM logs l "
        "JOIN actions a ON a.id=l.action_id "
        "WHERE l.user_id=? AND date(l.timestamp) >= date('now','weekday 1','-7 days') "
        "GROUP BY a.name",
        (user_id,),
    ).fetchall()
    name_counts = {r["name"]: r["cnt"] for r in week_logs}

    result_challenges = []
    for ch in WEEKLY_CHALLENGES:
        done = sum(name_counts.get(n, 0) for n in ch["action_filter"])
        progress = min(done, ch["target"])
        result_challenges.append({
            "id":       ch["id"],
            "title":    ch["title"],
            "category": ch["category"],
            "target":   ch["target"],
            "progress": progress,
            "done":     progress >= ch["target"],
        })

    # Badges
    total_count = db.execute("SELECT COUNT(*) FROM logs WHERE user_id=?", (user_id,)).fetchone()[0]
    total_co2   = db.execute("SELECT COALESCE(SUM(co2_earned),0) FROM logs WHERE user_id=?", (user_id,)).fetchone()[0]
    day_rows    = db.execute(
        "SELECT DISTINCT date(timestamp) as day FROM logs WHERE user_id=? ORDER BY day DESC", (user_id,)
    ).fetchall()
    streak = 0
    today  = datetime.date.today()
    for i, r in enumerate(day_rows):
        if str(r["day"]) == str(today - datetime.timedelta(days=i)):
            streak += 1
        else:
            break
    cat_counts_rows = db.execute(
        "SELECT a.category, COUNT(*) as cnt FROM logs l "
        "JOIN actions a ON a.id=l.action_id WHERE l.user_id=? GROUP BY a.category",
        (user_id,),
    ).fetchall()
    cat_counts = {r["category"]: r["cnt"] for r in cat_counts_rows}

    badges = []
    for b in BADGE_DEFS:
        earned = b["check"](total_count, total_co2, streak, cat_counts)
        badges.append({"id": b["id"], "name": b["name"], "icon": b["icon"], "desc": b["desc"], "earned": earned})

    return jsonify({"challenges": result_challenges, "badges": badges})

# ── Team summary ──────────────────────────────────────────────────────────────

@app.get("/team-summary")
def team_summary():
    team = request.args.get("team")
    if not team:
        return jsonify({"error": "team required"}), 400
    db = get_db()

    members = db.execute(
        "SELECT u.id, u.username, "
        "COALESCE(SUM(l.points_earned),0) as pts, "
        "COALESCE(SUM(l.co2_earned),0) as co2, "
        "COUNT(l.id) as action_count "
        "FROM users u LEFT JOIN logs l ON l.user_id=u.id "
        "WHERE u.team_name=? GROUP BY u.id ORDER BY pts DESC",
        (team,),
    ).fetchall()

    team_pts  = sum(m["pts"] for m in members)
    team_co2  = round(sum(m["co2"] for m in members), 2)

    # Team rank among all teams
    all_teams = db.execute(
        "SELECT u.team_name, COALESCE(SUM(l.points_earned),0) as pts "
        "FROM users u LEFT JOIN logs l ON l.user_id=u.id "
        "WHERE u.team_name != '' GROUP BY u.team_name ORDER BY pts DESC"
    ).fetchall()
    rank = next((i + 1 for i, t in enumerate(all_teams) if t["team_name"] == team), 1)
    total_teams = len(all_teams)

    # This-week count for members
    week_data = db.execute(
        "SELECT u.username, COUNT(l.id) as week_count "
        "FROM users u LEFT JOIN logs l ON l.user_id=u.id "
        "AND date(l.timestamp) >= date('now','weekday 1','-7 days') "
        "WHERE u.team_name=? GROUP BY u.id",
        (team,),
    ).fetchall()
    week_map = {r["username"]: r["week_count"] for r in week_data}

    member_list = []
    for m in members:
        member_list.append({
            "username":    m["username"],
            "pts":         m["pts"],
            "co2":         round(m["co2"], 2),
            "action_count": m["action_count"],
            "week_count":  week_map.get(m["username"], 0),
        })

    return jsonify({
        "team":         team,
        "team_pts":     team_pts,
        "team_co2":     team_co2,
        "rank":         rank,
        "total_teams":  total_teams,
        "members":      member_list,
    })

# ── Leaderboard ───────────────────────────────────────────────────────────────

@app.get("/leaderboard")
def leaderboard():
    period = request.args.get("period", "month")
    db = get_db()
    if period == "week":
        date_filter = "AND l.timestamp >= datetime('now', 'weekday 1', '-7 days')"
    elif period == "all":
        date_filter = ""
    else:  # month
        date_filter = "AND strftime('%Y-%m', l.timestamp) = strftime('%Y-%m', 'now')"

    rows = db.execute(
        f"SELECT u.username, u.team_name, COALESCE(SUM(l.points_earned),0) as total_pts, "
        f"COALESCE(SUM(l.co2_earned),0) as total_co2 "
        f"FROM users u LEFT JOIN logs l ON l.user_id=u.id {date_filter} "
        f"GROUP BY u.id ORDER BY total_pts DESC LIMIT 10"
    ).fetchall()
    return jsonify([dict(r) for r in rows])

@app.get("/leaderboard/teams")
def leaderboard_teams():
    period = request.args.get("period", "month")
    db = get_db()
    if period == "week":
        date_filter = "AND l.timestamp >= datetime('now', 'weekday 1', '-7 days')"
    elif period == "all":
        date_filter = ""
    else:
        date_filter = "AND strftime('%Y-%m', l.timestamp) = strftime('%Y-%m', 'now')"

    rows = db.execute(
        f"SELECT u.team_name, COALESCE(SUM(l.points_earned),0) as total_pts, "
        f"COALESCE(SUM(l.co2_earned),0) as total_co2, COUNT(DISTINCT u.id) as member_count "
        f"FROM users u LEFT JOIN logs l ON l.user_id=u.id "
        f"WHERE u.team_name != '' {date_filter} "
        f"GROUP BY u.team_name ORDER BY total_pts DESC LIMIT 10"
    ).fetchall()
    return jsonify([dict(r) for r in rows])

if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
