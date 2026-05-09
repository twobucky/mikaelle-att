# 🆓 Guia de Hospedagem GRATUITA para Discord Bot

## 🏆 **Melhores Opções Gratuitas**

### 1. 🟣 **Render (Recomendado)**
- **Preço:** 100% GRÁTIS
- **Recursos:** 750h/mês, 512MB RAM, 0.1 vCPU
- **Vantagens:** 
  - ✅ Grátis para sempre
  - ✅ Não dorme (always on)
  - ✅ Fácil configuração
  - ✅ Suporte a Node.js
- **Link:** [render.com](https://render.com/)

### 2. 🟣 **Railway**
- **Preço:** $5 crédito/mês (suficiente para bot)
- **Recursos:** 500h/mês, 512MB RAM
- **Vantagens:**
  - ✅ Deploy automático
  - ✅ Integração com Git
  - ✅ Interface moderna
- **Link:** [railway.app](https://railway.app/)

### 3. 🟣 **Glitch**
- **Preço:** 100% GRÁTIS
- **Recursos:** 1000h/mês, 400MB RAM
- **Atenção:** Dorme após 5 minutos inativo
- **Vantagens:**
  - ✅ Editar código online
  - ✅ Deploy instantâneo
  - ✅ Colaboração fácil
- **Link:** [glitch.com](https://glitch.com/)

### 4. 🟣 **Replit**
- **Preço:** Grátis (+$5/mês para Always On)
- **Recursos:** 750h/mês, 1GB RAM
- **Vantagens:**
  - ✅ IDE online completa
  - ✅ Fácil compartilhamento
  - ✅ Bom para desenvolvimento
- **Link:** [replit.com](https://replit.com/)

---

## 🚀 **Guia Rápido - Render (Grátis)**

### Passo 1: Criar Conta
1. Acesse [render.com](https://render.com/)
2. Clique em "Sign Up"
3. Use GitHub/Google ou email

### Passo 2: Criar Novo Serviço
1. Dashboard → "New +" → "Web Service"
2. Conecte seu GitHub (ou faça upload)
3. Configure:
   - **Name:** `discord-bot`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node bot-24h.js`

### Passo 3: Variáveis de Ambiente
1. Em "Environment", adicione:
   ```
   DISCORD_TOKEN=SEU_TOKEN_AQUI
   CLIENT_ID=SEU_CLIENT_ID
   GUILD_ID=SEU_GUILD_ID
   PANEL_USER=seu_usuario
   PANEL_SECRET=sua_senha
   VOICE_CHANNEL_ID=ID_DO_CANAL_DE_VOZ
   ADMIN_PANEL_USER_IDS=SEU_ID_DISCORD
   ```

### Passo 4: Deploy
1. Clique em "Create Web Service"
2. Aguarde o deploy (2-3 minutos)
3. Pronto! Bot online 24h grátis

---

## 🚀 **Guia Rápido - Railway**

### Passo 1: Criar Conta
1. Acesse [railway.app](https://railway.app/)
2. Clique em "Sign Up"
3. Use GitHub para facilitar

### Passo 2: Novo Projeto
1. Dashboard → "New Project"
2. "Deploy from GitHub repo" ou "Blank"
3. Se blank, faça upload dos arquivos

### Passo 3: Configurar
1. Em "Variables", adicione as variáveis de ambiente
2. Configure o "Start Command": `node bot-24h.js`
3. Clique em "Deploy"

---

## 🚀 **Guia Rápido - Glitch**

### Passo 1: Criar Projeto
1. Acesse [glitch.com](https://glitch.com/)
2. Clique em "New Project" → "hello-express"
3. Apague os arquivos padrão

### Passo 2: Upload dos Arquivos
1. Arraste todos os arquivos do bot
2. Edite o `package.json` se necessário
3. Adicione `.env` com as variáveis

### Passo 3: Configurar Start
1. No `package.json`, adicione:
   ```json
   "scripts": {
     "start": "node bot-24h.js"
   }
   ```

### Passo 4: Deploy
1. Glitch faz deploy automático
2. Bot fica online em link único
3. **Atenção:** Dorme após 5min inativo

---

## 📊 **Comparativo das Opções Gratuitas**

| Serviço | Preço | RAM | CPU | Dorme? | Ideal Para |
|----------|--------|-----|-----|---------|----------|
| **Render** | Grátis | 512MB | 0.1 vCPU | ❌ Não | ✅ Bot 24h |
| **Railway** | $5 crédito | 512MB | - | ❌ Não | ✅ Bot médio |
| **Glitch** | Grátis | 400MB | - | ✅ Sim | ⚠️ Testes |
| **Replit** | Grátis | 1GB | - | ⚠️ Com Always On | ✅ Dev |

---

## 💡 **Dicas Importantes**

### 🔐 **Segurança**
- **NUNCA** compartilhe seu `DISCORD_TOKEN`
- Use `.env` para variáveis sensíveis
- Ative 2FA nas contas

### ⚡ **Performance**
- Render é melhor para bots 24h
- Monitore uso de RAM
- Otimize código para baixo consumo

### 🔄 **Manutenção**
- Atualize código regularmente
- Monitore logs de erros
- Faça backup do `.env`

---

## 🎯 **Recomendação Final**

**Para bot 24h grátis:**
1. 🥇 **Render** - Melhor opção gratuita
2. 🥈 **Railway** - Bom com $5 crédito
3. 🥉 **Glitch** - Ótimo para testes

**Para começar:**
- Use **Render** (grátis para sempre)
- Siga o guia passo a passo
- Em 10 minutos seu bot está online 24h!

---

**Pronto! Seu bot funcionará 24h sem custar nada!** 🚀✨
