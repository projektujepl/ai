const chat = document.getElementById("chat");
const input = document.getElementById("input");
const send = document.getElementById("send");

function add(text, cls) {
  const div = document.createElement("div");
  div.className = cls;
  div.textContent = text;
  chat.appendChild(div);
}

async function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;

  add(msg, "user");
  input.value = "";

  const res = await fetch(
    `https://ai.plprojektuje.workers.dev/?prompt=${encodeURIComponent(msg)}`
  );

  const data = await res.json();

  add(data.response, "ai");
}

send.onclick = sendMessage;
