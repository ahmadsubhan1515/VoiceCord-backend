# Voicecord

Discord voice channel & Rich Presence manager with a web dashboard.

---

## Features

- Web Dashboard (Discord blurple + dark theme)
- Multiple Discord Token Management
- Custom Status (Online / Idle / DND)
- Rich Presence (RPC) with images, timestamps & buttons
- Voice Channel Auto-Join / Manual disconnect
- Bulk Operations (restart all, set status, disconnect all VCs)
- PC & Mobile platform spoofing

---

## Requirements

- **Node.js 18+**
- Discord user token(s)
- Server (Guild) ID & Voice Channel ID (for voice features)
- Application ID from [Discord Developer Portal](https://discord.com/developers/applications) (required for RPC buttons)

---

## Local Development

### 1. Install

```bash
npm install
```

### 2. Configure

Create a `.env` file (copy from `.env.example`):

```env
PORT=8080
NODE_ENV=development
ADMIN_USER=admin
ADMIN_PASS=your_secure_password
```

Or create `config.json` in the project root:

```json
{
    "admin_user": "admin",
    "admin_pass": "your_secure_password"
}
```

### 3. Start

```bash
npm start
```

Open **http://localhost:8080** in your browser.

Development mode (auto-restart on file change):

```bash
npm run dev
```

### 4. Run Tests

```bash
npm test
```

---

## Deploy on Vercel

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/voicecord.git
git push -u origin main
```

### Step 2 — Import on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. **Framework Preset**: Other
4. **Root Directory**: Leave as `/` (root)
5. Set **Environment Variables**:

| Variable | Value | Required |
|----------|-------|----------|
| `ADMIN_USER` | Your dashboard username | ✅ Yes |
| `ADMIN_PASS` | Your strong dashboard password | ✅ Yes |
| `TOKENS_JSON` | Full JSON from `tokens.json` (one line) | Optional |

6. Click **Deploy** ✓

### Step 3 — Open

Visit `https://your-project.vercel.app` → login → add your Discord tokens.

---

## Vercel Tips

| Issue | Fix |
|-------|-----|
| Login fails | Set `ADMIN_USER` and `ADMIN_PASS` in Vercel → Settings → Environment Variables, then redeploy |
| Tokens lost after cold start | Set `TOKENS_JSON` env var with the content of your `tokens.json` file (single line JSON) |
| Bots disconnect often | Vercel serverless has execution limits; use the `/api/health` cron (already configured) to keep warm |

---

## Environment Variables

| Variable | Where | Description |
|----------|--------|-------------|
| `ADMIN_USER` | Vercel / `.env` | Dashboard login username |
| `ADMIN_PASS` | Vercel / `.env` | Dashboard login password |
| `TOKENS_JSON` | Vercel | JSON string backup of tokens (overrides file storage) |
| `DATA_DIR` | Local `.env` | Custom directory for `tokens.json` / `config.json` |
| `PORT` | Local `.env` | Server port (default: 8080) |
| `NODE_ENV` | `.env` | `development` or `production` |

---

## Project Structure

```text
voicecord/
├── api/
│   └── index.js             ← Vercel serverless function entry
├── frontend/
│   ├── index.html           ← Dashboard UI
│   ├── login.html           ← Login page
│   ├── app.js               ← Frontend logic
│   └── style.css            ← Styling
├── src/
│   ├── config/index.js      ← Environment & path config
│   ├── controllers/         ← Route logic (auth, tokens, voice, lookup)
│   ├── database/index.js    ← Atomic file persistence
│   ├── middleware/          ← Auth, rate limiting, error handling
│   ├── models/              ← Data validation & normalization
│   ├── routes/              ← Express route definitions
│   ├── services/discord/    ← Discord Gateway WS + REST + TokenManager
│   ├── utils/               ← Logger, sanitizer
│   └── app.js               ← Express app setup
├── test/
│   └── api.test.js          ← Automated integration tests (26 tests)
├── server.js                ← Local server entry point
├── vercel.json              ← Vercel config (routes, cron, headers)
├── package.json
├── .env.example
└── .gitignore
```

---

## Security Notes

- Use a **strong** `ADMIN_PASS` before deploying publicly
- Never commit `.env`, `tokens.json`, or `config.json` (already in `.gitignore`)
- Self-bots violate Discord ToS — use at your own risk

---

## License

MIT
