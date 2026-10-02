import OpenAI from "openai";

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

  throw new Error("Neither GEMINI_API_KEY nor OPENAI_API_KEY environment variable is configured on Vercel.");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed. Please send a POST request." });
  }

  try {
    const { message } = req.body || {};
    if (!message) {
      return res.status(400).json({ reply: "Message parameter is required." });
    }

    const replyText = await callAI(message, "You are a helpful student assistant. Explain simply.");
    res.status(200).json({ reply: replyText });
  } catch (err) {
    console.error("Chat Error:", err);
    res.status(500).json({ reply: err.message || "Failed to process request." });
  }
}
