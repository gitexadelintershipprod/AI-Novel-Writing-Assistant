#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

COMPOSE_FILE="compose.remote.yml"
SERVICES=(database qdrant api web)
QDRANT_HEALTH_URL="${QDRANT_HEALTH_URL:-http://127.0.0.1:16333/readyz}"
API_HEALTH_URL="${API_HEALTH_URL:-http://127.0.0.1:3165/api/health}"
WEB_HEALTH_URL="${WEB_HEALTH_URL:-http://127.0.0.1:8045/}"
COMMIT_MESSAGE="${1:-chore(deploy): sync remote stack changes}"

fail() {
  echo "deploy-remote: $*" >&2
  exit 1
}

compose() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

wait_for_http() {
  local url="$1"
  local attempt
  for attempt in $(seq 1 30); do
    if curl -fsS -o /dev/null --max-time 5 "$url"; then
      return 0
    fi
    sleep 2
  done
  return 1
}

[[ -f "$COMPOSE_FILE" ]] || fail "missing $COMPOSE_FILE"
[[ -f .env ]] || fail "missing .env"

branch="$(git rev-parse --abbrev-ref HEAD)"
[[ "$branch" == "main" ]] || fail "expected branch main, found $branch"

echo "==> building images"
compose up -d --build

# Recreating the containers is what re-resolves single-file bind mounts. An
# in-place `nginx -s reload` keeps serving the replaced file's original inode.
echo "==> restarting all four services"
for service in "${SERVICES[@]}"; do
  compose restart "$service"
done

echo "==> verifying services"
compose exec -T database sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null \
  || fail "database is not ready"
wait_for_http "$QDRANT_HEALTH_URL" || fail "qdrant is not ready at $QDRANT_HEALTH_URL"
wait_for_http "$API_HEALTH_URL" || fail "api is not ready at $API_HEALTH_URL"
wait_for_http "$WEB_HEALTH_URL" || fail "web is not ready at $WEB_HEALTH_URL"
echo "all four services healthy"

echo "==> staging changes"
git add -A
if git diff --cached --quiet; then
  echo "no changes to publish"
  exit 0
fi

# This repository is public, so refuse anything that looks like a credential or a
# bulk data dump before it can leave the server.
while IFS= read -r file; do
  case "$file" in
    .env | */.env | .env.local | */.env.local | .env.production | */.env.production | \
      *.pem | *.key | *.p12 | *.pfx | *id_rsa* | *id_ed25519* | *.tar.gz | *.tgz | *.dump)
      fail "refusing to publish sensitive or bulk file: $file"
      ;;
  esac
  if [[ -f "$file" && "$(wc -c <"$file")" -gt 5242880 ]]; then
    fail "refusing to publish file larger than 5MB: $file"
  fi
done < <(git diff --cached --name-only --diff-filter=d)

if git diff --cached -U0 | grep -qE 'sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|xox[baprs]-[0-9A-Za-z-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----'; then
  fail "refusing to publish: staged diff contains a credential pattern"
fi

echo "==> committing and pushing to main"
git -c user.name="${DEPLOY_GIT_NAME:-server-deploy}" \
  -c user.email="${DEPLOY_GIT_EMAIL:-deploy@localhost}" \
  commit -m "$COMMIT_MESSAGE"
git push origin main

echo "deploy-remote: done"
