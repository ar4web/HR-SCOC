# Deployment Guide (Docker)

One-command deployment for a VPS (Hetzner, DigitalOcean, Railway, etc.).

## Quick deploy on a VPS

```bash
# 1. Copy project to the server (e.g. via git or scp)
git clone <your-repo-url> hr-app && cd hr-app

# 2. (Optional) Gmail integration env vars
cp .env.example .env
#   set TOKEN_SECRET (required in production), then fill in
#   GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET, and set
#   GMAIL_REDIRECT_URI=https://your-domain.com/api/email/gmail/callback

# 3. One-command deploy
docker compose up -d --build

# 4. Verify
curl -I http://localhost:3001/
# → HTTP/1.1 200 / 307 (redirect to /login is fine)
```

## Logs & management

```bash
docker compose logs -f          # follow logs
docker compose restart hr-app   # restart after config change
docker compose down             # stop
docker compose up -d --build    # rebuild after code change
```

## HTTPS (recommended)

With a domain, add Caddy or Nginx as a reverse proxy in front of port 3001:

```yaml
# add to docker-compose.yml
  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
    depends_on:
      - hr-app
```

`Caddyfile`:

```
your-domain.com {
    reverse_proxy hr-app:3000
    encode gzip
}
```

## Default login

- Email: `admin@scos.sa`
- Password: `Password123!`

## Notes

- Data is persisted to `data/db.json` on the server (with `data/db.backup.json` fallback). It is **not** in-memory-only: changes survive restarts. The `data/` directory is git-ignored and should be mounted/backed up in production.
- Auth tokens are HMAC-signed with `TOKEN_SECRET` (set this env var in production; without it a built-in demo secret is used). Passwords are stored as scrypt hashes, and Gmail OAuth refresh tokens are AES-encrypted at rest with the same key.
- The Gmail Email Center integration is optional and requires Google OAuth credentials (see `.env.example`).
- The app listens on port **3000** inside the container; the compose file maps it to **3001** on the host. Change the `ports:` mapping if you prefer another public port.
