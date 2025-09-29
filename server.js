// server.js
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

// rooms structure:
// {
//   roomName: {
//     password: "pass",
//     users: [ { username, socketId } ]
//   }
// }
const rooms = {};

io.on("connection", socket => {
  // Send current room list to newcomer
  socket.emit("room list", Object.keys(rooms));

  // Create room
  socket.on("create room", (roomName, password, username) => {
    if (!roomName || !password || !username) return;
    if (!rooms[roomName]) {
      rooms[roomName] = { password, users: [] };
    }
    // Save user's room on socket
    socket.currentRoom = roomName;
    rooms[roomName].users.push({ username, socketId: socket.id });
    socket.join(roomName);

    // Notify creator
    socket.emit("room joined", roomName);

    // Notify others in room
    socket.to(roomName).emit("chat message", {
      user: "System",
      text: `${username} has joined the chat`
    });

    // Broadcast updated room list
    io.emit("room list", Object.keys(rooms));
  });

  // Join room (with password)
  socket.on("join room request", (roomName, password, username) => {
    if (!roomName || !username) return;
    const room = rooms[roomName];
    if (!room) {
      socket.emit("no such room");
      return;
    }
    if (room.password !== password) {
      socket.emit("wrong password");
      return;
    }

    socket.currentRoom = roomName;
    room.users.push({ username, socketId: socket.id });
    socket.join(roomName);

    socket.emit("room joined", roomName);

    socket.to(roomName).emit("chat message", {
      user: "System",
      text: `${username} has joined the chat`
    });
  });

  // Chat message
  socket.on("chat message", msg => {
    const roomName = socket.currentRoom;
    if (!roomName) return;
    // find username for this socket
    const r = rooms[roomName];
    const userObj = r ? r.users.find(u => u.socketId === socket.id) : null;
    const username = userObj ? userObj.username : "Unknown";

    io.to(roomName).emit("chat message", { user: username, text: msg });
  });

  // File upload
  socket.on("file upload", data => {
    const roomName = socket.currentRoom;
    if (!roomName || !data) return;
    const r = rooms[roomName];
    const userObj = r ? r.users.find(u => u.socketId === socket.id) : null;
    const username = userObj ? userObj.username : "Unknown";

    io.to(roomName).emit("file message", { user: username, ...data });
  });

  // Typing indicators
  socket.on("typing", username => {
    const roomName = socket.currentRoom;
    if (!roomName) return;
    socket.to(roomName).emit("typing", username);
  });
  socket.on("stop typing", username => {
    const roomName = socket.currentRoom;
    if (!roomName) return;
    socket.to(roomName).emit("stop typing", username);
  });

  // Disconnect - remove user from rooms; if room empty, remove it
  socket.on("disconnect", () => {
    for (const rName of Object.keys(rooms)) {
      const room = rooms[rName];
      const before = room.users.length;
      room.users = room.users.filter(u => u.socketId !== socket.id);
      const after = room.users.length;
      if (before !== after) {
        // someone removed, notify remaining users
        io.to(rName).emit("chat message", {
          user: "System",
          text: `A user has left the chat`
        });
      }
      if (room.users.length === 0) {
        delete rooms[rName];
        io.emit("room list", Object.keys(rooms));
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on ${PORT}`));
