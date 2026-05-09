import {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
} from '@discordjs/voice';

/** Garante que o @discordjs/voice carrega encriptação (evita libsodium-wrappers partido no Windows). */
import '@stablelib/xchacha20poly1305';

let reconnectTimer = null;
let activeChannelId = null;

function scheduleReconnect(client, channelId) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectStayVoice(client, channelId);
  }, 5000);
}

/**
 * Entra no canal de voz e tenta manter a ligação (reconecta se cair).
 * O bot fica **surdo** (selfDeaf) para não processar áudio.
 */
export function connectStayVoice(client, channelId) {
  activeChannelId = channelId;

  (async () => {
    try {
      const ch = await client.channels.fetch(channelId);
      if (!ch?.isVoiceBased()) {
        return;
      }

      const guild = ch.guild;
      const prev = getVoiceConnection(guild.id);
      if (prev) prev.destroy();

      const connection = joinVoiceChannel({
        channelId: ch.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false,
      });

      connection.on('error', (err) => {
        // Sem logs para não encher cache do Render
      });

      connection.on('stateChange', (oldState, newState) => {
        if (
          newState.status === VoiceConnectionStatus.Disconnected &&
          activeChannelId === channelId
        ) {
          try {
            connection.destroy();
          } catch {
            /* ignore */
          }
          scheduleReconnect(client, channelId);
        }
      });
    } catch (e) {
      if (activeChannelId === channelId) scheduleReconnect(client, channelId);
    }
  })();
}
