# IBM EcoQuest

> **Making sustainability personally motivating for employees, and organizationally measurable for companies.**

---

## The Problem

Companies are under growing pressure to report ESG and carbon metrics, yet the majority of carbon-saving behaviour happening inside a company — employees walking instead of driving, skipping single-use plastics, eating plant-based meals, or cleaning up idle cloud resources — is invisible, unrewarded, and easy to abandon.

EcoQuest makes that behaviour visible and rewarding. Employees build daily sustainable habits through daily missions, team challenges, and a growing virtual forest. The company gets a real, aggregated picture of its workforce's environmental impact — data it can fold directly into ESG reporting. It is a tool that makes sustainability personally motivating for individuals and organizationally measurable for the business.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Browser (Employee)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Auth / Login │  │  Dashboard   │  │  Admin Dashboard     │   │
│  │  (IBM email)  │  │  Missions    │  │  ESG Summary         │   │
│  │               │  │  Leaderboard │  │  CO₂ Trend           │   │
│  │               │  │  Forest      │  │  Team Status         │   │
│  └──────┬────────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │                  │                     │               │
│         └──────────────────┴─────────────────────┘               │
│                         React 18 + Vite                          │
└──────────────────────────────┬───────────────────────────────────┘
                               │  HTTP / REST (JSON)
                               │  http://localhost:5000
┌──────────────────────────────▼───────────────────────────────────┐
│                       Flask API (Python 3)                        │
│                                                                  │
│  POST /signup   POST /login       GET  /actions                  │
│  POST /actions  GET  /mission     POST /log                      │
│  GET  /summary  GET  /logs        GET  /challenges               │
│  GET  /leaderboard                GET  /leaderboard/teams        │
│  GET  /team-summary               GET  /admin/overview           │
│  GET  /admin/esg-summary          GET  /admin/co2-trend          │
│  GET  /admin/team-status          GET  /admin/top-contributors   │
│                                                                  │
│  Flask-CORS · bcrypt password hashing                            │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                       SQLite (ecoquest.db)                        │
│                                                                  │
│  users      id · username · password_hash · team_name            │
│             product_name · organization · role · created_at      │
│                                                                  │
│  actions    id · name · category · points · co2_saved_kg         │
│                                                                  │
│  logs       id · user_id · action_id · points_earned             │
│             co2_earned · timestamp                               │
└──────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
ecoquest/
├── backend/
│   ├── app.py               # Flask API — all routes, DB init, seeding
│   ├── requirements.txt     # flask, flask-cors, bcrypt
│   └── ecoquest.db          # SQLite database (auto-created on first run)
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx              # React entry point
        ├── App.jsx               # Root — auth gate, role routing
        ├── Auth.jsx              # Login / sign-up form (IBM email only)
        ├── Dashboard.jsx         # Employee home, forest, nav shell
        ├── MyActionsPage.jsx     # Log actions by category
        ├── MissionsPage.jsx      # Daily mission + badges
        ├── TeamChallengePage.jsx # Weekly team challenges
        ├── LeaderboardsPage.jsx  # Individual & team leaderboards
        ├── AdminDashboard.jsx    # ESG overview, CO₂ trend, team status
        └── api.js                # Fetch helpers for all API calls
```

---

## Key Features

### For Employees
| Feature | Description |
|---|---|
| **Action Logging** | 30+ pre-seeded eco-actions across 7 categories: Water, Transport, Energy, Waste, Food, Compute & Cloud, and Meetings & Collaboration |
| **Daily Missions** | A deterministic mission is generated each day (by day-of-year), keeping the habit loop fresh without manual curation |
| **Virtual Forest** | Eco points grow a personal forest — from sprout to sapling to full tree — giving a visual, cumulative reward for sustained effort |
| **Badges** | Ten achievement badges (First Action, streak milestones, CO₂ thresholds, category specialisms) earned automatically |
| **Weekly Challenges** | Four rotating team challenges (e.g. "Go car-free for 3 days", "Log 5 plant-based meals") with progress tracking |
| **Leaderboards** | Individual and team rankings by eco score, driving friendly workplace competition |
| **CO₂ Tracking** | Every logged action carries a `co2_saved_kg` value; cumulative savings are surfaced in the personal summary |

### For Admins / ESG Reporting
| Feature | Description |
|---|---|
| **Organisation Overview** | Total actions, total CO₂ saved, active users, and monthly target progress at a glance |
| **ESG Category Breakdown** | Aggregated CO₂ savings mapped to five ESG reporting categories: Compute & Cloud, Desk & Device, Commute & Transport, Meetings & Collaboration, Office Consumables |
| **CO₂ Trend Chart** | Month-by-month CO₂ reduction data ready for board-level sustainability reporting |
| **Team Status Dashboard** | Per-team RAG (Red / Amber / Green) status against monthly CO₂ targets |
| **Top Contributors** | Ranked list of highest-impact employees to recognise and reward sustainability champions |

---

## How to Run Locally

### Prerequisites

- Python 3.9+
- Node.js 18+

### 1 — Backend

```bash
cd ecoquest/backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The API starts on **http://localhost:5000**.  
The SQLite database (`ecoquest.db`) is created and seeded with actions and the admin account on the first run.

### 2 — Frontend

Open a second terminal:

```bash
cd ecoquest/frontend
npm install
npm run dev
```

The app is served on **http://localhost:5173**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 5 |
| **Linting** | OxLint |
| **Backend** | Python 3, Flask 3 |
| **Auth** | bcrypt password hashing |
| **CORS** | Flask-CORS |
| **Database** | SQLite (via Python `sqlite3`) |

---

## How to Log In

### Employee account

1. Open **http://localhost:5173**
2. Click **Create account**
3. Enter any **`@ibm.com`** email address, a password, and your team / organisation details
4. Click **Sign in** on subsequent visits

> Access is restricted to `@ibm.com` email addresses only.

### Admin account

A default admin account is seeded automatically on first run:

| Field | Value |
|---|---|
| Email | `admin.ecoquest@ibm.com` |
| Password | `GreenPlanet2025!` |

The admin view shows the ESG dashboard, CO₂ trend, team RAG status, and top contributors — no employee action logging.

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/signup` | `{ username, password, team_name, product_name, organization }` → create account |
| `POST` | `/login` | `{ username, password }` → authenticate |
| `GET` | `/actions` | All actions grouped by category |
| `POST` | `/actions` | `{ name, category }` → create a custom action |
| `GET` | `/mission` | Today's mission (deterministic by day-of-year) |
| `POST` | `/log` | `{ user_id, action_id }` → log an action |
| `GET` | `/summary?user_id=` | `{ eco_score, total_co2, tree_count }` |
| `GET` | `/logs?user_id=` | Full action history for a user |
| `GET` | `/challenges?user_id=` | Weekly challenges + badge status |
| `GET` | `/leaderboard` | Individual leaderboard |
| `GET` | `/leaderboard/teams` | Team leaderboard |
| `GET` | `/team-summary?user_id=` | Team-level aggregated stats |
| `GET` | `/admin/overview` | Org-wide totals and monthly target |
| `GET` | `/admin/esg-summary` | CO₂ by ESG category (current & previous month) |
| `GET` | `/admin/co2-trend` | Month-by-month CO₂ trend |
| `GET` | `/admin/team-status` | Per-team RAG status |
| `GET` | `/admin/top-contributors` | Ranked list of top employees |

---

## License

This project was built as part of a hackathon and is intended for **learning and development purposes only**. It is not an official IBM product or offering.
