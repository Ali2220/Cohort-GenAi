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
      streamMode: ["messages", "custom"],
    },
  );

  // Stream se aane wale har naye tukde (chunk) ko loop ke zariye lagatar read kar rahe hain.
  // 'eventType' batayega ke data kis qisam ka hai, aur 'chunk' mein asal data hoga.
  for await (const [eventType, chunk] of response) {
    // CONDITION 1: Agar ye hamara khud ka bheja hua tool event hai
    if (eventType === "custom") {
      console.log("Custom Event Received:", chunk);

      // Is custom event (jaise toolCall) ko bina kisi changing ke direct frontend ko bhej do
      // \n\n lagana zaroori hai kyunke ye SSE (Server-Sent Events) ka standard format hai
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);

      // CONDITION 2: Agar ye AI ka normal text (typing) stream hai
    } else if (eventType === "messages") {
      // Messages array ke andar aate hain, isliye index [0] se pehla message nikal rahe hain
      const msg = chunk[0];

      // Check lagaya hai ke:
      // 1. Message AI ki taraf se ho
      // 2. Usme koi asal text (content) mojood ho (kyunke tool call karte waqt text khali "" hota hai)
      if (msg.type === "ai" && msg.content) {
        // Frontend ko jis format mein data chahiye (StreamMessage), us format mein naya object bana rahe hain
        let message: StreamMessage = {
          type: "ai",
          payload: { text: msg.content as string },
        };

        // Final formatted object ko JSON mein badal kar frontend ko bhej rahe hain
        res.write(`data: ${JSON.stringify(message)}\n\n`);
      }
    }
  }

  // 7. Jab tamam chunks complete ho jayein toh stream connection properly close kar rahe hain
  res.end();
});

// Server ko port 3000 par start karein
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
