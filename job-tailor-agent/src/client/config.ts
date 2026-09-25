// CONFIG - API key, clients, aur shared state
import dotenv from "dotenv"
import { Groq } from "groq-sdk"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"

dotenv.config()

const GROQ_API_KEY = process.env.GROQ_API_KEY
if (!GROQ_API_KEY) {
    throw new Error("Groq Api key not found! .env check karein")
}

// Groq client (LLM se baat ke liye)
export const groq = new Groq({ apiKey: GROQ_API_KEY })

// MCP client (server se baat ke liye)
export const mcpClient = new Client({
    name: "job-tailor-client",
    version: "1.0.0",
})

// Shared state (poori app mein use hota hai)
export const state = {
    systemContext: "",              // startup par resources load hongi
    conversationHistory: [] as any[], // persistent messages
}