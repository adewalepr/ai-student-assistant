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

// Initialize OpenAI client dynamically per request or fallback
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

// Health route
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Chat handler
async function handleChat(req, res) {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ reply: "Message parameter is required." });
    }

    const openai = getOpenAIClient();
    if (!openai) {
      return res.status(500).json({ reply: "Server error: OPENAI_API_KEY environment variable is not configured on the server." });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful student assistant. Explain simply.",
        },
        { role: "user", content: message },
      ],
    });

    res.json({ reply: response.choices[0].message.content });
  } catch (err) {
    console.error("Chat error:", err);
    const errMsg = err?.message || "Error connecting to AI server.";
    res.status(500).json({ reply: `AI Error: ${errMsg}` });
  }
}

// Summarize handler
async function handleSummarize(req, res) {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ summary: "Text parameter is required." });
    }

    const openai = getOpenAIClient();
    if (!openai) {
      return res.status(500).json({ summary: "Server error: OPENAI_API_KEY environment variable is not configured on the server." });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Summarize this into bullet points:\n${text}`,
        },
      ],
    });

    res.json({ summary: response.choices[0].message.content });
  } catch (err) {
    console.error("Summarize error:", err);
    const errMsg = err?.message || "Error summarizing text.";
    res.status(500).json({ summary: `AI Error: ${errMsg}` });
  }
}

app.post("/chat", handleChat);
app.post("/api/chat", handleChat);
app.post("/summarize", handleSummarize);
app.post("/api/summarize", handleSummarize);

// Only listen if run directly via Node.js
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;