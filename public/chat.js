/**
 * Water AI — chat.js
 * - Nowy czat przy każdym wejściu na stronę
 * - Historia czatów w localStorage
 * - Swipe-to-delete na mobile
 * - Wszystkie teksty po polsku
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

// ── CONFIG ────────────────────────────────────────────────────────
const STORAGE_KEY = "waterai_chats";
const WELCOME_MSG = "Cześć! Jestem asystentem AI. W czym mogę Ci dzisiaj pomóc?";

// ── STATE ─────────────────────────────────────────────────────────
let activeChatId = null;
let chatHistory  = [];
let isProcessing = false;

// ── STORAGE ───────────────────────────────────────────────────────
function loadAllChats() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveAllChats(c) { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); }
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

// ── SIDEBAR MOBILE ────────────────────────────────────────────────
function openSidebar() {
  sidebar.classList.add("open");
  backdrop.classList.add("visible");
}
function closeSidebar() {
  sidebar.classList.remove("open");
  backdrop.classList.remove("visible");
}
btnMenu  && btnMenu.addEventListener("click", () =>
  sidebar.classList.contains("open") ? closeSidebar() : openSidebar()
);
backdrop && backdrop.addEventListener("click", closeSidebar);

// ── NEW CHAT ──────────────────────────────────────────────────────
function startNewChat() {
  if (activeChatId && chatHistory.some(m => m.role === "user")) persistChat();
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
  const first = chatHistory.find(m => m.role === "user");
  const title = first
    ? first.content.slice(0,42) + (first.content.length > 42 ? "…" : "")
    : "Czat";
  chats[activeChatId] = { id: activeChatId, title, updatedAt: Date.now(), messages: chatHistory };
  saveAllChats(chats);
  renderChatList();
}

// ── LOAD CHAT ─────────────────────────────────────────────────────
function loadChat(id) {
  if (activeChatId && activeChatId !== id && chatHistory.some(m => m.role === "user")) persistChat();
  const chat = loadAllChats()[id];
  if (!chat) return;
  activeChatId = id;
  chatHistory  = chat.messages;
  renderMessages();
  renderChatList();
  closeSidebar();
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

// ── DELETE ────────────────────────────────────────────────────────
function deleteChat(id) {
  const chats = loadAllChats();
  delete chats[id];
  saveAllChats(chats);
  if (activeChatId === id) startNewChat();
  else renderChatList();
}

// ── RENDER MESSAGES ───────────────────────────────────────────────
function renderMessages() {
  chatMessagesEl.innerHTML = "";
  for (const msg of chatHistory) appendMsgRow(msg.role, msg.content, false);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function appendMsgRow(role, content, animate = true) {
  const row = document.createElement("div");
  row.className = "msg-row" + (role === "user" ? " user" : "");
  if (!animate) { row.style.animation = "none"; row.style.opacity = "1"; }

  const av = document.createElement("div");
  av.className = "msg-avatar" + (role === "user" ? " user-av" : "");
  if (role === "assistant") {
    const img = document.createElement("img");
    img.src = "logo.png"; img.alt = "AI";
    av.appendChild(img);
  } else {
    av.textContent = "Ty";
    av.style.fontSize = "0.6rem";
  }

  const bubble = document.createElement("div");
  bubble.className = "message " + (role === "user" ? "user-message" : "assistant-message");
  const p = document.createElement("p");
  p.textContent = content;
  bubble.appendChild(p);

  if (role === "user") { row.appendChild(bubble); row.appendChild(av); }
  else                  { row.appendChild(av);     row.appendChild(bubble); }

  chatMessagesEl.appendChild(row);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  return p;
}

// ── RENDER SIDEBAR ────────────────────────────────────────────────
function renderChatList() {
  const chats  = loadAllChats();
  const sorted = Object.values(chats).sort((a,b) => b.updatedAt - a.updatedAt);

  chatListEl.innerHTML = "";

  if (sorted.length === 0) {
    sidebarEmptyEl.style.display = "";
    chatListEl.appendChild(sidebarEmptyEl);
    return;
  }

  for (const chat of sorted) {
    // wrapper for swipe reveal
    const wrap = document.createElement("div");
    wrap.className = "swipe-item";

    // red delete bg (revealed on swipe)
    const delBg = document.createElement("div");
    delBg.className = "swipe-del-bg";
    delBg.innerHTML = `<svg viewBox="0 0 16 16" fill="none">
      <path d="M3 4h10M6 4V3h4v1M5 4l.5 9h5L11 4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>Usuń`;
    delBg.addEventListener("click", (e) => { e.stopPropagation(); deleteChat(chat.id); });

    // list item
    const item = document.createElement("div");
    item.className = "chat-list-item" + (chat.id === activeChatId ? " active" : "");

    const titleEl = document.createElement("span");
    titleEl.className = "item-title";
    titleEl.textContent = chat.title;

    // desktop delete btn
    const delBtn = document.createElement("button");
    delBtn.className = "item-del-btn";
    delBtn.title = "Usuń";
    delBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="none">
      <path d="M3 4h10M6 4V3h4v1M5 4l.5 9h5L11 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    delBtn.addEventListener("click", (e) => { e.stopPropagation(); deleteChat(chat.id); });

    item.appendChild(titleEl);
    item.appendChild(delBtn);

    // tap to load — only if NOT swiped
    item.addEventListener("click", (e) => {
      if (wrap.classList.contains("swiped")) {
        closeSwipe(wrap, delBg);
        return;
      }
      loadChat(chat.id);
    });

    // ── swipe to delete (touch only) ──────────────────────
    let touchStartX = 0;
    let touchStartY = 0;
    let wasSwiped = false;
    let isScrolling = null;
    let didMove = false;
    let rafId = null;
    let currentDx = 0;

    const SWIPE_OPEN   = 45;   // px w lewo żeby otworzyć przycisk
    const SWIPE_DELETE = 140;  // px w lewo żeby od razu usunąć
    const BTN_W = 72;          // szerokość przycisku

    function applySwipeFrame(progress) {
      // progress: 0..BTN_W podczas otwierania, potem dalej do SWIPE_DELETE
      const clamped = Math.min(progress, BTN_W);
      const t = clamped / BTN_W;                    // 0..1
      const tx = (1 - t) * 100;                     // 100% → 0% (translateX)
      delBg.style.transform = `translateX(${tx}%)`;
      delBg.style.opacity   = String(Math.min(t * 1.4, 1)); // szybko dochodzi do 1

      if (progress > SWIPE_DELETE) {
        wrap.classList.add("confirm-delete");
      } else {
        wrap.classList.remove("confirm-delete");
      }
    }

    item.addEventListener("touchstart", (e) => {
      touchStartX  = e.touches[0].clientX;
      touchStartY  = e.touches[0].clientY;
      wasSwiped    = wrap.classList.contains("swiped");
      isScrolling  = null;
      didMove      = false;
      currentDx    = 0;
      // wyłącz CSS transitions podczas przeciągania
      wrap.classList.remove("swiped", "closing", "confirm-delete");
      if (wasSwiped) {
        // zacznij od stanu w pełni otwartego
        delBg.style.transform = "translateX(0%)";
        delBg.style.opacity   = "1";
      } else {
        delBg.style.transform = `translateX(100%)`;
        delBg.style.opacity   = "0";
      }
      delBg.style.transition = "none";
      delBg.style.pointerEvents = "none";
    }, { passive: true });

    item.addEventListener("touchmove", (e) => {
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;

      if (isScrolling === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        isScrolling = Math.abs(dy) > Math.abs(dx);
      }
      if (isScrolling) return;

      didMove   = true;
      currentDx = dx;
      e.preventDefault();

      // progress = ile px przycisk jest widoczny
      const progress = wasSwiped
        ? Math.max(0, BTN_W + (-dx))   // był otwarty — cofanie pomniejsza
        : Math.max(0, -dx);            // był zamknięty — swipe w lewo otwiera

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => applySwipeFrame(progress));
    }, { passive: false });

    item.addEventListener("touchend", () => {
      if (isScrolling || !didMove) {
        // bez ruchu — przywróć poprzedni stan przez klasę
        if (wasSwiped) wrap.classList.add("swiped");
        return;
      }
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      delBg.style.transition = "";

      const progress = wasSwiped
        ? Math.max(0, BTN_W + (-currentDx))
        : Math.max(0, -currentDx);

      if (progress > SWIPE_DELETE) {
        wrap.classList.remove("confirm-delete");
        deleteChat(chat.id);
      } else if (progress > SWIPE_OPEN) {
        delBg.style.transform = "";
        delBg.style.opacity   = "";
        wrap.classList.add("swiped");
        delBg.style.pointerEvents = "";
      } else {
        closeSwipe(wrap, delBg);
      }
    }, { passive: true });

    wrap.appendChild(delBg);
    wrap.appendChild(item);
    chatListEl.appendChild(wrap);
  }

  // close any open swipe when tapping elsewhere (only outside swipe items)
  // listener jest dodany tylko raz — w init()
}

function closeSwipe(wrap, delBg) {
  wrap.classList.remove("swiped", "confirm-delete");
  delBg.style.transform = "";
  delBg.style.opacity   = "";
  delBg.style.pointerEvents = "none";
  wrap.classList.add("closing");
  setTimeout(() => wrap.classList.remove("closing"), 220);
}

function closeAllSwipes() {
  document.querySelectorAll(".swipe-item.swiped").forEach(wrap => {
    const delBg = wrap.querySelector(".swipe-del-bg");
    if (delBg) closeSwipe(wrap, delBg);
  });
}

// ── HELPERS ───────────────────────────────────────────────────────
function escHtml(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── INPUT ─────────────────────────────────────────────────────────
userInput.addEventListener("input", function() {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
});
userInput.addEventListener("keydown", function(e) {
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
    const aiP = appendMsgRow("assistant", "", true);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory }),
    });

    if (!response.ok || !response.body) throw new Error("Brak odpowiedzi");

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
        for (const data of consumeSseEvents(buffer + "\n\n").events) {
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
    const lines = raw.split("\n")
      .filter(l => l.startsWith("data:"))
      .map(l => l.slice("data:".length).trimStart());
    if (lines.length) events.push(lines.join("\n"));
  }
  return { events, buffer: norm };
}

// ── INIT ──────────────────────────────────────────────────────────
(function init() {
  activeChatId = genId();
  chatHistory  = [{ role: "assistant", content: WELCOME_MSG }];
  renderMessages();
  renderChatList();

  // Zamknij swipe gdy dotknie się poza elementem listy
  document.addEventListener("touchstart", (e) => {
    if (!e.target.closest(".swipe-item")) closeAllSwipes();
  }, { passive: true });
})();
