# SVA Design — Backend (v2)

Node.js + Express backend for the SVA Design website. Handles the two things
the frontend needs:

1. **Contact form** → `POST /api/contact` — saves to a local SQLite DB and emails you a notification via Resend.
2. **Admin Panel** → `GET /admin` — sign up / log in, view and manage contact submissions.

No AI chat endpoint — the frontend now uses a WhatsApp / Call / Instagram / Email
speed-dial widget instead, which needs no backend support at all.

## 1. Install

```bash
cd sva-backend
npm install
```

## 2. Configure

```bash
cp .env.example .env
```

Open `.env` and set:

| Variable | What it's for |
|---|---|
| `JWT_SECRET` | Long random string for signing admin login tokens. Generate with `openssl rand -hex 32` |
| `CORS_ORIGIN` | Where your frontend is hosted, e.g. `https://svadesign.com`. Use `*` while testing |
| `RESEND_API_KEY` | For contact-form email notifications. Sign up free at https://resend.com → API Keys |
| `NOTIFY_EMAIL` | The email address that should receive contact-form notifications. Without your own verified domain on Resend, this **must be the same email you signed up to Resend with** |
| `ADMIN_SIGNUP_SECRET` | A secret you make up — required to create an admin account, so random visitors can't self-register as admin |

**Why Resend instead of Gmail SMTP?** Many cloud hosts (Railway, Render, etc.)
block outbound SMTP ports (465/587), which makes Gmail's SMTP time out. Resend
sends over a normal HTTPS API call, which always works.

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
- The `ADMIN_SIGNUP_SECRET` value from your `.env` file

After that, just use **Sign In** going forward.

## 5. Connect your frontend

Your `index.html` should point to your live backend URL in two places:
- The contact form's `fetch("https://your-backend-url/api/contact", ...)`
- `ADMIN_PANEL_URL` (used by the admin sign-in button in the header/nav)

## API Reference

### Public

| Method | Route | Body | Notes |
|---|---|---|---|
| POST | `/api/contact` | `{ name, email, service, message }` | Rate-limited: 10 / 15 min per IP |
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

Uses `better-sqlite3` — a single file database at `data/sva.db` (auto-created on
first run, gitignored). No external database server needed.

## Deploying (Railway, Render, etc.)

1. Push this folder to GitHub (`.env` is gitignored — never commit it).
2. Set all the same environment variables from `.env` in your host's dashboard.
3. Set the start command to `npm start`.
4. Point your frontend's contact-form `fetch()` and `ADMIN_PANEL_URL` to the deployed URL.
5. If your host proxies requests (Railway, Render, Heroku all do), `app.set("trust proxy", 1)`
   in `server.js` is already handled for you — this avoids the
   `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` warning from express-rate-limit.
