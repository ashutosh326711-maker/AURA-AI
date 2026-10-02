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

app.use(express.json({ limit: "12mb" }));

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);


/* HEALTH */

app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    app: "AURA AI"
  });
});


/* CHAT */

app.post("/api/chat", async (req, res) => {

  try {

    const messages =
      Array.isArray(req.body.messages)
        ? req.body.messages
        : [];

    const image =
      typeof req.body.image === "string"
        ? req.body.image
        : null;

    if (messages.length === 0 && !image) {

      return res.status(400).json({
        error: "Please send a message."
      });

    }

    const safeMessages =
      messages
        .slice(-20)
        .filter(
          m =>
            (m.role === "user" ||
             m.role === "assistant") &&
            typeof m.content === "string"
        );

    /*
      Detect image-generation requests.
    */

    const lastUser =
      [...safeMessages]
        .reverse()
        .find(
          m => m.role === "user"
        );

    const userText =
      lastUser?.content || "";

    const wantsImage =
      /\b(create|generate|make|draw|design|render)\b.*\b(image|picture|photo|wallpaper|logo|art)\b/i
      .test(userText) ||
      /\bimage\s*(bana|banao|generate|create)\b/i
      .test(userText);


    /* IMAGE GENERATION */

    if (wantsImage && !image) {

      const result =
        await client.images.generate({
          model: "gpt-image-2",
          prompt: userText
        });

      const imageData =
        result.data?.[0]?.b64_json;

      if (!imageData) {

        return res.status(500).json({
          error:
            "Image generation did not return an image."
        });

      }

      return res.json({
        reply:
          "Done bhai — image ready hai.",
        image:
          "data:image/png;base64," +
          imageData
      });
    }


    /* NORMAL / IMAGE CHAT */

    let input = safeMessages;

    if (image) {

      const lastMessage =
        safeMessages.length > 0
          ? safeMessages[safeMessages.length - 1]
          : null;

      const text =
        lastMessage?.content ||
        "Please analyze this image.";

      input = [
        ...safeMessages.slice(0, -1),
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: text
            },
            {
              type: "input_image",
              image_url: image
            }
          ]
        }
      ];
    }


    /* AI INSTRUCTIONS */

    const instructions = `
You are AURA AI.

You are a helpful, friendly and smart general-purpose AI assistant.

Default language:
English.

If the user explicitly asks for Hindi, answer in Hindi.
If the user explicitly asks for Hinglish, answer naturally in Hinglish.
Continue following that language preference in the conversation unless the user changes it.

User memory:
If the user tells you their preferred name, use that name naturally.
For example:
"My name is Yuvi. Call me Yuvi."
Then call the user Yuvi in future messages in this conversation.

Creator information:
AURA AI was created and developed by Yuvraj Singh Rathore.

If someone asks:
"Who is Yuvraj?"
"Who made you?"
"Who created you?"
"Who developed you?"

Answer clearly:
"Yuvraj Singh Rathore is the creator and developer of this version of AURA AI."

Do not claim that Yuvraj created OpenAI.
Do not claim that Yuvraj created the underlying OpenAI models.

You are powered by OpenAI technology.

Write naturally and conversationally.
Avoid unnecessary formal language.
Give useful explanations.
For maths, show the calculation clearly.
For coding, provide working code and explain where it goes.
`;


    const response =
      await client.responses.create({

        model: "gpt-6-luna",

        instructions,

        input

      });


    return res.json({
      reply:
        response.output_text ||
        "Sorry, I couldn't generate a response."
    });


  } catch (error) {

    console.error(
      "AURA ERROR:",
      error
    );

    return res.status(500).json({
      error:
        "AI request failed. Check the Render logs and API key."
    });

  }

});


/* START */

const PORT =
  process.env.PORT || 3000;

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `AURA AI running on port ${PORT}`
    );
  }
);
