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

function getAIClient() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) {
    return {
      client: new OpenAI({
        apiKey: geminiKey,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      }),
      model: "gemini-2.5-flash",
      provider: "Gemini",
    };
  } else if (openaiKey) {
    return {
      client: new OpenAI({
        apiKey: openaiKey,
      }),
      model: "gpt-4o-mini",
      provider: "OpenAI",
    };
  }
  return null;
}

// Health route
app.get("/health", (req, res) => {
  const ai = getAIClient();
  res.json({
    status: "ok",
    aiConfigured: !!ai,
    provider: ai ? ai.provider : "None",
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

    const ai = getAIClient();
    if (!ai) {
      return res.status(500).json({ reply: "Server error: Neither GEMINI_API_KEY nor OPENAI_API_KEY environment variable is set." });
    }

    const response = await ai.client.chat.completions.create({
      model: ai.model,
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
    res.status(500).json({ reply: `AI Error (${err.status || 500}): ${err.message || "Error connecting to AI server."}` });
  }
}

// Summarize handler
async function handleSummarize(req, res) {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ summary: "Text parameter is required." });
    }

    const ai = getAIClient();
    if (!ai) {
      return res.status(500).json({ summary: "Server error: Neither GEMINI_API_KEY nor OPENAI_API_KEY environment variable is set." });
    }

    const response = await ai.client.chat.completions.create({
      model: ai.model,
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
    res.status(500).json({ summary: `AI Error (${err.status || 500}): ${err.message || "Error summarizing text."}` });
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