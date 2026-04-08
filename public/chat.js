/**
 * Water AI — chat.js
 * - Zawsze startuje nowym czatem przy wejściu na stronę
 * - Stare czaty widoczne w sidebarze (localStorage)
 * - Streaming SSE, avatary, historia
 */

// ── DOM ──────────────────────────────────────────────────────────
const chatMessagesEl  = document.getElementById("chat-messages");
const userInput       = document.getElementById("user-input");
const sendButton      = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");
const chatListEl      = document.getElementById("chat-list");
const sidebarEmptyEl  = document.getElementById("sidebar-empty");
const sidebar         = document.getElementById("sidebar");
const backdrop        = document.getElementById("sidebar-backdrop");
const btnMenu         = document.getElementById("btn-menu");
const btnNewSidebar   = document.getElementById("btn-new-chat-sidebar");
const btnNewHeader    = document.getElementById("btn-new-chat-header");

// ── CONFIG ───────────────────────────────────────────────────────
const STORAGE_KEY = "waterai_chats";
const WELCOME_MSG = "Cześć! Jestem asystentem AI. W czym mogę Ci dziś pomóc?";
const USER_INITIALS = "Ty";

// ── STATE ────────────────────────────────────────────────────────
let activeChatId  = null;
let chatHistory   = [];
let isProcessing  = false;

