function addMsg(text, type) {
  const div = document.createElement("div");
  div.className = "msg " + type;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

async function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;

  addMsg(msg, "user");
  input.value = "";

  const aiBox = addMsg("...", "ai");

  try {
    const res = await fetch(
      `https://ai.plprojektuje.workers.dev/?prompt=${encodeURIComponent(msg)}`
    );

    const data = await res.json();

    console.log("API RESPONSE:", data); // 👈 DEBUG

    aiBox.textContent = data.response ?? "Brak response w API";

  } catch (e) {
    aiBox.textContent = "Błąd API";
  }
}
