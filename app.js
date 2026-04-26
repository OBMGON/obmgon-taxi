const STORAGE_KEY = "cloud-chat.messages";

const initialMessages = [
  {
    author: "bot",
    text: "Hola, soy tu chat en la nube. Escribe un mensaje para probar la conversacion.",
    time: new Date().toISOString(),
  },
];

const responses = [
  "Te leo. Cuentame un poco mas.",
  "Interesante. Que quieres hacer con esa idea?",
  "Puedo ayudarte a ordenar los siguientes pasos.",
  "Eso suena bien. Quieres convertirlo en una lista de tareas?",
  "Perfecto. Sigamos construyendo desde aqui.",
];

const chatLog = document.querySelector("#chatLog");
const chatForm = document.querySelector("#chatForm");
const messageInput = document.querySelector("#messageInput");
const clearButton = document.querySelector("#clearChat");
const newChatButton = document.querySelector("#newChat");
const template = document.querySelector("#messageTemplate");
const quickReplies = document.querySelectorAll("[data-message]");

let messages = loadMessages();

renderMessages();
messageInput.focus();

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = messageInput.value.trim();
  if (!text) return;

  addMessage("user", text);
  messageInput.value = "";

  window.setTimeout(() => {
    addMessage("bot", createBotReply(text));
  }, 500);
});

clearButton.addEventListener("click", () => {
  resetChat();
});

newChatButton.addEventListener("click", () => {
  resetChat();
});

quickReplies.forEach((button) => {
  button.addEventListener("click", () => {
    messageInput.value = button.dataset.message;
    messageInput.focus();
  });
});

function resetChat() {
  messages = [...initialMessages];
  saveMessages();
  renderMessages();
  messageInput.focus();
}

function loadMessages() {
  try {
    const savedMessages = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(savedMessages) && savedMessages.length > 0) {
      return savedMessages;
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return [...initialMessages];
}

function saveMessages() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

function addMessage(author, text) {
  messages.push({
    author,
    text,
    time: new Date().toISOString(),
  });
  saveMessages();
  renderMessages();
}

function renderMessages() {
  chatLog.replaceChildren();

  messages.forEach((message) => {
    const item = template.content.firstElementChild.cloneNode(true);
    item.classList.add(message.author === "user" ? "user" : "bot");
    item.querySelector(".message-author").textContent =
      message.author === "user" ? "Tu" : "Chat";
    item.querySelector(".message-time").textContent = formatTime(message.time);
    item.querySelector(".message-text").textContent = message.text;
    chatLog.appendChild(item);
  });

  chatLog.scrollTop = chatLog.scrollHeight;
}

function formatTime(value) {
  return new Intl.DateTimeFormat("es", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function createBotReply(text) {
  const normalized = text.toLowerCase();

  if (normalized.includes("hola") || normalized.includes("buenas")) {
    return "Hola. Me alegra verte por aqui.";
  }

  if (normalized.includes("ayuda")) {
    return "Claro. Dime que quieres resolver y lo dividimos en pasos simples.";
  }

  if (normalized.includes("gracias")) {
    return "De nada. Estoy aqui para seguir ayudando.";
  }

  const index = Math.abs(hashText(text)) % responses.length;
  return responses[index];
}

function hashText(text) {
  return [...text].reduce((hash, char) => {
    return (hash << 5) - hash + char.charCodeAt(0);
  }, 0);
}
