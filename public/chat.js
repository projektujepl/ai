async function sendMessage() {
  const message = userInput.value.trim();
  if (!message || isProcessing) return;

  isProcessing = true;
  userInput.disabled = sendButton.disabled = true;

  appendMsgRow("user", message);

  userInput.value = "";
  userInput.style.height = "auto";

  typingIndicator.classList.add("visible");

  try {
    const aiP = appendMsgRow("assistant", "");

    const res = await fetch(
      `https://ai.plprojektuje.workers.dev/?prompt=${encodeURIComponent(message)}`
    );

    const data = await res.json();

    const text = data.response || "Brak odpowiedzi";

    aiP.textContent = text;

  } catch (err) {
    console.error(err);
    appendMsgRow("assistant", "Błąd połączenia z AI");
  } finally {
    typingIndicator.classList.remove("visible");
    isProcessing = false;
    userInput.disabled = sendButton.disabled = false;
  }
}
