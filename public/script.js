const socket = io({ reconnection:true, reconnectionAttempts: Infinity, reconnectionDelay:1000 });

let username = null;
let room = null;

// Elements
const usernameModal = document.getElementById("username-modal");
const usernameInput = document.getElementById("username-input");
const usernameBtn = document.getElementById("username-btn");

const roomModal = document.getElementById("room-modal");
const roomList = document.getElementById("room-list");
const newRoomInput = document.getElementById("new-room-input");
const newRoomBtn = document.getElementById("new-room-btn");

const chatContainer = document.querySelector(".chat-container");
const chatBody = document.getElementById("chat-body");
const chatTitle = document.getElementById("chat-title");
const input = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const fileBtn = document.getElementById("file-btn");
const fileInput = document.getElementById("file-input");

const statusBar = document.getElementById("status-bar");
const typingIndicator = document.getElementById("typing-indicator");

let typingTimeout;

// ===== Username & Room =====
usernameBtn.addEventListener("click", () => {
  const name = usernameInput.value.trim();
  if(name!=="") {
    username = name;
    usernameModal.classList.add("hidden");
    roomModal.classList.remove("hidden");
  }
});

function joinRoom(roomName){
  if(!username) return alert("Please enter your name first!");
  room = roomName;
  roomModal.classList.add("hidden");
  chatContainer.classList.remove("hidden");
  chatTitle.textContent = `Room: ${room} (${username})`;
  chatBody.innerHTML = "";
  socket.emit("join room", room, username);
}

newRoomBtn.addEventListener("click", () => {
  const roomName = newRoomInput.value.trim();
  if(roomName) joinRoom(roomName);
});

socket.on("room list", rooms => {
  roomList.innerHTML = "";
  rooms.forEach(r => {
    const li = document.createElement("li");
    li.textContent = r;
    li.addEventListener("click", ()=>joinRoom(r));
    roomList.appendChild(li);
  });
});

// ===== Chat =====
sendBtn.addEventListener("click", ()=> {
  if(input.value.trim()) {
    socket.emit("chat message", input.value);
    input.value="";
  }
});
input.addEventListener("keypress",(e)=>{ if(e.key==="Enter") sendBtn.click(); });

fileBtn.addEventListener("click", ()=>fileInput.click());
fileInput.addEventListener("change", ()=>{
  const file = fileInput.files[0];
  if(file){
    const reader = new FileReader();
    reader.onload = ()=> socket.emit("file upload", { fileName:file.name, fileData:reader.result, fileType:file.type });
    reader.readAsDataURL(file);
  }
});

// Typing
input.addEventListener("input", ()=>{
  socket.emit("typing", username);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(()=>socket.emit("stop typing", username), 1000);
});

socket.on("typing", user => { if(user!==username){ typingIndicator.textContent = `${user} is typing...`; typingIndicator.classList.remove("hidden"); }});
socket.on("stop typing", user => { if(user!==username) typingIndicator.classList.add("hidden"); });

// Status
function showStatus(msg){ statusBar.textContent=msg; statusBar.classList.remove("hidden"); }
function hideStatus(){ statusBar.classList.add("hidden"); }

socket.on("connect_error", ()=>showStatus("⚠️ Server offline / reconnecting..."));
socket.on("disconnect", ()=>showStatus("⚠️ Server disconnected / reconnecting..."));
socket.on("reconnect", ()=>{
  hideStatus();
  addSystemMessage("✅ Reconnected to server");
  if(username && room) socket.emit("join room", room, username);
});

// ===== Messages =====
function formatTime(date){ const d=new Date(date); let h=d.getHours(), m=d.getMinutes(); const ampm=h>=12?"PM":"AM"; h=h%12||12; if(m<10)m="0"+m; return `${h}:${m} ${ampm}`; }

function scrollToBottom(){ chatBody.scrollTop=chatBody.scrollHeight; }

function addMessage(user, text, timestamp=new Date(), delivered=false){
  const msg=document.createElement("div");
  msg.classList.add("message", user===username?"user":"other");
  const time=formatTime(timestamp);
  const checkmarks = user===username? `<span class="checkmarks">${delivered?"✅✅":"✅"}</span>`:"";
  msg.innerHTML=`<strong>${user}:</strong> ${text} ${checkmarks}<span class="timestamp">${time}</span>`;
  chatBody.appendChild(msg);
  scrollToBottom();
}

function addFileMessage(user, data){
  const msg=document.createElement("div");
  msg.classList.add("message", user===username?"user":"other");
  const time=formatTime(data.timestamp||new Date());
  if(data.fileType.startsWith("image/")){
    msg.innerHTML=`<strong>${user}:</strong><br><img src="${data.fileData}" alt="${data.fileName}" /><span class="timestamp">${time}</span>`;
  }else{
    msg.innerHTML=`<strong>${user}:</strong><br><a href="${data.fileData}" download="${data.fileName}">${data.fileName}</a><span class="timestamp">${time}</span>`;
  }
  chatBody.appendChild(msg);
  scrollToBottom();
}

function addSystemMessage(text){
  const msg=document.createElement("div");
  msg.classList.add("message");
  msg.style.textAlign="center";
  msg.style.background="transparent";
  msg.style.color="#666";
  msg.textContent=text;
  chatBody.appendChild(msg);
  scrollToBottom();
}

// Socket events
socket.on("chat history", messages=>{
  messages.forEach(msg=>{
    if(msg.text) addMessage(msg.user,msg.text,msg.timestamp);
    else if(msg.fileName) addFileMessage(msg.user,msg);
  });
  scrollToBottom();
});

socket.on("chat message", data=>addMessage(data.user,data.text,data.timestamp,data.user===username));
socket.on("file upload", data=>addFileMessage(data.user,data));
socket.on("user joined", user=>addSystemMessage(`${user} joined the room`));
socket.on("user left", user=>addSystemMessage(`${user} left the room`));

// Scroll to bottom on window resize (keyboard open)
window.addEventListener("resize", scrollToBottom);
