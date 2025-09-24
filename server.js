const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// In-memory rooms and messages
// Structure: rooms = { roomName: [messageObj, ...] }
const rooms = {};

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  console.log("A user connected");

  // Send existing room list to new client
  socket.emit("room list", Object.keys(rooms));

  // User joins a room
  socket.on("join room", (roomName, username) => {
    socket.username = username || "Anonymous";
    socket.room = roomName;

    // Create room if it doesn't exist
    if (!rooms[roomName]) rooms[roomName] = [];

    socket.join(roomName);

    // Send existing messages for this room
    socket.emit("chat history", rooms[roomName]);

    // Notify room about new user
    io.to(roomName).emit("user joined", socket.username);

    // Update room list for all clients
    io.emit("room list", Object.keys(rooms));
  });

  // Chat messages
  socket.on("chat message", (msg) => {
    const roomName = socket.room;
    if (!roomName) return;

    const messageData = { user: socket.username, text: msg, timestamp: new Date() };
    rooms[roomName].push(messageData);

    io.to(roomName).emit("chat message", messageData);
  });

  // File upload
  socket.on("file upload", (data) => {
    const roomName = socket.room;
    if (!roomName) return;

    const fileMessage = { user: socket.username, ...data, timestamp: new Date() };
    rooms[roomName].push(fileMessage);

    io.to(roomName).emit("file upload", fileMessage);
  });

  // Typing indicators
  socket.on("typing", (user) => socket.to(socket.room).emit("typing", user));
  socket.on("stop typing", (user) => socket.to(socket.room).emit("stop typing", user));

  // Disconnect
  socket.on("disconnect", () => {
    if (socket.room && socket.username) {
      io.to(socket.room).emit("user left", socket.username);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
