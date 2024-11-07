const WebSocket = require('ws');
const { createServer } = require('http');

let httpServer, wsServer, serverUrl;

beforeAll((done) => {
  httpServer = createServer();
  wsServer = new WebSocket.Server({ server: httpServer });

  httpServer.listen(() => {
    const { port } = httpServer.address();
    serverUrl = `ws://localhost:${port}`;
    done();
  });
}, 15000);

afterAll((done) => {
  wsServer.close(() => {
    httpServer.close(done);
  });
}, 15000);

describe('WebSocket Server to Client Tests', () => {

  // сервер шлет сообщение на клиент, а клиент его получает и читает
  test('Server should send a message to a connected client', (done) => {
    const client = new WebSocket(serverUrl);

    client.on('open', () => {
      console.log('Client connected, sending message from server');
      setTimeout(() => {
        wsServer.clients.forEach((ws) => {
          ws.send('Message from server');
        });
      }, 500);
    });

    client.on('message', (message) => {
      const messageStr = message.toString();
      console.log('Client received message:', messageStr);
      expect(messageStr).toBe('Message from server');
      client.close();
      done();
    });

    client.on('error', (err) => {
      console.error('Client error:', err);
      client.close();
      done.fail(err);
    });
  }, 15000);

  //  сервер шлет сообщение сразу на всех клиентов, а они его получают и читают
  test('Server should broadcast a message to multiple clients', (done) => {
    const client1 = new WebSocket(serverUrl);
    const client2 = new WebSocket(serverUrl);
    let messageCount = 0;

    const checkDone = () => {
      messageCount++;
      if (messageCount === 2) {
        client1.close();
        client2.close();
        done();
      }
    };

    client1.on('open', () => {
      console.log('Client 1 connected');
    });

    client2.on('open', () => {
      console.log('Client 2 connected');
      setTimeout(() => {
        console.log('Broadcasting message from server to all clients');
        wsServer.clients.forEach((ws) => {
          ws.send('Broadcast from server');
        });
      }, 500);
    });

    client1.on('message', (message) => {
      const messageStr = message.toString();
      console.log('Client 1 received message:', messageStr);
      expect(messageStr).toBe('Broadcast from server');
      checkDone();
    });

    client2.on('message', (message) => {
      const messageStr = message.toString();
      console.log('Client 2 received message:', messageStr);
      expect(messageStr).toBe('Broadcast from server');
      checkDone();
    });

    client1.on('error', (err) => {
      console.error('Client 1 error:', err);
      client1.close();
      done.fail(err);
    });

    client2.on('error', (err) => {
      console.error('Client 2 error:', err);
      client2.close();
      done.fail(err);
    });
  }, 15000);

  //  сервер шлет несколько сообщений подряд на клиента, а он получает и читает их
  test('Server should send multiple messages sequentially to a client', (done) => {
    const client = new WebSocket(serverUrl);
    const messagesToSend = ['First message from server', 'Second message from server'];
    let receivedMessages = 0;

    client.on('open', () => {
      console.log('Client connected, starting to send multiple messages from server');
      setTimeout(() => {
        messagesToSend.forEach((message, index) => {
          setTimeout(() => {
            wsServer.clients.forEach((ws) => {
              ws.send(message);
            });
          }, index * 500);
        });
      }, 500);
    });

    client.on('message', (message) => {
      const messageStr = message.toString();
      console.log(`Client received message ${receivedMessages + 1}:`, messageStr);
      expect(messageStr).toBe(messagesToSend[receivedMessages]);
      receivedMessages++;

      if (receivedMessages === messagesToSend.length) {
        client.close();
        done();
      }
    });

    client.on('error', (err) => {
      console.error('Client error:', err);
      client.close();
      done.fail(err);
    });
  }, 20000);
});
