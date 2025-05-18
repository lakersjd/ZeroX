const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const PORT = process.env.PORT || 3000;
app.use(express.static("public"));

// TEXT CHAT
let waiting = null;
io.on("connection", (socket) => {
  if (waiting) {
    socket.partner = waiting;
    waiting.partner = socket;
    waiting = null;
    socket.emit("message", "Connected to a stranger.");
    socket.partner.emit("message", "Connected to a stranger.");
  } else {
    waiting = socket;
    socket.emit("message", "Waiting for a partner...");
  }

  socket.on("message", msg => {
    if (socket.partner) socket.partner.emit("message", msg);
  });

  socket.on("skip", () => {
    if (socket.partner) socket.partner.emit("message", "Stranger disconnected.");
    socket.partner = null;
    if (waiting && waiting !== socket) {
      socket.partner = waiting;
      waiting.partner = socket;
      waiting = null;
      socket.emit("message", "Connected to a new stranger.");
      socket.partner.emit("message", "Connected to a new stranger.");
    } else {
      waiting = socket;
      socket.emit("message", "Waiting for a partner...");
    }
  });

  socket.on("disconnect", () => {
    if (socket.partner) socket.partner.emit("message", "Stranger disconnected.");
    if (waiting === socket) waiting = null;
  });
});

// VIDEO CHAT
const videoNamespace = io.of("/video");
videoNamespace.on("connection", socket => {
  let room = null;
  const rooms = videoNamespace.adapter.rooms;
  for (let r in rooms) {
    if (!rooms[r].has(socket.id) && rooms[r].size === 1) {
      room = r;
      break;
    }
  }

  if (room) {
    socket.join(room);
    socket.to(room).emit("ready");
  } else {
    room = socket.id;
    socket.join(room);
  }

  socket.on("signal", data => socket.to(room).emit("signal", data));
  socket.on("disconnect", () => socket.to(room).emit("leave"));
});

http.listen(PORT, () => console.log("Server running on http://localhost:" + PORT));
