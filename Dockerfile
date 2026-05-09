# Use Node.js 18 Alpine para menor tamanho
FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de package
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Copiar código fonte
COPY . .

# Criar diretórios necessários
RUN mkdir -p data logs

# Definir permissões
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Mudar para usuário não-root
USER nodejs

# Expor porta (se necessário para health checks)
EXPOSE 3000

# Comando para iniciar o bot
CMD ["node", "bot-24h.js"]
