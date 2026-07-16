import dotenv from "dotenv"
dotenv.config()
import { ChatGroq } from "@langchain/groq"
import { MessagesAnnotation } from "@langchain/langgraph"
import { initDB } from "./db.js"
import { addExpense } from "./tool.js"
import { ToolNode } from "@langchain/langgraph/prebuilt"

// initialize DB
export const database = initDB('./expenses.db')

const tools = [addExpense]

// LLM setup
const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY!,
    model: "openai/gpt-oss-120b",
    temperature: 0,
})

// Tool Node
const toolNode = new ToolNode(tools)

// call model node
async function callModel(state: typeof MessagesAnnotation.State) {
    const llmWithTools = llm.bindTools(tools)
    const response = await llmWithTools.invoke([
        {
            role: 'system',
            content: `You are a helpful expense tracking assistant. Current dateTime: ${new Date().toISOString()}
            Call add_expense tool to add expense in DB.
            `
        },
        ...state.messages
    ])

    return {
        messages: [response]
    }

}