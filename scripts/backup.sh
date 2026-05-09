#!/bin/bash

echo "💾 Fazendo backup do Discord Bot..."

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

# Configurações
BACKUP_DIR="/root/backups/discord-bot"
DATE=$(date +%Y%m%d_%H%M%S)
BOT_DIR="/root/discord-bot"

# Criar diretório de backup
mkdir -p "$BACKUP_DIR"

# Nome do arquivo de backup
BACKUP_FILE="discord-bot-backup-$DATE.tar.gz"

echo -e "${YELLOW}📦 Criando backup...${NC}"

# Criar backup compactado
tar -czf "$BACKUP_DIR/$BACKUP_FILE" \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=logs \
  --exclude=data/bot-health.json \
  -C "$BOT_DIR" .

# Verificar se backup foi criado
if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
  echo -e "${GREEN}✅ Backup criado: $BACKUP_DIR/$BACKUP_FILE${NC}"
  
  # Mostrar tamanho do backup
  SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
  echo -e "${GREEN}📊 Tamanho: $SIZE${NC}"
  
  # Manter apenas os últimos 7 backups
  echo -e "${YELLOW}🧹 Limpando backups antigos...${NC}"
  cd "$BACKUP_DIR"
  ls -t discord-bot-backup-*.tar.gz | tail -n +8 | xargs -r rm
  
  # Listar backups disponíveis
  echo -e "${GREEN}📋 Backups disponíveis:${NC}"
  ls -lh discord-bot-backup-*.tar.gz
else
  echo -e "${RED}❌ Falha ao criar backup${NC}"
  exit 1
fi
