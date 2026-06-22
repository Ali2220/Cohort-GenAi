import dotenv from 'dotenv'
dotenv.config()
import { ChatGroq } from "@langchain/groq"

export const model = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    apiKey: process.env.GROQ_API_KEY as string,
    temperature: 0
})