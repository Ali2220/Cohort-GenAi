import dotenv from "dotenv"
dotenv.config()
import { ChatGroq } from "@langchain/groq"
import { MessagesAnnotation } from "@langchain/langgraph"
import { initDB } from "./db.js"

// initialize DB
const database = initDB('./expenses.db')

// LLM setup
const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY!,
    model: "openai/gpt-oss-120b",
    temperature: 0,
})

// call model node
async function callModel(state: typeof MessagesAnnotation.State) {
    const response = await llm.invoke([
        {
            role: 'human',
            content: "You are an ai assistant that decides...."
        },
        ...state.messages
    ])


}