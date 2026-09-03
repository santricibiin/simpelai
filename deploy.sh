#!/usr/bin/env bash
# ============================================================================
#  Simpel AI — deploy.sh
#  Setup penuh, update, restart, logs — CLI interaktif untuk VPS Ubuntu/Debian.
#
#  Pakai:  bash deploy.sh                (menu interaktif)
#          bash deploy.sh setup          (install full, ditanya domain dulu)
#          bash deploy.sh update         (git pull + build + restart)
#          bash deploy.sh restart        (restart api + web + bot)
#          bash deploy.sh logs [api|web|bot|nginx]
#          bash deploy.sh status         (cek semua service)
#          bash deploy.sh ssl            (issue/perpanjang certbot)
# ============================================================================
set -euo pipefail

# ---------------------------------------------------------------- konstanta
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$ROOT/api"
WEB_DIR="$ROOT/web"
NGINX_SITE="/etc/nginx/sites-available/simpelai"
NGINX_LINK="/etc/nginx/sites-enabled/simpelai"
PM2_API="neuroforge-api"
PM2_WEB="neuroforge-web"
PM2_BOT="neuroforge-bot"
LOG_DIR="/var/log/neuroforge"

# ------------------------------------------------------------------ tampilan
if [[ -t 1 ]]; then
  B=$'\e[1m'; DIM=$'\e[2m'; RED=$'\e[31m'; GRN=$'\e[32m'; YLW=$'\e[33m'
  CYN=$'\e[36m'; R=$'\e[0m'
else
  B=""; DIM=""; RED=""; GRN=""; YLW=""; CYN=""; R=""
fi

say()  { printf '%s\n' "${CYN}::${R} $*"; }
ok()   { printf '%s\n' "${GRN} ✓${R} $*"; }
warn() { printf '%s\n' "${YLW} !${R} $*"; }
die()  { printf '%s\n' "${RED} ✗${R} $*" >&2; exit 1; }

banner() {
  printf '%s' "$CYN$B"
  cat <<'EOF'
  ┌─────────────────────────────────────┐
  │     S I M P E L   A I   DEPLOY      │
  └─────────────────────────────────────┘
EOF
  printf '%s' "$R"
}

# ------------------------------------------------------------------- helpers
need_root() {
  [[ $EUID -eq 0 ]] || die "Jalanin sebagai root: sudo bash deploy.sh"
}

ask() { # ask <pertanyaan> <default> -> echo jawaban
  local q="$1" def="$2" ans
  read -rp "$(printf '%s' "${B}$q${R} ${DIM}[$def]${R}: ")" ans
  echo "${ans:-$def}"
}

ask_secret() { # seperti ask tapi input disembunyikan
  local q="$1" ans
  read -rsp "$(printf '%s' "${B}$q${R}: ")" ans; echo
  echo "$ans"
}

rand_hex() { openssl rand -hex 32; }
rand_b64() { openssl rand -base64 32; }

have() { command -v "$1" &>/dev/null; }

