const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users
const connectedUsers = new Map();

// Handle socket connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle user joining
  socket.on('user-joined', (username) => {
    // Store user info
    connectedUsers.set(socket.id, {
      id: socket.id,
      username: username,
      joinedAt: new Date()
    });

    // Notify all users about new user
    socket.broadcast.emit('user-connected', {
      username: username,
      message: `${username} joined the chat`,
      timestamp: new Date()
    });

    // Send current online users to the new user
    const onlineUsers = Array.from(connectedUsers.values()).map(user => user.username);
    socket.emit('online-users', onlineUsers);

    // Send online users count to all users
    io.emit('users-count', connectedUsers.size);

    console.log(`${username} joined the chat`);
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      const messageData = {
        username: user.username,
        message: data.message,
        timestamp: new Date(),
        userId: socket.id
      };

      // Broadcast message to all users including sender
      io.emit('chat-message', messageData);
      console.log(`${user.username}: ${data.message}`);
    }
  });

  // Handle file sharing
  socket.on('file-share', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      const fileData = {
        username: user.username,
        file: data,
        timestamp: new Date(),
        userId: socket.id
      };

      // Broadcast file to all users including sender
      io.emit('file-share', fileData);
      console.log(`${user.username} shared a file: ${data.name}`);
    }
  });

  // Handle image sharing
  socket.on('image-share', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      const imageData = {
        username: user.username,
        image: data,
        timestamp: new Date(),
        userId: socket.id
      };

      // Broadcast image to all users including sender
      io.emit('image-share', imageData);
      console.log(`${user.username} shared an image: ${data.name}`);
    }
  });

  // Handle voice call events
  socket.on('voice-call-start', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.broadcast.emit('voice-call-notification', {
        username: user.username,
        action: 'start'
      });
      console.log(`${user.username} started a voice call`);
    }
  });

  socket.on('voice-call-end', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.broadcast.emit('voice-call-notification', {
        username: user.username,
        action: 'end'
      });
      console.log(`${user.username} ended a voice call`);
    }
  });

  socket.on('voice-call-mute', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.broadcast.emit('voice-call-mute', {
        username: user.username,
        isMuted: data.isMuted
      });
    }
  });

  // Handle user typing
  socket.on('typing', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.broadcast.emit('user-typing', {
        username: user.username,
        isTyping: data.isTyping
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      // Remove user from connected users
      connectedUsers.delete(socket.id);

      // Notify all users about user leaving
      socket.broadcast.emit('user-disconnected', {
        username: user.username,
        message: `${user.username} left the chat`,
        timestamp: new Date()
      });

      // Send updated online users count
      io.emit('users-count', connectedUsers.size);

      console.log(`${user.username} left the chat`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Chat server running on http://localhost:${PORT}`);
});