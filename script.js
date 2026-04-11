const API = "https://ai-student-assistant-production.up.railway.app";

// Chat
async function sendMessage() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message) return;

  const output = document.getElementById("chatResponse");
  output.innerHTML = "Thinking... 🤖";

  input.value = "";

  try {
    const res = await fetch(API + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();
    output.textContent = data.reply;
  } catch (err) {
    output.textContent = "Error connecting to server.";
  }
}

// Summarize
async function summarize() {
  const text = document.getElementById("notes").value.trim();
  if (!text) return;

  const output = document.getElementById("summary");
  output.innerHTML = "Summarizing... 🧠";

  try {
    const res = await fetch(API + "/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const data = await res.json();
    output.textContent = data.summary;
  } catch (err) {
    output.textContent = "Error summarizing text.";
  }
}

// Reminder
function setReminder() {
  const task = document.getElementById("task").value;
  const time = document.getElementById("time").value;

  if (!task || !time) {
    alert("Fill all fields");
    return;
  }

  const now = new Date();
  const [h, m] = time.split(":");
  const target = new Date();
  target.setHours(h, m, 0);

  const delay = target - now;

  setTimeout(() => {
    alert("🔔 Reminder: " + task);
  }, delay);

  alert("Reminder set!");
}