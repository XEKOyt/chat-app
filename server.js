const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let users = {}; // socket.id → { username, profilePic, status }

// Listen for new connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle initial username/profile/status setup
  socket.on('set username', (data) => {
    users[socket.id] = {
      username: data.username,
      profilePic: data.profilePic,
      status: data.status || 'Online'
    };
    console.log(`${data.username} connected with status: ${data.status}`);

    // Notify everyone else
    socket.broadcast.emit('user joined', users[socket.id]);

    // Send full updated list to all clients
    io.emit('update users', Object.values(users));
  });

  // Handle incoming chat messages
  socket.on('chat message', (data) => {
    const { username, profilePic, text, timestamp } = data;

    // Broadcast message to all clients
    io.emit('chat message', {
      username,
      profilePic,
      text,
      timestamp,
      status: users[socket.id]?.status || 'Online'
    });
  });

  // Handle clean disconnect
  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      console.log(`${user.username} disconnected`);

      // Notify everyone
      socket.broadcast.emit('user left', user);

      // Remove and send updated list
      delete users[socket.id];
      io.emit('update users', Object.values(users));
    }
  });

  // (Optional) handle profile updates
  socket.on('profile update', (data) => {
    const old = users[socket.id];
    if (old) {
      users[socket.id] = {
        username: data.username,
        profilePic: data.profilePic,
        status: data.status
      };
      // Broadcast to others
      io.emit('update users', Object.values(users));
      io.emit('user updated', { oldUsername: old.username, ...users[socket.id] });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
