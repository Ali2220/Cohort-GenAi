import express from "express";
import cors from "cors";
import { agent } from "./agent.js";
import type { StreamMessage } from "./types.js";
import { scanReceipt } from "./scanner.js";

const app = express();

// Middleware Setup
app.use(express.json({limit: "10mb"}));
app.use(cors());

// SSE Chat Streaming Endpoint
app.post("/chat", async (req, res) => {
  const { query } = req.body;

  res.setHeader("Content-Type", "text/event-stream");

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
      configurable: { thread_id: "1" },
      streamMode: ["messages", "custom"],
    }
  );

  for await (const [eventType, chunk] of response) {
    // 1. Handle custom events
    if (eventType === "custom") {
      console.log("Custom Event Received:", chunk);
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
    // 2. Handle LangGraph message streams
    else if (eventType === "messages") {
      const msg = chunk[0];

      // Stream AI text chunks
      if (msg.type === "ai" && msg.content) {
        let message: StreamMessage = {
          type: "ai",
          payload: { text: msg.content as string },
        };

        res.write(`data: ${JSON.stringify(message)}\n\n`);
      }
      // Stream tool execution results
      else if (msg.type === "tool" && msg.content) {
        let message: StreamMessage = {
          type: "tool",
          payload: {
            name: msg.name,
            result: JSON.parse(msg.content as string),
          },
        };

        res.write(`data: ${JSON.stringify(message)}\n\n`);
      }
    }
  }

  res.end();
});

app.post("/scan-receipt", async (req, res) => {
  const { image } = req.body

  if(!image){
    return res.status(400).json({
      message: "Image not found"
    })
  }

  const result = await scanReceipt(image)

  res.json(result)
})

// Start Server
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});