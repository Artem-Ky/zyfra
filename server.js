const { Client } = require('pg');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');


//  PostgreSQL connection
const dbClient = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'websockets',
  password: '0000',
  port: 5432,
});

(async () => {
  try {
    await dbClient.connect();
    console.log('Подключение к PostgreSQL успешно установлено');

    await dbClient.query('LISTEN notifications_channel');
    console.log('Подписка на notifications_channel выполнена');
  } catch (err) {
    console.error('Ошибка подключения к PostgreSQL:', err);
  }
})();

const args = process.argv.slice(2);
const address = args[0];
const port = args[1];

if (!address || !port) {
  console.error('Необходимо указать адрес и порт для запуска сервера');
  process.exit(1);
}

const app = express();
const serverHTTP = http.createServer(app);
const server = new WebSocket.Server({ server: serverHTTP });

// Swagger
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'WebSocket Server API',
      version: '1.0.0',
      description: 'API swagger',
    },
    servers: [
      {
        url: `http://${address}:${port}`,
      },
    ],
  },
  apis: ['./server.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

//  WebSocket
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

//  рассылка сообщений
function broadcastMessage(message, sender) {
  server.clients.forEach((client) => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

app.use(express.json());


/**
 * @swagger
 * /add-notification:
 *   post:
 *     summary: Разослать уведомление
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Уведомление!
 *     responses:
 *       200:
 *         description: Уведомление успешно разослано!
 */
app.post('/add-notification', async (req, res) => {
  const { message } = req.body;

  try {
    const result = await dbClient.query(
      'INSERT INTO notifications (message, send_at) VALUES ($1, NOW()) RETURNING *',
      [message]
    );

    res.json({ status: 'Уведомление добавлено', notification: result.rows[0] });
  } catch (err) {
    console.error('Ошибка добавления уведомления:', err.message);
    res.status(500).json({ error: 'Ошибка добавления уведомления' });
  }
});


dbClient.on('notification', (msg) => {
  try {
    const payload = JSON.parse(msg.payload);
    console.log('Получено уведомление из базы:', payload);

    const serverMessage = {
      event: 'message',
      message: payload.message.toString().trim(),
    };
    broadcastMessage(serverMessage, null);
  } catch (err) {
    console.error('Ошибка обработки уведомления:', err);
  }
});


//  Ввод сообщения через консоль
process.stdin.on('data', (data) => {
  const serverMessage = {
    event: 'message',
    message: data.toString().trim(),
  };
  broadcastMessage(serverMessage, null);
});

serverHTTP.listen(port, address, () => {
  console.log(`HTTP сервер запущен на http://${address}:${port}`);
  console.log(`WebSocket сервер запущен на ws://${address}:${port}`);
  console.log(`Swagger документация доступна на http://${address}:${port}/api-docs`);
});

module.exports = server;
