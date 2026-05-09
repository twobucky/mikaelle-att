# 🤖 Guia de Hospedagem 24H para Discord Bot

## 📋 Opções de Hospedagem

### 🆓 **OPÇÕES GRATUITAS**

### 1. � Render (Grátis para sempre)
- **Preço:** Grátis
- **Recursos:** 750h/mês, 512MB RAM, 0.1 vCPU
- **Vantagens:** Grátis para sempre, fácil configuração
- **Link:** [render.com](https://render.com/)
- **Ideal para:** Bots pequenos/médios

### 2. 🟣 Railway (Grátis com limites)
- **Preço:** Grátis ($5 crédito/mês)
- **Recursos:** 500h/mês, 512MB RAM
- **Vantagens:** Deploy automático, Git integration
- **Link:** [railway.app](https://railway.app/)
- **Ideal para:** Desenvolvimento e bots pequenos

### 3. 🟣 Glitch (Grátis para projetos)
- **Preço:** Grátis
- **Recursos:** 1000h/mês, 400MB RAM, sleep após 5min inativo
- **Vantagens:** Editar código online, instant deploy
- **Link:** [glitch.com](https://glitch.com/)
- **Ideal para:** Testes e bots pequenos

### 4. 🟣 Replit (Grátis com Always On)
- **Preço:** Grátis (+$5/mês para Always On)
- **Recursos:** 750h/mês, 1GB RAM (com Always On)
- **Vantagens:** IDE online, fácil compartilhamento
- **Link:** [replit.com](https://replit.com/)
- **Ideal para:** Desenvolvimento colaborativo

### 5. 🟣 AWS (Grátis por 12 meses)
- **Preço:** Grátis (primeiro ano), depois ~$5/mês
- **Recursos:** 1 vCPU, 1GB RAM, 8GB SSD
- **Vantagens:** Tier gratuito inicial
- **Link:** [aws.amazon.com](https://aws.amazon.com/)
- **Ideal para:** Aprender AWS

---

### 💰 **OPÇÕES PAGAS (Melhor performance)**

### 6. �🟢 DigitalOcean (Recomendado)
- **Preço:** $6/mês (Droplet básico)
- **Recursos:** 1 vCPU, 1GB RAM, 25GB SSD
- **Vantagens:** Fácil configuração, bom suporte
- **Link:** [digitalocean.com](https://www.digitalocean.com/)

### 7. 🟡 Vultr
- **Preço:** $6/mês (Regular Performance)
- **Recursos:** 1 vCPU, 1GB RAM, 25GB SSD
- **Vantagens:** Múltiplas localizações
- **Link:** [vultr.com](https://www.vultr.com/)

### 8. 🟡 Linode
- **Preço:** $5/mês (Nanode 1GB)
- **Recursos:** 1 vCPU, 1GB RAM, 25GB SSD
- **Vantagens:** Interface amigável
- **Link:** [linode.com](https://www.linode.com/)

### 9. 🔵 Hetzner
- **Preço:** €4.90/mês (CX11)
- **Recursos:** 1 vCPU, 4GB RAM, 20GB SSD
- **Vantagens:** Mais RAM pelo preço
- **Link:** [hetzner.com](https://www.hetzner.com/)

## 🚀 Guia de Configuração (DigitalOcean)

### Passo 1: Criar Conta
1. Acesse [digitalocean.com](https://www.digitalocean.com/)
2. Crie uma conta (use email real)
3. Adicione método de pagamento

### Passo 2: Criar Droplet
1. Clique em "Create" → "Droplets"
2. Escolha imagem: **Ubuntu 22.04 LTS**
3. Escolha plano: **Basic** → **Regular** → **$6/mês**
4. Escolha região: **São Paulo** (mais perto)
5. Autenticação: **SSH Key** (recomendado) ou Password
6. Nome: `discord-bot`
7. Clique em "Create Droplet"

### Passo 3: Acessar Servidor
```bash
# SSH para o servidor
ssh root@SEU_IP

# Atualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Verificar instalação
node --version
npm --version
```

### Passo 4: Configurar Bot
```bash
# Criar pasta do bot
mkdir /root/discord-bot
cd /root/discord-bot

# Instalar Git
apt install git -y

# Clonar repositório (se usar Git)
# git clone SEU_REPOSITORIO .

# Ou transferir arquivos manualmente
# Use scp ou FileZilla para enviar os arquivos

# Instalar dependências
npm install

# Criar arquivo .env
nano .env
```

### Passo 5: Configurar .env
```env
DISCORD_TOKEN=SEU_TOKEN_AQUI
CLIENT_ID=SEU_CLIENT_ID
GUILD_ID=SEU_GUILD_ID
PANEL_USER=seu_usuario
PANEL_SECRET=sua_senha
VOICE_CHANNEL_ID=ID_DO_CANAL_DE_VOZ
ADMIN_PANEL_USER_IDS=SEU_ID_DISCORD
```

### Passo 6: Instalar PM2 (Gerenciador de Processos)
```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar bot com PM2
pm2 start bot-24h.js --name "discord-bot"

# Salvar configuração do PM2
pm2 save

# Configurar PM2 para iniciar com o sistema
pm2 startup
```

### Passo 7: Monitorar com PM2
```bash
# Ver status dos processos
pm2 status

# Ver logs do bot
pm2 logs discord-bot

# Reiniciar bot
pm2 restart discord-bot

# Parar bot
pm2 stop discord-bot
```

## 🔧 Scripts Automatizados

### install-bot.sh (Instalação completa)
```bash
#!/bin/bash
echo "🤖 Instalando Discord Bot 24H..."

# Atualizar sistema
apt update && apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs git

# Instalar PM2
npm install -g pm2

# Criar pasta do bot
mkdir /root/discord-bot
cd /root/discord-bot

echo "✅ Instalação concluída!"
echo "📁 Bot instalado em: /root/discord-bot"
echo "🚀 Use 'pm2 start bot-24h.js --name discord-bot' para iniciar"
```

### deploy.sh (Atualização automática)
```bash
#!/bin/bash
echo "🔄 Atualizando Discord Bot..."

cd /root/discord-bot

# Parar bot
pm2 stop discord-bot

# Atualizar código (se usar Git)
# git pull

# Atualizar dependências
npm install

# Reiniciar bot
pm2 start bot-24h.js --name discord-bot

echo "✅ Bot atualizado com sucesso!"
```

## 🐳 Docker (Opcional)

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "bot-24h.js"]
```

### docker-compose.yml
```yaml
version: '3.8'
services:
  discord-bot:
    build: .
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    env_file:
      - .env
```

## 📊 Monitoramento

### Comandos PM2 úteis
```bash
# Status detalhado
pm2 monit

# Logs em tempo real
pm2 logs discord-bot --lines 100

# Reiniciar automaticamente se crashar
pm2 start bot-24h.js --name discord-bot --restart-delay 5000
```

## 🔐 Segurança

### Configurar Firewall
```bash
# Habilitar UFW
ufw enable

# Permitir SSH
ufw allow ssh

# Permitir HTTP/HTTPS (se necessário)
ufw allow 80
ufw allow 443

# Ver status
ufw status
```

### Criar usuário não-root
```bash
# Criar usuário
adduser botuser

# Dar permissões sudo
usermod -aG sudo botuser

# Mudar para usuário
su botuser
```

## 💡 Dicas Importantes

1. **Backup:** Faça backup do .env regularmente
2. **Monitoramento:** Use PM2 para logs e status
3. **Atualizações:** Mantenha Node.js e pacotes atualizados
4. **Segurança:** Não compartilhe seu token do Discord
5. **Performance:** Monitore uso de CPU/RAM

## 🆘 Suporte

- **DigitalOcean:** [docs.digitalocean.com](https://docs.digitalocean.com/)
- **PM2:** [pm2.keymetrics.io](https://pm2.keymetrics.io/)
- **Node.js:** [nodejs.org](https://nodejs.org/)

---

**Pronto! Seu bot agora funcionará 24/7 no servidor!** 🚀
