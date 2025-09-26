const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const rooms = {}; // { roomName: { password, users: [] } }

io.on("connection", socket => {

  // Create Room
  socket.on("create room", (roomName,password,username)=>{
    if(!rooms[roomName]) rooms[roomName]={password,users:[]};
    socket.join(roomName);
    rooms[roomName].users.push(username);
    socket.emit("room joined", roomName);
    socket.to(roomName).emit("chat message", `${username} has joined the chat`);
    io.emit("room list", Object.keys(rooms));
  });

  // Join Room
  socket.on("join room request", (roomName,password,username)=>{
    if(!rooms[roomName]) return socket.emit("error","Room does not exist");
    if(rooms[roomName].password !== password) return socket.emit("wrong password");
    socket.join(roomName);
    rooms[roomName].users.push(username);
    socket.emit("room joined", roomName);
    socket.to(roomName).emit("chat message", `${username} has joined the chat`);
  });

  // Chat messages
  socket.on("chat message", msg=>{
    const roomsJoined = Array.from(socket.rooms).filter(r=>r!==socket.id);
    roomsJoined.forEach(r=>socket.to(r).emit("chat message",{user:"Unknown",text:msg}));
  });

  // File sharing
  socket.on("file upload", data=>{
    const roomsJoined = Array.from(socket.rooms).filter(r=>r!==socket.id);
    roomsJoined.forEach(r=>socket.to(r).emit("file message",{user:"Unknown",...data}));
  });

  // Typing
  socket.on("typing", user=>{
    const roomsJoined = Array.from(socket.rooms).filter(r=>r!==socket.id);
    roomsJoined.forEach(r=>socket.to(r).emit("typing", user));
  });
  socket.on("stop typing", user=>{
    const roomsJoined = Array.from(socket.rooms).filter(r=>r!==socket.id);
    roomsJoined.forEach(r=>socket.to(r).emit("stop typing", user));
  });

});

http.listen(3000, ()=>console.log("Server running on port 3000"));
