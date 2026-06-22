import dotenv from 'dotenv'
dotenv.config()
import { ChatGroq } from "@langchain/groq"

export const model = new ChatGroq({
    model: "openai/gpt-oss-20b",
    apiKey: process.env.GROQ_API_KEY as string,
    temperature: 0
})