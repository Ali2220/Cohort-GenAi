import express from 'express'
import cors from "cors"

// Express application initialize kar rahe hain
const app = express()

app.use(express.json())
app.use(cors())

// SSE Endpoint (Server-Sent Events)
app.post("/chat", (req, res) => {
    // ----------------------------------------------------
    // STEP 1: SSE Ke Zaroori Headers Set Karein
    // ----------------------------------------------------
    // Browser ko batayein ke yeh ek stream response hai
    const { query } = req.body
    console.log("query ", query);

    res.setHeader('Content-Type', 'text/event-stream')

    // ----------------------------------------------------
    // STEP 2: Client Ko Data Stream Karna (Periodic Push)
    // ----------------------------------------------------
    // Har 1 second (1000ms) baad data client ko push hoga
    const intervalId = setInterval(() => {
        // SSE Rule 1: Custom event name ("event: <name>\n")
        res.write("event: cgPing\n")

        // SSE Rule 2: Message payload ("data: <content>\n\n")
        // Double newline (\n\n) batata hai ke ek message packet complete ho gaya hai
        res.write(`data: ${query}\n\n`)
    }, 1000)

})

// Server ko port 3000 par start karein
app.listen(3000, () => {
    console.log("Server is running on port 3000");
})