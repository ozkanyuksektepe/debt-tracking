#!/bin/zsh
# Geliştirme modu: arayüz kodu değiştikçe sayfa anında yenilenir. Kapatmak için Ctrl+C.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT/web"
[ -d node_modules ] || npm install

# API: kod değişince kendini yeniden başlatır (dotnet watch).
cd "$ROOT/src/DebtTracker"
dotnet watch run --non-interactive &
API_PID=$!
trap 'kill $API_PID 2>/dev/null' EXIT INT TERM
until curl -s -o /dev/null http://localhost:5080/api/accounts; do
  kill -0 $API_PID 2>/dev/null || { echo "API başlatılamadı."; exit 1; }
  sleep 0.5
done

cd "$ROOT/web"
(sleep 3 && open "http://localhost:3000") &
npx next dev -p 3000 -H localhost
