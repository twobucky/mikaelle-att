import http from 'http';

// Servidor HTTP simples só para o Render não dar erro de porta
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Discord Bot is running');
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  // Sem log para não encher cache do Render
});

export default server;
