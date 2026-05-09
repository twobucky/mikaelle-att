#!/bin/sh

# Esperar um pouco para garantir que as variáveis de ambiente estejam disponíveis
sleep 2

# Registrar comandos no Discord
echo "🔧 Registrando comandos no Discord..."
if [ -n "$DISCORD_TOKEN" ]; then
    node deploy-commands.js
    echo "✅ Comandos registrados com sucesso!"
else
    echo "❌ DISCORD_TOKEN não encontrado, pulando registro de comandos"
fi

# Iniciar o bot
echo "🤖 Iniciando o bot..."
exec node bot-24h.js
