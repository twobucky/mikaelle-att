#!/bin/bash

echo "🤖 Instalando Discord Bot 24H..."

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

# Atualizar sistema
echo -e "${YELLOW}📦 Atualizando sistema...${NC}"
apt update && apt upgrade -y

# Instalar Node.js 18
echo -e "${YELLOW}📦 Instalando Node.js 18...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs git

# Instalar PM2
echo -e "${YELLOW}📦 Instalando PM2...${NC}"
npm install -g pm2

# Criar pasta do bot
echo -e "${YELLOW}📁 Criando pasta do bot...${NC}"
mkdir -p /root/discord-bot
cd /root/discord-bot

# Criar estrutura de pastas
echo -e "${YELLOW}📁 Criando estrutura de pastas...${NC}"
mkdir -p data logs scripts

# Definir permissões
chmod +x scripts/*.sh

echo -e "${GREEN}✅ Instalação concluída!${NC}"
echo -e "${GREEN}📁 Bot instalado em: /root/discord-bot${NC}"
echo -e "${GREEN}🚀 Próximos passos:${NC}"
echo -e "${YELLOW}1. Copie os arquivos do bot para /root/discord-bot${NC}"
echo -e "${YELLOW}2. Configure o arquivo .env${NC}"
echo -e "${YELLOW}3. Execute: pm2 start bot-24h.js --name discord-bot${NC}"
echo -e "${YELLOW}4. Execute: pm2 save${NC}"
echo -e "${YELLOW}5. Execute: pm2 startup${NC}"
