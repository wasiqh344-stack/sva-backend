# SVA Design — Backend

Node.js + Express backend for the SVA Design website. Handles the three things the
frontend already calls:

1. **Contact form** → `POST /api/contact` — saves to a local SQLite DB and emails you a notification.
2. **AI Chat Widget** → `POST /api/chat` — proxies to Claude, answers questions about SVA's services & pricing.
3. **Admin Panel** → `GET /admin` — sign up / log in, view and manage contact submissions.

## 1. Install

```bash
cd sva-backend
npm install
```

## 2. Configure

Copy the example env file and fill in your real values:

```bash
cp .env.example .env
```

Open `.env` and set:

| Variable | What it's for |
|---|---|
| `JWT_SECRET` | Long random string for signing admin login tokens. Generate with `openssl rand -hex 32` |
| `CORS_ORIGIN` | Where your frontend is hosted (comma-separated if multiple), e.g. `https://svadesign.com` |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | For emailing you when a contact form is submitted. Use a Gmail **App Password**, not your real password — create one at https://myaccount.google.com/apppasswords (needs 2FA enabled) |
| `ANTHROPIC_API_KEY` | For the chat widget. Get one at https://console.anthropic.com |
| `ADMIN_SIGNUP_SECRET` | A secret you make up — required to create the *first* (and any) admin account, so random visitors can't self-register as admin |

## 3. Run

```bash
npm start
```

You'll see:
```
SVA Design backend running on http://localhost:3000
Admin panel: http://localhost:3000/admin
```

For local development with auto-restart on file changes:
```bash
npm run dev
```

## 4. Create your admin account

Go to `http://localhost:3000/admin`, click **Sign Up**, and enter:
- Your email + a password (min. 8 characters)
- The `ADMIN_SIGNUP_SECRET` value from your `.env` file (this is the field labelled "Signup secret")

After that first account is created, just use **Sign In** going forward — you don't
need the secret again unless creating another admin account.

## 5. Connect your frontend

Your `index.html` currently points to `http://localhost:3000` for:
- `CHAT_API_URL`
- `ADMIN_PANEL_URL`
- the contact form's `fetch("http://localhost:3000/api/contact")`

That's already correct for local testing. **When you deploy** (e.g. backend on Render/Railway,
frontend on Vercel), update those three constants in your frontend to your live backend URL,
e.g. `https://sva-backend.onrender.com`, and set `CORS_ORIGIN` in the backend's `.env` to your
live frontend URL.

## API Reference

### Public

| Method | Route | Body | Notes |
|---|---|---|---|
| POST | `/api/contact` | `{ name, email, service, message }` | Rate-limited: 10 / 15 min per IP |
| POST | `/api/chat` | `{ messages: [{role, content}], sessionId? }` | Rate-limited: 20 / min per IP |
| GET | `/api/health` | — | Simple uptime check |

### Admin (JWT-protected except signup/login)

| Method | Route | Body | Notes |
|---|---|---|---|
| POST | `/api/admin/signup` | `{ email, password }` + header `x-signup-secret` | Creates an admin account |
| POST | `/api/admin/login` | `{ email, password }` | Returns `{ token }` |
| GET | `/api/admin/me` | — | Requires `Authorization: Bearer <token>` |
| GET | `/api/admin/messages` | — | List all contact submissions |
| PATCH | `/api/admin/messages/:id` | `{ status }` | `status` is one of `new`, `read`, `replied` |
| DELETE | `/api/admin/messages/:id` | — | Deletes a submission |

## Data storage

Uses `better-sqlite3` — a single file database at `data/sva.db` (auto-created on first run,
not committed to git). No external database server needed. Good enough for a small business
site; if you outgrow it later, swap `db.js` for Postgres/MySQL without touching the routes much.

## Deploying

Any Node host works (Render, Railway, Fly.io, a VPS). Steps are the same everywhere:
1. Push this folder to GitHub (`.env` is gitignored — never commit it).
2. Set all the same environment variables from `.env` in your host's dashboard.
3. Set the start command to `npm start`.
4. Point your frontend's `CHAT_API_URL` / `ADMIN_PANEL_URL` / contact `fetch()` to the deployed URL.
