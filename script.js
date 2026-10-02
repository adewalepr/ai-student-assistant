// Determine API base URL dynamically
function getApiUrl() {
  const host = window.location.hostname;
  // If running locally via file:// or local server
  if (host === "localhost" || host === "127.0.0.1" || window.location.protocol === "file:") {
    return "http://localhost:5000";
  }
  // If deployed (e.g. on Vercel), use origin
  return window.location.origin;
}

async function fetchApi(endpoint, body) {
  const primaryApi = getApiUrl();
  const fallbackApi = primaryApi !== "http://localhost:5000" ? "http://localhost:5000" : null;

  async function makeRequest(baseUrl) {
    const res = await fetch(baseUrl + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.reply || data.summary || `Server returned error (${res.status})`);
    }
    return data;
  }

  try {
    return await makeRequest(primaryApi);
  } catch (err) {
    // Attempt local fallback if primary remote call failed due to network error
    if (fallbackApi && (err.name === "TypeError" || err.message.includes("Failed to fetch"))) {
      try {
        return await makeRequest(fallbackApi);
      } catch (fallbackErr) {
        // Fallback also failed, throw original error
      }
    }
    throw err;
  }
}

// Chat
async function sendMessage() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message) return;

  const output = document.getElementById("chatResponse");
  output.innerHTML = "Thinking... 🤖";

  input.value = "";

  try {
    const data = await fetchApi("/chat", { message });
    output.textContent = data.reply;
  } catch (err) {
    console.error("Chat Error:", err);
    if (err.name === "TypeError" || err.message.includes("Failed to fetch")) {
      output.textContent = "Error connecting to server. Make sure node server.js is running on port 5000.";
    } else {
      output.textContent = err.message || "Error connecting to server.";
    }
  }
}

// Summarize
async function summarize() {
  const text = document.getElementById("notes").value.trim();
  if (!text) return;

  const output = document.getElementById("summary");
  output.innerHTML = "Summarizing... 🧠";

  try {
    const data = await fetchApi("/summarize", { text });
    output.textContent = data.summary;
  } catch (err) {
    console.error("Summarize Error:", err);
    if (err.name === "TypeError" || err.message.includes("Failed to fetch")) {
      output.textContent = "Error connecting to server. Make sure node server.js is running on port 5000.";
    } else {
      output.textContent = err.message || "Error summarizing text.";
    }
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
  target.setHours(parseInt(h, 10), parseInt(m, 10), 0);

  let delay = target - now;
  if (delay < 0) {
    // If time has passed today, schedule for tomorrow
    delay += 24 * 60 * 60 * 1000;
  }

  setTimeout(() => {
    alert("🔔 Reminder: " + task);
  }, delay);

  alert("Reminder set!");
}