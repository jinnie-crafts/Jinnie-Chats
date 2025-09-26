const socket = io({ reconnection:true, reconnectionAttempts: Infinity, reconnectionDelay:1000 });

let username=null, room=null;

// Elements
const usernameModal=document.getElementById("username-modal");
const usernameInput=document.getElementById("username-input");
const usernameBtn=document.getElementById("username-btn");

const roomModal=document.getElementById("room-modal");
const roomList=document.getElementById("room-list");
const newRoomInput=document.getElementById("new-room-input");
const newRoomPassword=document.getElementById("new-room-password");
const newRoomBtn=document.getElementById("new-room-btn");
const joinPasswordContainer=document.getElementById("join-password-container");
const joinRoomPassword=document.getElementById("join-room-password");
const joinRoomBtn=document.getElementById("join-room-btn");
const passwordAlert=document.getElementById("password-alert");

const chatContainer=document.querySelector(".chat-container");
const chatBody=document.getElementById("chat-body");
const chatTitle=document.getElementById("chat-title");
const chatSubtitle=document.getElementById("chat-subtitle");
const input=document.getElementById("message-input");
const sendBtn=document.getElementById("send-btn");
const fileBtn=document.getElementById("file-btn");
const fileInput=document.getElementById("file-input");

const statusBar=document.getElementById("status-bar");
const typingIndicator=document.getElementById("typing-indicator");

const inviteBtn=document.getElementById("invite-btn");
const inviteModal=document.getElementById("inviteModal");
const closeInvite=document.getElementById("close-invite");
const inviteUrlInput=document.getElementById("invite-url");
const copyBtn=document.getElementById("copy-btn");

const toast=document.getElementById("toast");
let typingTimeout;

// ===== Password Toggle =====
function togglePassword(fieldId){
  const input = document.getElementById(fieldId);
  input.type = input.type==="password"?"text":"password";
}

// ===== Username =====
usernameBtn.addEventListener("click",()=>{
  const name=usernameInput.value.trim();
  if(name){ username=name; usernameModal.classList.add("hidden"); roomModal.classList.remove("hidden"); }
});

// ===== Room Creation =====
newRoomBtn.addEventListener("click",()=>{
  const r=newRoomInput.value.trim();
  const p=newRoomPassword.value.trim();
  if(r && p){ socket.emit("create room", r, p, username); }
});

// ===== Join Existing Room =====
roomList.addEventListener("click", e=>{
  if(e.target.tagName==="LI"){
    const selectedRoom=e.target.textContent;
    joinPasswordContainer.classList.remove("hidden");
    joinRoomBtn.onclick=()=>{
      const pwd=joinRoomPassword.value;
      socket.emit("join room request", selectedRoom, pwd, username);
    }
  }
});

// ===== Socket Events =====
socket.on("room list",rooms=>{
  roomList.innerHTML="";
  rooms.forEach(r=>{
    const li=document.createElement("li");
    li.textContent=r;
    roomList.appendChild(li);
  });
});

socket.on("wrong password",()=>{ passwordAlert.classList.remove("hidden"); });

socket.on("room joined", roomName=>{
  room=roomName;
  chatContainer.classList.remove("hidden");
  roomModal.classList.add("hidden");
  chatTitle.textContent="Jinnie Chat";
  chatSubtitle.textContent=`Room: ${room} (${username})`;
});

// ===== Chat =====
sendBtn.addEventListener("click",()=>{ if(input.value.trim()){ socket.emit("chat message", input.value); input.value=""; }});
input.addEventListener("keypress", e=>{ if(e.key==="Enter") sendBtn.click(); });

// ===== File Sharing =====
fileBtn.addEventListener("click",()=>fileInput.click());
fileInput.addEventListener("change",()=>{
  const file=fileInput.files[0];
  if(file){
    const reader=new FileReader();
    reader.onload=()=>socket.emit("file upload",{fileName:file.name,fileData:reader.result,fileType:file.type});
    reader.readAsDataURL(file);
  }
});

// ===== Typing =====
input.addEventListener("input",()=>{
  socket.emit("typing", username);
  clearTimeout(typingTimeout);
  typingTimeout=setTimeout(()=>socket.emit("stop typing", username),1000);
});
socket.on("typing", user=>{ if(user!==username){ typingIndicator.textContent=`${user} is typing...`; typingIndicator.classList.remove("hidden"); }});
socket.on("stop typing", user=>{ if(user!==username) typingIndicator.classList.add("hidden"); });

// ===== Messages =====
function formatTime(date){ const d=new Date(date); let h=d.getHours(),m=d.getMinutes(); const ampm=h>=12?"PM":"AM"; h=h%12||12; if(m<10)m="0"+m; return `${h}:${m} ${ampm}`; }
function scrollToBottom(){ chatBody.scrollTop=chatBody.scrollHeight; }

function addMessage(user,text){
  const msg=document.createElement("div");
  msg.classList.add("message",user===username?"user":"other");
  const time=formatTime(new Date());
  msg.innerHTML=`<strong>${user}:</strong> ${text} <span class="timestamp">${time}</span>`;
  chatBody.appendChild(msg);
  scrollToBottom();
}

function addFileMessage(user,data){
  const msg=document.createElement("div");
  msg.classList.add("message",user===username?"user":"other");
  let fileContent="";
  if(data.fileType.startsWith("image/")) fileContent=`<img src="${data.fileData}" />`;
  else fileContent=`<a href="${data.fileData}" download="${data.fileName}">${data.fileName}</a>`;
  const time=formatTime(new Date());
  msg.innerHTML=`<strong>${user}:</strong><br>${fileContent}<span class="timestamp">${time}</span>`;
  chatBody.appendChild(msg);
  scrollToBottom();
}

socket.on("chat message", data=>addMessage(data.user||"Unknown",data.text||data));
socket.on("file message", data=>addFileMessage(data.user||"Unknown",data));

// ===== Invite =====
function setInviteUrl(){ inviteUrlInput.value=`${window.location.origin}?room=${room}`; }
inviteBtn.addEventListener("click",()=>{ setInviteUrl(); inviteModal.classList.remove("hidden"); });
closeInvite.addEventListener("click",()=>inviteModal.classList.add("hidden"));
copyBtn.addEventListener("click",()=>{
  inviteUrlInput.select();
  document.execCommand("copy");
  inviteModal.classList.add("hidden");
  showToast("Link copied!");
});

// ===== Toast =====
function showToast(message,duration=1500){
  toast.textContent=message;
  toast.classList.remove("hidden");
  toast.classList.add("show");
  setTimeout(()=>{ toast.classList.remove("show"); setTimeout(()=>toast.classList.add("hidden"),300); },duration);
}

//splash screen
window.addEventListener("load", ()=>{
  const splash = document.getElementById("splash-screen");
  // Show splash for 2 seconds
  setTimeout(()=>{
    splash.classList.add("fade-out");
    setTimeout(()=>{ splash.style.display = "none"; }, 800); // hide after fade-out
  }, 2000); // 2 seconds delay
});
