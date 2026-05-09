#!/bin/bash

echo "🔄 Atualizando Discord Bot..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Execute este script como root (use sudo)${NC}"
  exit 1
fi

# Mudar para pasta do bot
cd /root/discord-bot

# Backup do .env
echo -e "${YELLOW}💾 Fazendo backup do .env...${NC}"
if [ -f .env ]; then
  cp .env .env.backup
fi

# Parar bot
echo -e "${YELLOW}⏹️ Parando bot...${NC}"
pm2 stop discord-bot

# Atualizar código (se usar Git)
if [ -d .git ]; then
  echo -e "${YELLOW}📥 Atualizando código...${NC}"
  git pull
else
  echo -e "${YELLOW}⚠️ Repositório Git não encontrado. Pulei atualização do código.${NC}"
fi

# Atualizar dependências
echo -e "${YELLOW}📦 Atualizando dependências...${NC}"
npm install

# Reiniciar bot
echo -e "${YELLOW}🚀 Reiniciando bot...${NC}"
pm2 start bot-24h.js --name discord-bot

# Salvar configuração PM2
echo -e "${YELLOW}💾 Salvando configuração PM2...${NC}"
pm2 save

# Mostrar status
echo -e "${GREEN}✅ Bot atualizado com sucesso!${NC}"
pm2 status discord-bot

echo -e "${GREEN}📊 Logs do bot:${NC}"
echo "pm2 logs discord-bot --lines 50"
