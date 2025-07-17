const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = 3000;
const chatHistoryFile = path.join(__dirname, 'chat-history.json');

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

function readChatHistory() {
    try {
        const data = fs.readFileSync(chatHistoryFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

function writeChatHistory(history) {
    fs.writeFileSync(chatHistoryFile, JSON.stringify(history, null, 2));
}

let onlineUsers = {};

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('user-joined', (username) => {
    onlineUsers[socket.id] = username;
    socket.username = username;
    io.emit('online-users', Object.values(onlineUsers));
    io.emit('users-count', Object.keys(onlineUsers).length);
    socket.broadcast.emit('user-connected', { message: `${username} has joined the chat.` });
    socket.emit('chat history', readChatHistory());
  });

  socket.on('chat-message', (data) => {
    const history = readChatHistory();
    const messageData = { 
        username: socket.username, 
        message: data.message, 
        timestamp: new Date(),
        userId: socket.id
    };
    history.push(messageData);
    writeChatHistory(history);
    io.emit('chat-message', messageData);
  });

  socket.on('typing', (data) => {
    socket.broadcast.emit('user-typing', { username: socket.username, isTyping: data.isTyping });
  });

  socket.on('voice-call-start', () => {
    socket.broadcast.emit('voice-call-notification', { username: socket.username, action: 'start' });
  });

  socket.on('voice-call-end', () => {
    socket.broadcast.emit('voice-call-notification', { username: socket.username, action: 'end' });
  });

  socket.on('voice-call-mute', (data) => {
    socket.broadcast.emit('voice-call-mute', { username: socket.username, isMuted: data.isMuted });
  });

  socket.on('disconnect', () => {
    if (onlineUsers[socket.id]) {
      const username = onlineUsers[socket.id];
      delete onlineUsers[socket.id];
      io.emit('online-users', Object.values(onlineUsers));
      io.emit('users-count', Object.keys(onlineUsers).length);
      io.emit('user-disconnected', { message: `${username} has left the chat.` });
    }
    console.log('user disconnected');
  });
});

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});