# EcoQuest

Full-stack eco-action tracker — React + Vite frontend, Python Flask + SQLite backend.

## Structure

```
ecoquest/
  backend/   Flask API + SQLite
  frontend/  React + Vite app
```

## Running locally

### 1 — Backend

```bash
cd ecoquest/backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Runs on **http://localhost:5000**. SQLite DB (`ecoquest.db`) is created and seeded on first run.

### 2 — Frontend

```bash
cd ecoquest/frontend
npm install
npm run dev
```

Runs on **http://localhost:5173**.

## API reference

| Method | Path | Description |
|--------|------|-------------|
| POST | `/signup` | `{ username, password }` → create account |
| POST | `/login` | `{ username, password }` → authenticate |
| GET | `/actions` | All actions grouped by category |
| POST | `/actions` | `{ name, category }` → create custom action |
| GET | `/mission` | Today's mission (deterministic by day-of-year) |
| POST | `/log` | `{ user_id, action_id, is_mission }` → log an action |
| GET | `/summary?user_id=` | `{ eco_score, total_co2, tree_count }` |
