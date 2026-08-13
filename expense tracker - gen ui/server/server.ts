import express from 'express'
import cors from "cors"
import { agent } from "./agent.js"

// Express application initialize kar rahe hain
const app = express()

app.use(express.json())
app.use(cors())

// SSE Endpoint (Server-Sent Events)
app.post("/chat", async (req, res) => {
    // ----------------------------------------------------
    // STEP 1: SSE Ke Zaroori Headers Set Karein
    // ----------------------------------------------------
    // Browser ko batayein ke yeh ek stream response hai
    const { query } = req.body
    console.log("query ", query);

    res.setHeader('Content-Type', 'text/event-stream')

    const response = await agent.stream({
        messages: [
            {
                role: "human",
                content: query
            }
        ]
    },
        {
            // todo: generate thread_id dynamically in future
            configurable: { thread_id: "1" },
            streamMode: "messages"
        }
    )

    for await (const chunk of response) {

        const text = chunk[0].content
        console.log(text);

        let message = { type: "ai", payload: chunk[0].content }

        res.write(`data: ${JSON.stringify(message)}\n\n`)
    }

    res.end()

})

// Server ko port 3000 par start karein
app.listen(3000, () => {
    console.log("Server is running on port 3000");
})