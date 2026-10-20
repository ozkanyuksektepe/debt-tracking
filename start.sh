#!/bin/zsh
# Borç Takibi: .NET API'yi (5080) ve Next.js arayüzünü (3000) başlatır, tarayıcıda açar. Kapatmak için Ctrl+C.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Uygulama zaten açıksa ikinci kopyayı başlatma.
for port in 5080 3000; do
  if lsof -nP -iTCP:$port -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port kullanımda: uygulama zaten açık görünüyor. Önce açık olan terminalde Ctrl+C ile kapat."
    exit 1
  fi
done

# Çıkışta (Ctrl+C, terminal kapanması) bu betiğin başlattığı tüm süreçleri kapat.
# dotnet watch TERM'i yok sayabildiği için kademeli kapatılır; en sonda kalan her şey zorla kapanır.
cleanup() {
  trap '' INT TERM HUP
  trap - EXIT
  kill -INT 0 2>/dev/null; sleep 1
  kill -TERM 0 2>/dev/null; sleep 1
  kill -KILL 0 2>/dev/null
}
trap cleanup INT TERM HUP EXIT

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
until curl -s -o /dev/null http://localhost:5080/api/accounts; do
  kill -0 $API_PID 2>/dev/null || { echo "API başlatılamadı."; exit 1; }
  sleep 0.5
done

cd "$ROOT/web"
(sleep 2 && open "http://localhost:3000") &
# Arka planda çalıştırıp bekle: zsh, ön plandaki komut sürerken gelen sinyallerde trap'i çalıştırmaz.
npx next start -p 3000 -H localhost &
wait $!
