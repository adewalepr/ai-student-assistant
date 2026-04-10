import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🔥 AI Chat
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful student assistant. Explain clearly and simply.",
        },
        { role: "user", content: message }
      ],
    });

    res.json({ reply: response.choices[0].message.content });
  } catch (err) {
    res.json({ reply: "Error connecting to AI." });
  }
});

// 🔥 Summarizer
app.post("/summarize", async (req, res) => {
  try {
    const { text } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Summarize this into clear bullet points:\n${text}`,
        },
      ],
    });

    res.json({ summary: response.choices[0].message.content });
  } catch (err) {
    res.json({ summary: "Error summarizing text." });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));