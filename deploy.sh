#!/usr/bin/env bash
# Publica o kahuy no Cloudflare, cada parte separada:
#   ./deploy.sh api       testa e publica a API (Worker kahuy-api)
#   ./deploy.sh secrets   envia backend/.env + holidays.local.json como secrets do Worker
#   ./deploy.sh front     build e publica o front (Pages kahuy); cria o projeto na 1ª vez
#   ./deploy.sh all       api → secrets → front (ordem necessária na primeira vez)
# A API vem antes do front: o Pages se liga ao Worker, e os secrets precisam do Worker criado.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAGES_PROJECT="kahuy"

step() { printf '\n\033[1;32m▸ %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

usage() {
  sed -n '2,7p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

# Instala as dependências do projeto se ainda não houver node_modules.
ensure_deps() {
  [[ -d "$1/node_modules" ]] || { step "Instalando dependências de $(basename "$1")/"; npm --prefix "$1" install; }
}

# Garante o login no Cloudflare (abre o navegador na primeira vez).
ensure_login() {
  if (cd "$ROOT/backend" && npx wrangler whoami 2>&1) | grep -qi 'not authenticated'; then
    step "Entrando na conta Cloudflare"
    (cd "$ROOT/backend" && npx wrangler login)
  fi
}

deploy_api() {
  ensure_deps "$ROOT/backend"
  ensure_login
  step "API: testes e typecheck"
  (cd "$ROOT/backend" && npm test && npm run typecheck)
  step "API: publicando o Worker kahuy-api"
  (cd "$ROOT/backend" && npm run deploy)
}

deploy_secrets() {
  ensure_deps "$ROOT/backend"
  ensure_login
  [[ -f "$ROOT/backend/.env" ]] || fail "backend/.env não existe (copie de backend/.env.example)"
  if grep -qE '^\s*HOLIDAYS=' "$ROOT/backend/.env"; then
    echo "Aviso: HOLIDAYS no .env vence o holidays.local.json (é ele que vai para o Worker)."
  elif [[ ! -f "$ROOT/backend/holidays.local.json" ]]; then
    echo "Aviso: sem holidays.local.json; nenhuma férias/folga pessoal será enviada."
  fi
  step "API: enviando .env + férias/folgas como secrets"
  (cd "$ROOT/backend" && npm run cf:secrets)
}

deploy_front() {
  ensure_deps "$ROOT/frontend"
  ensure_login
  if ! (cd "$ROOT/frontend" && npx wrangler pages project list 2>/dev/null) | grep -qw "$PAGES_PROJECT"; then
    step "Front: criando o projeto Pages $PAGES_PROJECT (primeira vez)"
    (cd "$ROOT/frontend" && npx wrangler pages project create "$PAGES_PROJECT" --production-branch main)
  fi
  step "Front: build e publicação do Pages $PAGES_PROJECT"
  (cd "$ROOT/frontend" && npm run deploy)
}

case "${1:-}" in
  api) deploy_api ;;
  secrets) deploy_secrets ;;
  front) deploy_front ;;
  all) deploy_api && deploy_secrets && deploy_front ;;
  -h | --help | help) usage 0 ;;
  *) usage 1 ;;
esac

step "Pronto"
