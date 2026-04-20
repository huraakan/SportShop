const aiChatFab = document.getElementById("ai-chat-fab");
const aiChatBox = document.getElementById("ai-chat");
const aiChatClose = document.getElementById("ai-chat-close");
const aiChatForm = document.getElementById("ai-chat-form");
const aiChatInput = document.getElementById("ai-chat-input");
const aiChatMessages = document.getElementById("ai-chat-messages");
const aiChatSuggestions = document.getElementById("ai-chat-suggestions");

let aiChatHistory = [];
let aiIsSending = false;

function getCurrentPageContext() {
  const page = window.location.pathname.split("/").pop() || "index.html";

  const context = {
    page,
    title: document.title || "",
    product: null
  };

  if (page === "product.html") {
    const productTitle = document.getElementById("product-title")?.textContent?.trim() || "";
    const productCategory = document.getElementById("product-category")?.textContent?.trim() || "";
    const productPrice = document.getElementById("product-price")?.textContent?.trim() || "";

    context.product = {
      title: productTitle,
      category: productCategory,
      price: productPrice
    };
  }

  return context;
}

function addAiMessage(text, role = "bot") {
  if (!aiChatMessages) return;

  const message = document.createElement("div");
  message.className = `ai-msg ${role === "user" ? "ai-msg-user" : "ai-msg-bot"}`;
  message.textContent = text;
  aiChatMessages.appendChild(message);
  aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
}

function setAiLoading(isLoading) {
  aiIsSending = isLoading;

  if (aiChatInput) aiChatInput.disabled = isLoading;

  const submitBtn = aiChatForm?.querySelector("button[type='submit']");
  if (submitBtn) {
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? "..." : "↑";
  }
}

async function sendAiMessage(text) {
  if (!text || aiIsSending) return;

  addAiMessage(text, "user");
  aiChatHistory.push({ role: "user", content: text });
  setAiLoading(true);

  const typing = document.createElement("div");
  typing.className = "ai-msg ai-msg-bot";
  typing.textContent = "Печатает...";
  aiChatMessages.appendChild(typing);
  aiChatMessages.scrollTop = aiChatMessages.scrollHeight;

  try {
    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text,
        history: aiChatHistory,
        context: getCurrentPageContext()
      })
    });

    const data = await response.json();
    typing.remove();

    const reply = data.reply || "Не удалось получить ответ.";
    addAiMessage(reply, "bot");
    aiChatHistory.push({ role: "assistant", content: reply });
  } catch (error) {
    typing.remove();
    addAiMessage("Ошибка подключения к AI. Проверь сервер и попробуй снова.", "bot");
    console.error("AI CHAT ERROR:", error);
  } finally {
    setAiLoading(false);
  }
}

aiChatFab?.addEventListener("click", () => {
  aiChatBox?.classList.remove("hidden");
});

aiChatClose?.addEventListener("click", () => {
  aiChatBox?.classList.add("hidden");
});

aiChatForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = aiChatInput?.value.trim();
  if (!text) return;

  aiChatInput.value = "";
  await sendAiMessage(text);
});

aiChatSuggestions?.addEventListener("click", async (e) => {
  const btn = e.target.closest(".ai-suggestion");
  if (!btn) return;

  const text = btn.dataset.text?.trim();
  if (!text) return;

  await sendAiMessage(text);
});