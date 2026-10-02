import express from "express";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(express.json({ limit: "1mb" }));

// Frontend
app.use(express.static(path.join(__dirname, "public")));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    app: "AURA AI"
  });
});

// AI chat
app.post("/api/chat", async (req, res) => {
  try {
    const messages = Array.isArray(req.body.messages)
      ? req.body.messages
      : [];

    if (messages.length === 0) {
      return res.status(400).json({
        error: "Please send a message."
      });
    }

    const safeMessages = messages
      .slice(-20)
      .filter(
        m =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
      );

    const response = await client.responses.create({
      model: "gpt-6-luna",
      instructions:
        "You are AURA AI, a helpful general-purpose AI assistant. " +
        "Answer questions clearly and accurately. " +
        "You can help with mathematics, writing, coding, studying, " +
        "summaries, explanations and brainstorming.",
      input: safeMessages
    });

    res.json({
      reply: response.output_text
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "AI request failed. Check the API key and server logs."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AURA AI running on port ${PORT}`);
});
