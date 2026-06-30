import dotenv from "dotenv"
dotenv.config()
import { ChatGroq } from "@langchain/groq"

export const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY as string,
    model: "llama-3.3-70b-versatile",
    temperature: 1
})