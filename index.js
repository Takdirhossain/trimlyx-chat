const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const users = {};

function broadcastOnlineUsers() {
  io.emit('online_users', Object.keys(users));
}

io.on('connection', (socket) => {
  socket.on('authenticate', (userId) => {
    if (userId) {
      
      users[userId] = socket.id;
      socket.userId = userId;
      broadcastOnlineUsers();
      socket.emit('authenticated', { success: true });
    }
  });

  socket.on('private_message', async ({ receiver_id, message, sender_id }) => {
    if (!receiver_id || !sender_id || !message) {
      socket.emit('message_error', { reason: 'Invalid data' });
      return;
    }

    const savedMessage = {
      sender_id: sender_id,
      receiver_id: receiver_id,
      message: message.trim()
    };

    const toSocketId = users[receiver_id];
    if (toSocketId) {
      io.to(toSocketId).emit('private_message', savedMessage);
    }

    socket.emit('get-private-message', savedMessage);
     try {
    const response = await axios.post(
      'http://127.0.0.1:8000/api/v1/create-chat',
      savedMessage
    );

    console.log('Message saved:', response.data);
  } catch (error) {
    console.error(
      'Failed to save message:',
      error.response?.data || error.message
    );
  }
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      delete users[socket.userId];
      broadcastOnlineUsers();
    }
   
  });
});

app.get('/', (req, res) => {
  res.send('Trimlyx chat server running');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Socket server running on port ${PORT}`);
});
