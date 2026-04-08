/**
 * Water AI — Chat Frontend
 * Obsługuje UI czatu, komunikację z API oraz historię czatów w localStorage.
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

// ── STORAGE HELPERS ──────────────────────────────────────────────
const STORAGE_KEY     = "waterai_chats";
const ACTIVE_KEY      = "waterai_active";

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

// ── STATE ────────────────────────────────────────────────────────
let activeChatId  = null;
let chatHistory   = [];   // current messages array (objects {role, content})
let isProcessing  = false;

const WELCOME_MSG = "Cześć! Jestem asystentem AI. W czym mogę Ci dziś pomóc?";

// ── SIDEBAR MOBILE ───────────────────────────────────────────────
function openSidebar() {
  sidebar.classList.add("open");
  backdrop.classList.add("visible");
}
function closeSidebar() {
  sidebar.classList.remove("open");
  backdrop.classList.remove("visible");
}

btnMenu    && btnMenu.addEventListener("click", () =>
  sidebar.classList.contains("open") ? closeSidebar() : openSidebar()
);
backdrop   && backdrop.addEventListener("click", closeSidebar);

// ── NEW CHAT ─────────────────────────────────────────────────────
function startNewChat() {
  // Save current chat first (if it has user messages)
  if (activeChatId && chatHistory.some(m => m.role === "user")) {
    persistCurrentChat();
  }

  activeChatId = genId();
  chatHistory  = [{ role: "assistant", content: WELCOME_MSG }];
  localStorage.setItem(ACTIVE_KEY, activeChatId);

  renderMessages();
  renderChatList();
  closeSidebar();
  userInput.focus();
}

btnNewSidebar && btnNewSidebar.addEventListener("click", startNewChat);
btnNewHeader  && btnNewHeader.addEventListener("click",  startNewChat);

// ── PERSIST CURRENT CHAT ─────────────────────────────────────────
function persistCurrentChat() {
  if (!activeChatId) return;
  const chats = loadAllChats();

  // Title = first user message, max 40 chars
  const firstUser = chatHistory.find(m => m.role === "user");
  const title = firstUser
    ? firstUser.content.slice(0, 40) + (firstUser.content.length > 40 ? "…" : "")
    : "Czat bez tytułu";

  chats[activeChatId] = {
    id: activeChatId,
    title,
    updatedAt: Date.now(),
    messages: chatHistory,
  };

  saveAllChats(chats);
  renderChatList();
}

// ── LOAD CHAT ────────────────────────────────────────────────────
function loadChat(id) {
  // Save current before switching
  if (activeChatId && activeChatId !== id && chatHistory.some(m => m.role === "user")) {
    persistCurrentChat();
  }

  const chats = loadAllChats();
  const chat  = chats[id];
  if (!chat) return;

  activeChatId = id;
  chatHistory  = chat.messages;
  localStorage.setItem(ACTIVE_KEY, id);

  renderMessages();
  renderChatList();
  closeSidebar();
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

// ── DELETE CHAT ───────────────────────────────────────────────────
function deleteChat(id, e) {
  e.stopPropagation();
  const chats = loadAllChats();
  delete chats[id];
  saveAllChats(chats);

  if (activeChatId === id) {
    startNewChat();
  } else {
    renderChatList();
  }
}

// ── RENDER MESSAGES ───────────────────────────────────────────────
function renderMessages() {
  chatMessagesEl.innerHTML = "";
  for (const msg of chatHistory) {
    const el = document.createElement("div");
    el.className = `message ${msg.role}-message`;
    el.innerHTML = `<p>${escHtml(msg.content)}</p>`;
    chatMessagesEl.appendChild(el);
  }
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

// ── RENDER SIDEBAR LIST ───────────────────────────────────────────
function renderChatList() {
  const chats = loadAllChats();
  const sorted = Object.values(chats).sort((a, b) => b.updatedAt - a.updatedAt);

  chatListEl.innerHTML = "";

  if (sorted.length === 0) {
    chatListEl.appendChild(sidebarEmptyEl);
    sidebarEmptyEl.style.display = "";
    return;
  }

  for (const chat of sorted) {
    const item = document.createElement("div");
    item.className = "chat-list-item" + (chat.id === activeChatId ? " active" : "");
    item.dataset.id = chat.id;
    item.innerHTML = `
      <span class="item-title">${escHtml(chat.title)}</span>
      <span class="item-del" title="Usuń">
        <svg viewBox="0 0 16 16" fill="none">
          <path d="M3 4h10M6 4V3h4v1M5 4l.5 9h5L11 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>`;
    item.addEventListener("click", () => loadChat(chat.id));
    item.querySelector(".item-del").addEventListener("click", (e) => deleteChat(chat.id, e));
    chatListEl.appendChild(item);
  }
}

// ── ESCAPE HTML ───────────────────────────────────────────────────
function escHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── ADD MESSAGE TO UI (streaming) ────────────────────────────────
function addMessageToChat(role, content) {
  const el = document.createElement("div");
  el.className = `message ${role}-message`;
  el.innerHTML = `<p>${escHtml(content)}</p>`;
  chatMessagesEl.appendChild(el);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  return el;
}

// ── INPUT EVENTS ─────────────────────────────────────────────────
userInput.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
});

userInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendButton.addEventListener("click", sendMessage);

// ── SEND MESSAGE ──────────────────────────────────────────────────
async function sendMessage() {
  const message = userInput.value.trim();
  if (message === "" || isProcessing) return;

  isProcessing        = true;
  userInput.disabled  = true;
  sendButton.disabled = true;

  // Add user msg to state + UI
  chatHistory.push({ role: "user", content: message });
  addMessageToChat("user", message);

  userInput.value       = "";
  userInput.style.height = "auto";

  typingIndicator.classList.add("visible");

  try {
    // Create placeholder for streamed response
    const assistantEl   = document.createElement("div");
    assistantEl.className = "message assistant-message";
    assistantEl.innerHTML = "<p></p>";
    chatMessagesEl.appendChild(assistantEl);
    const assistantTextEl = assistantEl.querySelector("p");
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;

    const response = await fetch("/api/chat", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ messages: chatHistory }),
    });

    if (!response.ok)   throw new Error("Failed to get response");
    if (!response.body) throw new Error("Response body is null");

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let responseText = "";
    let buffer       = "";

    const flush = () => {
      assistantTextEl.textContent = responseText;
      chatMessagesEl.scrollTop    = chatMessagesEl.scrollHeight;
    };

    let sawDone = false;
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        const parsed = consumeSseEvents(buffer + "\n\n");
        for (const data of parsed.events) {
          if (data === "[DONE]") break;
          try {
            const json = JSON.parse(data);
            const content = json.response || json.choices?.[0]?.delta?.content || "";
            if (content) { responseText += content; flush(); }
          } catch {}
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const parsed = consumeSseEvents(buffer);
      buffer = parsed.buffer;

      for (const data of parsed.events) {
        if (data === "[DONE]") { sawDone = true; buffer = ""; break; }
        try {
          const json = JSON.parse(data);
          const content = json.response || json.choices?.[0]?.delta?.content || "";
          if (content) { responseText += content; flush(); }
        } catch {}
      }
      if (sawDone) break;
    }

    // Save assistant response to history + localStorage
    if (responseText.length > 0) {
      chatHistory.push({ role: "assistant", content: responseText });
      persistCurrentChat();
    }

  } catch (error) {
    console.error("Error:", error);
    addMessageToChat("assistant", "Przepraszam, wystąpił błąd. Spróbuj ponownie.");
  } finally {
    typingIndicator.classList.remove("visible");
    isProcessing        = false;
    userInput.disabled  = false;
    sendButton.disabled = false;
    userInput.focus();
  }
}

// ── SSE PARSER ────────────────────────────────────────────────────
function consumeSseEvents(buffer) {
  let normalized = buffer.replace(/\r/g, "");
  const events   = [];
  let idx;
  while ((idx = normalized.indexOf("\n\n")) !== -1) {
    const rawEvent = normalized.slice(0, idx);
    normalized     = normalized.slice(idx + 2);
    const lines    = rawEvent.split("\n");
    const dataLines = lines
      .filter(l => l.startsWith("data:"))
      .map(l => l.slice("data:".length).trimStart());
    if (dataLines.length) events.push(dataLines.join("\n"));
  }
  return { events, buffer: normalized };
}

// ── INIT ──────────────────────────────────────────────────────────
(function init() {
  const savedId = localStorage.getItem(ACTIVE_KEY);
  const chats   = loadAllChats();

  if (savedId && chats[savedId]) {
    activeChatId = savedId;
    chatHistory  = chats[savedId].messages;
    renderMessages();
  } else {
    // Start fresh
    activeChatId = genId();
    chatHistory  = [{ role: "assistant", content: WELCOME_MSG }];
    localStorage.setItem(ACTIVE_KEY, activeChatId);
    renderMessages();
  }

  renderChatList();
})();
