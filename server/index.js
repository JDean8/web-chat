import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.port || 3500;

const app = express();

app.use(express.static(path.join(__dirname, "public")));

const expressSever = app.listen(PORT, () => {
  console.log(`listening on ${PORT}...`);
});

const io = new Server(expressSever, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? false
        : ["http://localhost:5500", "http://127.0.0.1:5500"],
  },
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // On connection - send message to only user then to all others
  socket.emit("message", "Welcome to Web-Chat!");
  socket.broadcast.emit(
    "message",
    `User Connected: ${socket.id.substring(0, 5)}`
  );

  // listening for message event
  socket.on("message", (data) => {
    console.log(data);
    io.emit("message", `${socket.id.substring(0, 5)}: ${data}`);
  });

  // When user diconnects - to all others
  socket.on("disconnect", () => {
    socket.broadcast.emit(
      "message",
      `User logged off: ${socket.id.substring(0, 5)}`
    );
  });

  //listen for activity
  socket.on("activity", (name) => {
    socket.broadcast.emit("activity", name);
  });
});
