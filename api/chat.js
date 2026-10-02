import OpenAI from "openai";

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

    const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
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
        throw new Error(`Gemini API Error: ${errMsg}`);
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
