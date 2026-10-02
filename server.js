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

async function callAI(prompt, systemInstruction = "") {
  const rawGeminiKey = process.env.GEMINI_API_KEY || "";
  const geminiKey = rawGeminiKey.replace(/^["']|["']$/g, "").trim();

  const rawOpenAIKey = process.env.OPENAI_API_KEY || "";
  const openaiKey = rawOpenAIKey.replace(/^["']|["']$/g, "").trim();

  if (geminiKey) {
    const contents = [];
    if (systemInstruction) {
      contents.push({ role: "user", parts: [{ text: systemInstruction }] });
      contents.push({ role: "model", parts: [{ text: "Understood." }] });
    }
    contents.push({ role: "user", parts: [{ text: prompt }] });

    const models = ["gemini-3.8-flash", "gemini-1.5-flash"];
    let firstErrorMsg = "";

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      });

      const data = await res.json();

      if (res.ok) {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }

      const errMsg = data.error?.message || `HTTP ${res.status}`;
      if (!firstErrorMsg) firstErrorMsg = errMsg;

      // Stop immediately on API Key / Permission errors
      if (res.status === 400 || res.status === 403 || errMsg.toLowerCase().includes("key")) {
        // If the error is specifically model deprecated/not found, continue to next model in loop
        if (!errMsg.includes("no longer available") && !errMsg.includes("not found")) {
          throw new Error(`Gemini API Error: ${errMsg}`);
        }
      }
    }

    throw new Error(`Gemini API Error: ${firstErrorMsg || "Failed to generate content."}`);
  }

  if (openaiKey) {
    const openai = new OpenAI({ apiKey: openaiKey });
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
    provider: hasGemini ? "Gemini (Direct REST)" : (hasOpenAI ? "OpenAI" : "None"),
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