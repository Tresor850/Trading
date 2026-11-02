#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "   Tradng_bot - Démarrage Full-Stack (FastAPI + Vite)    "
echo "=========================================================="

# 1. Démarrage du microservice Python SMC en arrière-plan
echo "🚀 [1/2] Lancement du moteur Python SMC (Port 8005)..."
python3 smc_engine/api_server.py &
SMC_PID=$!

# Fonction de nettoyage lors de l'arrêt (Ctrl+C)
cleanup() {
  echo ""
  echo "Arrêt des services Tradng_bot..."
  kill $SMC_PID 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Attente de la disponibilité du serveur SMC
sleep 1

# 2. Démarrage du serveur Vite
echo "💻 [2/2] Lancement de l'interface Vite (Port 3000)..."
npm run dev

