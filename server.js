import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
  "gemini-1.5-pro-latest",
  "gemini-pro"
];

async function callAI(prompt, systemInstruction = "") {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) {
    const contents = [];
    if (systemInstruction) {
      contents.push({ role: "user", parts: [{ text: systemInstruction }] });
      contents.push({ role: "model", parts: [{ text: "Understood." }] });
    }
    contents.push({ role: "user", parts: [{ text: prompt }] });

    let lastError = null;

    for (const model of GEMINI_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey.trim()}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents }),
        });

        const data = await res.json();

        if (res.ok) {
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        } else {
          lastError = data.error?.message || `Status ${res.status}`;
          if (data.error?.status === "INVALID_ARGUMENT" || data.error?.reason === "API_KEY_INVALID") {
            throw new Error(`Gemini API Key Error: ${lastError}`);
          }
        }
      } catch (err) {
        if (err.message.includes("Gemini API Key Error")) throw err;
        lastError = err.message;
      }
    }

    throw new Error(`Gemini API Error: ${lastError || "Could not connect to any Gemini model."}`);
  }

  if (openaiKey) {
    const openai = new OpenAI({ apiKey: openaiKey.trim() });
    const messages = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });
    return response.choices[0].message.content;
  }

  throw new Error("Neither GEMINI_API_KEY nor OPENAI_API_KEY environment variable is set.");
}

// Health route
app.get("/health", (req, res) => {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  res.json({
    status: "ok",
    provider: hasGemini ? "Gemini (Direct REST with Model Fallback)" : (hasOpenAI ? "OpenAI" : "None"),
    time: new Date().toISOString()
  });
});

// Chat handler
async function handleChat(req, res) {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ reply: "Message parameter is required." });
    }

    const replyText = await callAI(message, "You are a helpful student assistant. Explain simply.");
    res.json({ reply: replyText });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ reply: err.message || "Error connecting to AI server." });
  }
}

// Summarize handler
async function handleSummarize(req, res) {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ summary: "Text parameter is required." });
    }

    const summaryText = await callAI(`Summarize this into bullet points:\n${text}`);
    res.json({ summary: summaryText });
  } catch (err) {
    console.error("Summarize error:", err);
    res.status(500).json({ summary: err.message || "Error summarizing text." });
  }
}

app.post("/chat", handleChat);
app.post("/api/chat", handleChat);
app.post("/summarize", handleSummarize);
app.post("/api/summarize", handleSummarize);

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;