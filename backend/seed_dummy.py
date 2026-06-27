"""
Seed dummy users + action logs for admin dashboard showcase.
Teams: Instana, Turbonomic, Concert, HashiCorp  (dept: Automation, org: IBM Software)
Passwords: FirstName@1234  (e.g. alice@ibm.com → Alice@1234)
Run:  python seed_dummy.py
"""

import sqlite3, bcrypt, random, datetime

DB_PATH = "ecoquest.db"

# ── Users ────────────────────────────────────────────────────────────────────
USERS = [
    # (email,               first_name, team,        product,      org)
    # Instana
    ("alice.jones@ibm.com",   "Alice",   "Instana",     "Instana Observability", "IBM Software"),
    ("ben.carter@ibm.com",    "Ben",     "Instana",     "Instana Observability", "IBM Software"),
    ("clara.wu@ibm.com",      "Clara",   "Instana",     "Instana Observability", "IBM Software"),
    ("dan.patel@ibm.com",     "Dan",     "Instana",     "Instana Observability", "IBM Software"),
    # Turbonomic
    ("emma.nguyen@ibm.com",   "Emma",    "Turbonomic",  "Turbonomic AIOps",      "IBM Software"),
    ("finn.okoye@ibm.com",    "Finn",    "Turbonomic",  "Turbonomic AIOps",      "IBM Software"),
    ("grace.lee@ibm.com",     "Grace",   "Turbonomic",  "Turbonomic AIOps",      "IBM Software"),
    ("harry.smith@ibm.com",   "Harry",   "Turbonomic",  "Turbonomic AIOps",      "IBM Software"),
    # Concert
    ("iris.chen@ibm.com",     "Iris",    "Concert",     "IBM Concert",           "IBM Software"),
    ("james.brown@ibm.com",   "James",   "Concert",     "IBM Concert",           "IBM Software"),
    ("kira.hassan@ibm.com",   "Kira",    "Concert",     "IBM Concert",           "IBM Software"),
    ("liam.ford@ibm.com",     "Liam",    "Concert",     "IBM Concert",           "IBM Software"),
    # HashiCorp
    ("maya.kim@ibm.com",      "Maya",    "HashiCorp",   "HashiCorp Vault",       "IBM Software"),
    ("noah.diaz@ibm.com",     "Noah",    "HashiCorp",   "HashiCorp Vault",       "IBM Software"),
    ("olivia.ryan@ibm.com",   "Olivia",  "HashiCorp",   "HashiCorp Vault",       "IBM Software"),
    ("peter.mills@ibm.com",   "Peter",   "HashiCorp",   "HashiCorp Vault",       "IBM Software"),
]

# Action buckets per category (action IDs from seed)
ACTION_BUCKETS = {
    "Water":     [1, 2],
    "Transport": [3, 4, 5, 6, 7, 8],
    "Waste":     [9, 10, 11],
    "Energy":    [12, 13, 14, 15, 16, 17, 18],
    "Food":      [19, 20, 21, 22, 23, 24],
    "Compute":   [25, 26, 27, 28, 29],
    "Meetings":  [30, 31, 32, 33],
}
ALL_ACTION_IDS = [aid for ids in ACTION_BUCKETS.values() for aid in ids]

# Points + CO2 map (mirrors app.py seed)
ACTION_META = {
    1:  (10, 0.08), 2:  (10, 0.05),
    3:  (15, 0.40), 4:  (10, 0.25), 5:  (10, 0.15), 6:  (10, 0.30),
    7:  (10, 0.20), 8:  (10, 0.20),
    9:  (10, 0.06), 10: (10, 0.05), 11: (10, 0.10),
    12: ( 5, 0.02), 13: ( 5, 0.01), 14: (15, 0.30), 15: ( 3, 0.02),
    16: ( 5, 0.05), 17: ( 3, 0.02), 18: ( 3, 0.02),
    19: (15, 0.50), 20: (10, 0.15), 21: (15, 0.50), 22: (10, 0.08),
    23: (10, 0.06), 24: (10, 0.20),
    25: (10, 0.30), 26: (10, 0.20), 27: (15, 0.30), 28: (10, 0.25),
    29: (10, 0.30),
    30: (10, 0.05), 31: (10, 0.10), 32: ( 5, 0.05), 33: ( 3, 0.02),
}

def gen_logs(user_id: int, rng: random.Random) -> list[tuple]:
    """Generate 45–90 days of varied action logs spread over the last 90 days."""
    logs = []
    today = datetime.date.today()
    # Vary activity density per user
    active_days = rng.randint(30, 75)
    day_offsets = rng.sample(range(90), active_days)

    for offset in sorted(day_offsets):
        log_date = today - datetime.timedelta(days=offset)
        # 1–4 actions per active day
        n_actions = rng.randint(1, 4)
        chosen = rng.choices(ALL_ACTION_IDS, k=n_actions)
        for aid in chosen:
            pts, co2 = ACTION_META[aid]
            hour  = rng.randint(8, 18)
            minute = rng.randint(0, 59)
            ts = f"{log_date} {hour:02d}:{minute:02d}:00"
            logs.append((user_id, aid, pts, co2, ts))
    return logs


def main():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row

    inserted_users = 0
    inserted_logs  = 0

    for email, first_name, team, product, org in USERS:
        password = f"{first_name}@1234"
        hashed   = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        existing = db.execute("SELECT id FROM users WHERE username=?", (email,)).fetchone()
        if existing:
            user_id = existing["id"]
            print(f"  [skip]   {email} already exists (id={user_id})")
        else:
            cur = db.execute(
                "INSERT INTO users (username, password_hash, team_name, product_name, organization) "
                "VALUES (?,?,?,?,?)",
                (email, hashed, team, product, org),
            )
            db.commit()
            user_id = cur.lastrowid
            inserted_users += 1
            print(f"  [added]  {email}  team={team}  id={user_id}")

        # Seed logs with a deterministic RNG per user so re-runs are idempotent
        rng = random.Random(user_id * 7919)
        existing_log_count = db.execute(
            "SELECT COUNT(*) FROM logs WHERE user_id=?", (user_id,)
        ).fetchone()[0]
        if existing_log_count == 0:
            logs = gen_logs(user_id, rng)
            db.executemany(
                "INSERT INTO logs (user_id, action_id, points_earned, co2_earned, timestamp) "
                "VALUES (?,?,?,?,?)",
                logs,
            )
            db.commit()
            inserted_logs += len(logs)
            print(f"           → {len(logs)} log entries inserted")
        else:
            print(f"           → logs already present, skipped")

    db.close()
    print(f"\nDone. {inserted_users} users added, {inserted_logs} log entries added.")
    print("\nLogin credentials:")
    print(f"  {'Email':<30}  Password")
    print(f"  {'-'*30}  {'-'*15}")
    for email, first_name, *_ in USERS:
        print(f"  {email:<30}  {first_name}@1234")
    print(f"\n  {'admin.ecoquest@ibm.com':<30}  GreenPlanet2025!  (admin)")


if __name__ == "__main__":
    main()
