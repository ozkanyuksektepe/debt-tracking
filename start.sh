#!/bin/zsh
# Borç Takibi: .NET API'yi (5080) ve Next.js arayüzünü (3000) başlatır, tarayıcıda açar. Kapatmak için Ctrl+C.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Arayüz: bağımlılıklar yoksa kur, kod son derlemeden sonra değiştiyse yeniden derle.
cd "$ROOT/web"
[ -d node_modules ] || npm install
if [ ! -f .next/BUILD_ID ] || [ -n "$(find src public -newer .next/BUILD_ID | head -1)" ]; then
  npm run build
fi

# API: derle, başlat ve hazır olmasını bekle.
cd "$ROOT/src/DebtTracker"
dotnet build -c Release -v quiet -nologo
dotnet run -c Release --no-build &
API_PID=$!
trap 'kill $API_PID 2>/dev/null' EXIT INT TERM
until curl -s -o /dev/null http://localhost:5080/api/accounts; do
  kill -0 $API_PID 2>/dev/null || { echo "API başlatılamadı."; exit 1; }
  sleep 0.5
done

cd "$ROOT/web"
(sleep 2 && open "http://localhost:3000") &
npx next start -p 3000 -H localhost
