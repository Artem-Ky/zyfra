const WebSocket = require('ws');

const args = process.argv.slice(2);
const address = args[0];
const port = args[1];

if (!address || !port) {
  console.error('Необходимо указать адрес и порт для запуска сервера');
  process.exit(1);
}

const server = new WebSocket.Server({ port: parseInt(port) }, () => {
  console.log(`Сервер запущен на ws://${address}:${port}`);
});

server.on('connection', (ws) => {
  console.log('Клиент подключен');

  ws.on('message', (message) => {
    try {
      message = JSON.parse(message);
      switch (message.event) {
        case 'message':
          broadcastMessage(message, ws);
          break;
        case 'connection':
          broadcastMessage(message, ws);
          break;
      }
    } catch (e) {
      console.error('Ошибка при обработке сообщения:', e);
    }
  });

  ws.on('close', () => {
    console.log('Клиент отключился');
  });
});

function broadcastMessage(message, sender) {
  server.clients.forEach((client) => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

process.stdin.on('data', (data) => {
  const serverMessage = {
    event: 'message',
    message: data.toString().trim(),
  };
  broadcastMessage(serverMessage, null);
});

module.exports = server;
