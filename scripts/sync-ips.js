import { syncIPsFromFolder } from '../src/lib/ipBlacklist.js';

console.log('🔄 Sincronizando IPs da pasta data/ips...');
const result = syncIPsFromFolder();

if (result.synced > 0) {
  console.log(`✅ Processados ${result.synced} arquivos`);
  console.log(`📊 Encontrados ${result.created} IPs`);
  console.log(`🚫 ${result.blacklisted} adicionados à blacklist`);
} else {
  console.log('ℹ️ Nenhum arquivo de IP encontrado para sincronizar');
}

console.log('🎯 Sincronização concluída!');
