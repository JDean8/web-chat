import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.port || 3500;
const ADMIN = "Admin";

const app = express();

app.use(express.static(path.join(__dirname, "public")));

const expressSever = app.listen(PORT, () => {
  console.log(`listening on ${PORT}...`);
});

// state
const UsersState = {
  users: [],
  setUsers: function (newUsersArray) {
    this.users = newUsersArray;
  },
};

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
  socket.emit("message", buildMessage(ADMIN, "Welcome to Web-Chat!"));

  socket.on("enterRoom", ({ name, room }) => {
    //leave previous room
    console.log("socket enter room triggered");
    const prevRoom = getUser(socket.id)?.room;
    if (prevRoom) {
      socket.leave(prevRoom);
      io.to(prevRoom).emit(
        "message",
        buildMessage(ADMIN, `${name} has left the room`)
      );
    }
    const user = activateUser(socket.id, name, room);
    // cannot update prev room users list until after the state updates as above
    if (prevRoom) {
      io.to(
        socket.emit("userList", {
          users: getUsersInRoom(prevRoom),
        })
      );
    }
    // user joins new room
    socket.join(user.room);
    // to user that joined
    socket.emit(
      "message",
      buildMessage(ADMIN, `You have joined ${user.room} chat room`)
    );
    // to everyone else
    socket.broadcast
      .to(user.room)
      .emit("message", buildMessage(ADMIN, `${user.name} has joined the room`));
    // update user list for room
    io.to(user.room).emit("userList", {
      users: getUsersInRoom(user.room),
    });
    io.emit("roomList", {
      rooms: getAllActiveRooms(),
    });
  });

  // listening for message event
  socket.on("message", ({ name, text }) => {
    const room = getUser(socket.id)?.room;
    if (room) {
      io.to(room).emit("message", buildMessage(name, text));
    }
  });

  // When user diconnects - to all others
  socket.on("disconnect", () => {
    const user = getUser(socket.id);
    userLeavesApp(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        buildMessage(ADMIN, `${user.name} has left the room`)
      );
      io.to(user.room).emit("userList", {
        users: getUsersInRoom(user.room),
      });
      io.emit("roomList", {
        rooms: getAllActiveRooms(),
      });
      console.log(`User Connected: ${socket.id}`);
    }
  });

  //listen for activity
  socket.on("activity", (name) => {
    const room = getUser(socket.id)?.room;
    if (room) {
      socket.broadcast.to(room).emit("activity", name);
    }
  });
});

function buildMessage(name, text) {
  return {
    name,
    text,
    time: new Intl.DateTimeFormat("default", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    }).format(new Date()),
  };
}

// User Functions
function activateUser(id, name, room) {
  const user = { id, name, room };
  UsersState.setUsers([
    ...UsersState.users.filter((user) => user.id !== id),
    user,
  ]);
  return user;
}

function userLeavesApp(id) {
  UsersState.setUsers(UsersState.users.filter((user) => user.id !== id));
}

function getUser(id) {
  return UsersState.users.find((user) => user.id === id);
}

function getUsersInRoom(room) {
  return UsersState.users.filter((user) => user.room === room);
}

function getAllActiveRooms() {
  return Array.from(
    new Set(
      UsersState.users.map((user) => {
        return user.room;
      })
    )
  );
}