// ── STORAGE ──────────────────────────────────────────────────────
function loadAllChats() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveAllChats(chats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── SIDEBAR MOBILE ────────────────────────────────────────────────
function openSidebar() {
  sidebar.classList.add("open");
  backdrop.classList.add("visible");
}
function closeSidebar() {
  sidebar.classList.remove("open");
  backdrop.classList.remove("visible");
}
btnMenu   && btnMenu.addEventListener("click", () =>
  sidebar.classList.contains("open") ? closeSidebar() : openSidebar()
);
backdrop  && backdrop.addEventListener("click", closeSidebar);

// ── NEW CHAT ──────────────────────────────────────────────────────
function startNewChat() {
  // persist current if it has user messages
  if (activeChatId && chatHistory.some(m => m.role === "user")) {
    persistChat();
  }

  activeChatId = genId();
  chatHistory  = [{ role: "assistant", content: WELCOME_MSG }];

  renderMessages();
  renderChatList();
  closeSidebar();
  userInput.focus();
}

btnNewSidebar && btnNewSidebar.addEventListener("click", startNewChat);
btnNewHeader  && btnNewHeader.addEventListener("click",  startNewChat);

// ── PERSIST ───────────────────────────────────────────────────────
function persistChat() {
  if (!activeChatId) return;
  const chats = loadAllChats();
  const firstUser = chatHistory.find(m => m.role === "user");
  const title = firstUser
    ? firstUser.content.slice(0, 42) + (firstUser.content.length > 42 ? "…" : "")
    : "Czat";

  chats[activeChatId] = {
    id: activeChatId,
    title,
    updatedAt: Date.now(),
    messages: chatHistory,
  };
  saveAllChats(chats);
  renderChatList();
}

// ── LOAD CHAT ─────────────────────────────────────────────────────
function loadChat(id) {
  if (activeChatId && activeChatId !== id && chatHistory.some(m => m.role === "user")) {
    persistChat();
  }
  const chats = loadAllChats();
  const chat  = chats[id];
  if (!chat) return;
  activeChatId = id;
  chatHistory  = chat.messages;
  renderMessages();
  renderChatList();
  closeSidebar();
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

// ── DELETE ────────────────────────────────────────────────────────
function deleteChat(id, e) {
  e.stopPropagation();
  const chats = loadAllChats();
  delete chats[id];
  saveAllChats(chats);
  if (activeChatId === id) startNewChat();
  else renderChatList();
}

// ── RENDER MESSAGES ───────────────────────────────────────────────
function renderMessages() {
  chatMessagesEl.innerHTML = "";
  for (const msg of chatHistory) {
    appendMsgRow(msg.role, msg.content, false);
  }
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

/**
 * Append a message row to the DOM.
 * @param {string} role - 'user' | 'assistant'
 * @param {string} content
 * @param {boolean} animate - whether to animate (true for new messages)
 * @returns {HTMLElement} the <p> inside the bubble (for streaming)
 */
function appendMsgRow(role, content, animate = true) {
  const row = document.createElement("div");
  row.className = "msg-row" + (role === "user" ? " user" : "");
  if (!animate) row.style.animation = "none", row.style.opacity = "1";

  // avatar
  const av = document.createElement("div");
  av.className = "msg-avatar" + (role === "user" ? " user-av" : "");
  if (role === "assistant") {
    const img = document.createElement("img");
    img.src = "logo.png";
    img.alt = "AI";
    av.appendChild(img);
  } else {
    av.textContent = "T";
  }

  // bubble
  const bubble = document.createElement("div");
  bubble.className = "message " + (role === "user" ? "user-message" : "assistant-message");
  const p = document.createElement("p");
  p.textContent = content;
  bubble.appendChild(p);

  if (role === "user") {
    row.appendChild(bubble);
    row.appendChild(av);
  } else {
    row.appendChild(av);
    row.appendChild(bubble);
  }

  chatMessagesEl.appendChild(row);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  return p;
}

// ── RENDER SIDEBAR ────────────────────────────────────────────────
function renderChatList() {
  const chats  = loadAllChats();
  const sorted = Object.values(chats).sort((a, b) => b.updatedAt - a.updatedAt);

  chatListEl.innerHTML = "";

  if (sorted.length === 0) {
    sidebarEmptyEl.style.display = "";
    chatListEl.appendChild(sidebarEmptyEl);
    return;
  }

  for (const chat of sorted) {
    const item = document.createElement("div");
    item.className = "chat-list-item" + (chat.id === activeChatId ? " active" : "");
    item.innerHTML = `
      <span class="item-title">${escHtml(chat.title)}</span>
      <span class="item-del" title="Usuń">
        <svg viewBox="0 0 16 16" fill="none">
          <path d="M3 4h10M6 4V3h4v1M5 4l.5 9h5L11 4"
            stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>`;
    item.addEventListener("click", () => loadChat(chat.id));
    item.querySelector(".item-del").addEventListener("click", e => deleteChat(chat.id, e));
    chatListEl.appendChild(item);
  }
}

// ── HELPERS ───────────────────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── INPUT EVENTS ──────────────────────────────────────────────────
userInput.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
});
userInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
sendButton.addEventListener("click", sendMessage);

// ── SEND ──────────────────────────────────────────────────────────
async function sendMessage() {
  const message = userInput.value.trim();
  if (!message || isProcessing) return;

  isProcessing = true;
  userInput.disabled = sendButton.disabled = true;

  chatHistory.push({ role: "user", content: message });
  appendMsgRow("user", message, true);

  userInput.value = "";
  userInput.style.height = "auto";
  typingIndicator.classList.add("visible");

  try {
    // placeholder for streaming
    const aiP = appendMsgRow("assistant", "", true);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory }),
    });

    if (!response.ok || !response.body) throw new Error("No response");

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let responseText = "";
    let buffer = "";
    let sawDone = false;

    const flush = () => {
      aiP.textContent = responseText;
      chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        const p = consumeSseEvents(buffer + "\n\n");
        for (const data of p.events) {
          if (data === "[DONE]") break;
          try {
            const j = JSON.parse(data);
            const c = j.response || j.choices?.[0]?.delta?.content || "";
            if (c) { responseText += c; flush(); }
          } catch {}
        }
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const p = consumeSseEvents(buffer);
      buffer = p.buffer;
      for (const data of p.events) {
        if (data === "[DONE]") { sawDone = true; buffer = ""; break; }
        try {
          const j = JSON.parse(data);
          const c = j.response || j.choices?.[0]?.delta?.content || "";
          if (c) { responseText += c; flush(); }
        } catch {}
      }
      if (sawDone) break;
    }

    if (responseText) {
      chatHistory.push({ role: "assistant", content: responseText });
      persistChat();
    }
  } catch (err) {
    console.error(err);
    appendMsgRow("assistant", "Przepraszam, wystąpił błąd. Spróbuj ponownie.", true);
  } finally {
    typingIndicator.classList.remove("visible");
    isProcessing = false;
    userInput.disabled = sendButton.disabled = false;
    userInput.focus();
  }
}

// ── SSE PARSER ────────────────────────────────────────────────────
function consumeSseEvents(buffer) {
  let norm = buffer.replace(/\r/g, "");
  const events = [];
  let idx;
  while ((idx = norm.indexOf("\n\n")) !== -1) {
    const raw = norm.slice(0, idx);
    norm = norm.slice(idx + 2);
    const lines = raw.split("\n").filter(l => l.startsWith("data:"))
      .map(l => l.slice("data:".length).trimStart());
    if (lines.length) events.push(lines.join("\n"));
  }
  return { events, buffer: norm };
}

// ── INIT — always new chat on page load ───────────────────────────
(function init() {
  // Start brand-new chat every time user opens the page
  activeChatId = genId();
  chatHistory  = [{ role: "assistant", content: WELCOME_MSG }];
  renderMessages();
  renderChatList(); // populate sidebar from localStorage
})();
