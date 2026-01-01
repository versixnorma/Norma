#!/bin/bash
# scripts/check-server-and-run-e2e.sh
# Verifica se o servidor Next.js está rodando e executa os testes E2E

set -e

WEB_DIR="$(dirname "$0")/../apps/web"
PORT=3000
LOGIN_URL="http://localhost:$PORT/login"

# Função para checar se a porta está aberta

# Função para checar se a rota /login está acessível (HTTP 200)
is_login_route_ok() {
  curl -s -o /dev/null -w "%{http_code}" "$LOGIN_URL" | grep -q "200"
}

cd "$WEB_DIR"

# Tenta acessar a rota /login até obter HTTP 200 ou atingir o timeout
echo "Verificando disponibilidade da rota /login..."
for i in {1..30}; do
  if is_login_route_ok; then
    echo "/login acessível. Executando testes E2E..."
    pnpm test:e2e
    TEST_EXIT_CODE=$?
    exit $TEST_EXIT_CODE
  fi
  echo "Aguardando rota /login ficar disponível ($i)..."
  sleep 2
done

echo "Erro: Rota /login não está acessível (esperado HTTP 200) após timeout."
exit 2
