import express from "express";
import cors from "cors";
import { agent } from "./agent.js";
import type { StreamMessage } from "./types.js";

// Express application initialize kar rahe hain
const app = express();

app.use(express.json());
app.use(cors());

// SSE Endpoint (Server-Sent Events)
app.post("/chat", async (req, res) => {
  // 1. Client ke request body se query (user text) extract kar rahe hain
  const { query } = req.body;
  console.log("query ", query);

  // 2. Browser ko Server-Sent Events (SSE) stream establish karne ke liye zaroori headers set kar rahe hain
  res.setHeader("Content-Type", "text/event-stream");

  // 3. AI Agent ko query bhej kar real-time stream start kar rahe hain
  const response = await agent.stream(
    {
      messages: [
        {
          role: "human",
          content: query,
        },
      ],
    },
    {
      // Conversation memory/state lock karne ke liye thread ID
      configurable: { thread_id: "1" },
      // Messages streaming mode enable kar rahe hain
      streamMode: "messages",
    },
  );

  // 4. Async iterable stream se thode thode chunks recieve kar ke process kar rahe hain
  for await (const chunk of response) {
    // Current chunk ka text content aur message type extract kar rahe hain
    const text = chunk[0].content;
    const messageType = chunk[0].type;
    console.log(text);

    let message: StreamMessage = {} as StreamMessage;

    // 5. Check kar rahe hain ke agar chunk ka type "ai" text hai
    if (messageType === "ai") {
      message = {
        type: "ai",
        payload: { text: text as string },
      };

      // 6. Formatted JSON payload ko SSE protocol standard (`data: ...\n\n`) mein client par push kar rahe hain
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    }
  }

  // 7. Jab tamam chunks complete ho jayein toh stream connection properly close kar rahe hain
  res.end();
});

// Server ko port 3000 par start karein
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