# apt install tanpa ribut kalau sudah ada
pkg() {
  local p missing=()
  for p in "$@"; do dpkg -s "$p" &>/dev/null || missing+=("$p"); done
  if ((${#missing[@]})); then
    say "Install paket: ${missing[*]}"
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${missing[@]}"
  fi
}

# --------------------------------------------------------------- 1. INSTALL
install_system() {
  say "Update sistem + install paket dasar"
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    curl git build-essential pkg-config libssl-dev nginx \
    mysql-server certbot python3-certbot-nginx openssl ca-certificates >/dev/null
  ok "Paket sistem siap (nginx, mysql, certbot)"

  # --- Node.js (via nvm untuk user root, plus symlink sistem)
  if ! have node; then
    say "Install Node.js 22 LTS"
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs >/dev/null
  fi
  ok "Node.js $(node -v)"

  # --- Rust
  if ! have cargo; then
    say "Install Rust (rustup)"
    curl -fsSL https://sh.rustup.rs | sh -s -- -y --default-toolchain stable >/dev/null
    source "$HOME/.cargo/env"
  fi
  ok "Rust $(rustc --version | awk '{print $2}')"

  # --- PM2
  if ! have pm2; then
    say "Install PM2 global"
    npm install -g pm2 >/dev/null
  fi
  ok "PM2 $(pm2 -v)"
}

# ------------------------------------------------------------ 2. DATABASE
setup_database() {
  say "Setup MySQL (database + user)"
  local DB_PASS
  if [[ -f "$API_DIR/.env" ]]; then
    DB_PASS="$(grep -m1 '^DATABASE_URL=' "$API_DIR/.env" | sed 's|.*:.*:.*@|x|;s|@.*||;s|x||')"
  fi
  [[ -n "${DB_PASS:-}" ]] || DB_PASS="$(rand_hex)"

  mysql -e "CREATE DATABASE IF NOT EXISTS neuroforge CHARACTER SET utf8mb4;"
  mysql -e "CREATE USER IF NOT EXISTS 'neuroforge'@'127.0.0.1' IDENTIFIED BY '$DB_PASS';"
  mysql -e "GRANT ALL ON neuroforge.* TO 'neuroforge'@'127.0.0.1'; FLUSH PRIVILEGES;"
  echo "$DB_PASS" > "$ROOT/.dbpass"; chmod 600 "$ROOT/.dbpass"
  ok "Database neuroforge + user neuroforge siap"

  say "Jalankan migrasi"
  local f
  for f in "$API_DIR"/migrations/*.sql; do
    mysql neuroforge < "$f" && say "  └─ $(basename "$f")"
  done
  ok "Migrasi selesai"
}

# ------------------------------------------------------------- 3. ENV FILE
setup_env() {
  local DOMAIN="$1"

  say "Generate file .env"

  # --- API
  local DB_PASS; DB_PASS="$(cat "$ROOT/.dbpass" 2>/dev/null || rand_hex)"
  if [[ ! -f "$API_DIR/.env" ]]; then
    local ADMIN_EMAIL ADMIN_PASS JWT ENC
    ADMIN_EMAIL="$(ask "Email admin" "admin@$DOMAIN")"
    until [[ ${#ADMIN_PASS} -ge 8 ]]; do
      ADMIN_PASS="$(ask_secret "Password admin (min 8 karakter)")"
      ((${#ADMIN_PASS} >= 8)) || warn "Minimal 8 karakter"
    done
    JWT="$(rand_hex)"; ENC="$(rand_b64)"
    cat > "$API_DIR/.env" <<EOF
DATABASE_URL=mysql://neuroforge:${DB_PASS}@127.0.0.1:3306/neuroforge
BIND_ADDR=127.0.0.1:8080
WEB_ORIGIN=https://$DOMAIN
JWT_SECRET=$JWT
ENCRYPTION_KEY=$ENC
ALLOW_PRIVATE_UPSTREAM=true
SEED_ADMIN_EMAIL=$ADMIN_EMAIL
SEED_ADMIN_PASSWORD=$ADMIN_PASS
EOF
    chmod 600 "$API_DIR/.env"
    ok "api/.env dibuat"
  else
    ok "api/.env sudah ada — lewati"
  fi

  # --- Web
  if [[ ! -f "$WEB_DIR/.env" ]]; then
    local RKEY RSECRET
    RKEY="$(ask "Reseller API key (rsl_... atau enter untuk kosong)" "")"
    RSECRET="$(ask "Reseller secret (atau enter untuk kosong)" "")"
    cat > "$WEB_DIR/.env" <<EOF
NEXT_PUBLIC_API_URL=https://$DOMAIN
API_URL=http://127.0.0.1:8080
RESELLER_API_URL=https://bandelbanget.xyz
RESELLER_API_KEY=$RKEY
RESELLER_SECRET=$RSECRET
EOF
    chmod 600 "$WEB_DIR/.env"
    ok "web/.env dibuat"
  else
    ok "web/.env sudah ada — lewati"
  fi
}

# -------------------------------------------------------------- 4. NGINX/SSL
setup_nginx() {
  local DOMAIN="$1"
  say "Configure nginx: $DOMAIN"

  cat > "$NGINX_SITE" <<EOF
map \$http_upgrade \$connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://\$host\$request_uri; }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    client_max_body_size 25m;

    # API Rust
    location /api/status { proxy_pass http://127.0.0.1:8080; include /etc/nginx/proxy_params_common; }
    location /v1/        { proxy_pass http://127.0.0.1:8080; include /etc/nginx/proxy_params_common; proxy_buffering off; proxy_read_timeout 300s; }

    # Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        include /etc/nginx/proxy_params_common;
        proxy_read_timeout 300s;
    }
}
EOF

  # include bersama untuk header proxy
  cat > /etc/nginx/proxy_params_common <<'EOF'
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
EOF

  ln -sf "$NGINX_SITE" "$NGINX_LINK"
  nginx -t 2>/dev/null || die "config nginx tidak valid"
  systemctl reload nginx
  ok "nginx aktif → $DOMAIN"
}

setup_ssl() {
  local DOMAIN="$1"
  say "Issue SSL (certbot)"
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
    --register-unsafely-without-email --redirect || die "certbot gagal — cek DNS domain"
  # rewrite config ke path certbot standar sudah otomatis; pastikan renewal
  systemctl enable --now certbot.timer 2>/dev/null || true
  ok "SSL aktif + auto-renew"
}

# ---------------------------------------------------------------- 5. BUILD
build_all() {
  say "Build API (Rust, release)"
  (cd "$API_DIR" && source "$HOME/.cargo/env" 2>/dev/null; cargo build --release)
  ok "Binary API: $API_DIR/target/release/neuroforge-api"

  say "Install dependensi web + build (Next.js)"
  (cd "$WEB_DIR" && npm install --no-audit --no-fund && npm run build)
  ok "Next.js build selesai"
}

# ---------------------------------------------------------------- 6. PM2
pm2_setup() {
  say "Register service di PM2"
  (cd "$API_DIR" && pm2 start "$API_DIR/target/release/neuroforge-api" --name "$PM2_API" --update-env)
  (cd "$WEB_DIR" && pm2 start npm --name "$PM2_WEB" -- start)
  pm2 save
  pm2 startup systemd -u "$USER" --hp "$HOME" >/dev/null 2>&1 || true
  ok "PM2: $PM2_API, $PM2_WEB"
}

# ================================================================ COMMANDS
cmd_setup() {
  need_root
  banner
  say "MODE SETUP PENUH — sistem baru"

  local DOMAIN
  DOMAIN="$(ask "Domain untuk routing (contoh: buatprem.biz.id)" "")"
  [[ -n "$DOMAIN" ]] || die "Domain wajib diisi"

  install_system
  setup_database
  setup_env "$DOMAIN"
  build_all
  setup_nginx "$DOMAIN"
  # SSL dulu konek ke port 80 — perlu web jalan? Tidak: certbot --nginx cukup.
  pm2_setup
  setup_ssl "$DOMAIN"

  echo
  ok "SELESAI 🎉  https://$DOMAIN"
  say "Login admin: email di api/.env (SEED_ADMIN_EMAIL)"
  say "Cek status:  bash deploy.sh status"
}

cmd_update() {
  need_root
  banner
  say "MODE UPDATE — git pull + rebuild + restart"

  cd "$ROOT"
  say "git pull"
  local OUT
  if ! OUT="$(git pull 2>&1)"; then die "git pull gagal: $OUT"; fi
  echo "$OUT" | grep -q "Already up to date" && { ok "Sudah up to date — tidak ada rebuild"; return; }
  echo "$OUT" | sed 's/^/    /'

  say "Apply migrasi baru (kalau ada)"
  local f
  for f in "$API_DIR"/migrations/*.sql; do
    mysql neuroforge < "$f" 2>/dev/null && say "  └─ $(basename "$f")" || true
  done

  build_all
  cmd_restart
  ok "Update selesai"
}

cmd_restart() {
  need_root
  banner
  say "Restart service"
  pm2 restart "$PM2_API" --update-env 2>/dev/null || warn "$PM2_API tidak ada di PM2"
  pm2 restart "$PM2_WEB" --update-env 2>/dev/null || warn "$PM2_WEB tidak ada di PM2"
  pm2 restart "$PM2_BOT" --update-env 2>/dev/null || warn "$PM2_BOT tidak ada di PM2"
  sleep 2
  cmd_status
}

cmd_logs() {
  local what="${1:-all}"
  banner
  case "$what" in
    api)   pm2 logs "$PM2_API" --lines 50 ;;
    web)   pm2 logs "$PM2_WEB" --lines 50 ;;
    bot)   pm2 logs "$PM2_BOT" --lines 50 ;;
    nginx) journalctl -u nginx -n 50 --no-pager ;;
    all)   pm2 logs --lines 50 ;;
    *) die "logs: pilih api|web|bot|nginx|all" ;;
  esac
}

cmd_status() {
  banner
  say "Status service"
  pm2 ls 2>/dev/null || die "PM2 belum jalan"
  echo
  say "Endpoint check"
  local WEB_PORT api web
  WEB_PORT="$(ss -tlnp 2>/dev/null | grep -oP '(?<=:)\d+(?=.*)' >/dev/null; ss -tlnp | awk '/next-server/{match($0,/:(300[0-9])/,m); print m[1]; exit}')"
  WEB_PORT="${WEB_PORT:-3000}"
  api="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:8080/api/status || echo down)"
  web="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:$WEB_PORT/ || echo down)"
  [[ $api == 200 ]] && ok "API  :8080 → $api" || warn "API  :8080 → $api"
  [[ $web == 200 || $web == 307 ]] && ok "Web  :$WEB_PORT → $web" || warn "Web  :$WEB_PORT → $web"
  echo
  say "Disk & memori"
  df -h / | tail -1 | awk '{printf "  disk: %s used (%s free)\n",$3,$4}'
  free -h | awk '/Mem:/{printf "  mem : %s used / %s\n",$3,$2}'
}

cmd_ssl() {
  need_root
  local DOMAIN
  DOMAIN="$(grep -m1 server_name "$NGINX_SITE" 2>/dev/null | awk '{print $2}' | head -1)"
  DOMAIN="$(ask "Domain untuk SSL" "${DOMAIN:-}")"
  [[ -n "$DOMAIN" ]] || die "Domain wajib"
  certbot renew --dry-run 2>/dev/null && ok "Renewal OK" || setup_ssl "$DOMAIN"
}

cmd_bot() {
  need_root
  banner
  say "Start/refresh Telegram bot"
  local TOKEN
  TOKEN="$(ask_secret "Token bot (dari @BotFather, enter = pakai token di admin panel)")"
  (cd "$WEB_DIR" && pm2 start scripts/telegram-bot.mjs --name "$PM2_BOT" ${TOKEN:+-- $TOKEN} --update-env 2>/dev/null \
    || pm2 restart "$PM2_BOT" --update-env)
  ok "Bot jalan di PM2 sebagai $PM2_BOT"
}

# ==================================================================== MENU
menu() {
  banner
  cat <<EOF
  ${B}1${R} Setup penuh      ${DIM}install semua + domain + ssl${R}
  ${B}2${R} Update           ${DIM}git pull + build + restart${R}
  ${B}3${R} Restart          ${DIM}api, web, bot${R}
  ${B}4${R} Status           ${DIM}cek service & endpoint${R}
  ${B}5${R} Logs             ${DIM}api | web | bot | nginx${R}
  ${B}6${R} SSL              ${DIM}issue / perpanjang cert${R}
  ${B}7${R} Bot Telegram     ${DIM}start/refresh bot${R}
  ${B}0${R} Keluar

EOF
  local CHOICE
  CHOICE="$(ask "Pilih menu" "1")"
  case "$CHOICE" in
    1) cmd_setup ;;
    2) cmd_update ;;
    3) cmd_restart ;;
    4) cmd_status ;;
    5) local L; L="$(ask "Log apa (api/web/bot/nginx/all)" "all")"; cmd_logs "$L" ;;
    6) cmd_ssl ;;
    7) cmd_bot ;;
    0) exit 0 ;;
    *) die "Pilihan tidak valid" ;;
  esac
}

# ==================================================================== MAIN
case "${1:-menu}" in
  setup)   cmd_setup ;;
  update)  cmd_update ;;
  restart) cmd_restart ;;
  status)  cmd_status ;;
  logs)    cmd_logs "${2:-all}" ;;
  ssl)     cmd_ssl ;;
  bot)     cmd_bot ;;
  menu|"") menu ;;
  *) die "Perintah tidak dikenal: $1 (setup|update|restart|status|logs|ssl|bot)" ;;
esac
