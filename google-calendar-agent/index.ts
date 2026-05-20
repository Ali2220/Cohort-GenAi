import dotenv from 'dotenv'
dotenv.config()
import { ChatGroq } from '@langchain/groq'
import { createEvent, getEvents } from './tools.js'

const tools: any = [createEvent, getEvents]

const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY as string,
    model: "openai/gpt-oss-120b",
    temperature: 0,
}).bindTools(tools)


