const WebSocket = require('ws');

const args = process.argv.slice(2);
const serverAddress = args[0];

if (!serverAddress) {
  console.error('Необходимо указать адрес сервера для подключения');
  process.exit(1);
}
const client = new WebSocket(serverAddress);

client.on('open', () => {
  console.log('Подключен к серверу');
  const connectionMessage = {
    event: 'connection',
    message: 'Новый клиент подключился',
  };
  client.send(JSON.stringify(connectionMessage));
});

client.on('message', (message) => {
  try {
    const parsedMessage = JSON.parse(message);
    if (parsedMessage.event === 'message' || parsedMessage.event === 'connection') {
      console.log(`Новое сообщение: ${parsedMessage.message}`);
    }
  } catch (e) {
    console.error('Ошибка при обработке входящего сообщения:', e);
  }
});

client.on('error', (error) => {
  console.error(`Ошибка соединения: ${error.message}`);
});


process.stdin.on('data', (data) => {
  const userMessage = {
    event: 'message',
    message: data.toString().trim(),
  };
  client.send(JSON.stringify(userMessage));
});
