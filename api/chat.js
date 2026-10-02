import OpenAI from "openai";

export default async function handler(req, res) {
  // Enable CORS
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ reply: "Server configuration error: OPENAI_API_KEY environment variable is not set on Vercel." });
    }

    const openai = new OpenAI({ apiKey });

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

    res.status(200).json({ reply: response.choices[0].message.content });
  } catch (err) {
    console.error("Chat Error:", err);
    res.status(500).json({ reply: `AI Error: ${err.message || "Failed to process request."}` });
  }
}
