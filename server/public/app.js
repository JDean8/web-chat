const socket = io("ws://localhost:3500");

const activity = document.querySelector(".activity");
const messageInput = document.querySelector("input");

function sendMessage(e) {
  e.preventDefault();
  if (messageInput.value) {
    socket.emit("message", messageInput.value);
    messageInput.value = "";
  }
  messageInput.focus();
}

document.querySelector("form").addEventListener("submit", sendMessage);

// listen for messages
socket.on("message", (data) => {
  activity.textContent = "";
  const li = document.createElement("li");
  li.textContent = data;
  document.querySelector("ul").appendChild(li);
});

messageInput.addEventListener("keypress", () => {
  socket.emit("activity", socket.id.substring(0, 5));
});

let activityTimer;
socket.on("activity", (name) => {
  activity.textContent = `${name} is typing...`;
  //clear after 1 second
  clearTimeout(activityTimer);
  activityTimer = setTimeout(() => {
    activity.textContent = "";
  }, 1000);
});
