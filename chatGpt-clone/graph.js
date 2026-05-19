import dotenv from 'dotenv'
dotenv.config()

// Raw groq-sdk ki jagah LangChain ka wrapper use karein taake ToolNode ke sath compatibility rahe
import { ChatGroq } from '@langchain/groq'
import { TavilySearch } from "@langchain/tavily";
import { StateGraph, MemorySaver, START, END, MessagesAnnotation } from '@langchain/langgraph'
import { ToolNode } from "@langchain/langgraph/prebuilt"

// 1. Models & Tools Setup
const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.3-70b-versatile",
    temperature: 0
})

const memory = new MemorySaver()

// LangChain ka apna Tavily tool use karein (Yeh automatically sahi format mein tool banata hai)
const searchTool = new TavilySearch({
    apiKey: process.env.TAVILY_API_KEY,
    maxResults: 3
})

// Model ko tools assign karna
const modelWithTools = model.bindTools([searchTool])

// 2. Nodes Setup
async function agentNode(state) {
    // FIX: Single quotes ki jagah Backticks (`) use kiye hain
    const systemPrompt = {
        role: 'system',
        content: `You are a smart personal assistant. Current date: ${new Date().toUTCString()}`
    }

    const response = await modelWithTools.invoke([systemPrompt, ...state.messages])
    return { messages: [response] }
}

const toolNode = new ToolNode([searchTool])

// FIX: 'state' parameter add kiya gaya hai
function shouldContinue(state) {
    const lastMessage = state.messages[state.messages.length - 1]

    if (lastMessage.tool_calls?.length > 0) {
        return "tools"
    }
    return "__end__"
}

// 3. Graph Building
const workflow = new StateGraph(MessagesAnnotation)
    .addNode('agent', agentNode)
    .addNode('tool', toolNode)

    .addEdge(START, 'agent')
    .addConditionalEdges('agent', shouldContinue, {
        "tools": "tool",
        "__end__": END
    })
    .addEdge("tool", "agent")

const app = workflow.compile({ checkpointer: memory })

// 4. Export Function
export async function generate(userMessage) {
    const finalResult = await app.invoke(
        {
            messages: [{ role: 'human', content: userMessage }]
        },
        {
            // FIX: threadId ko thread_id kar diya gaya hai
            configurable: { thread_id: 'user-123' }
        }
    )

    return finalResult.messages[finalResult.messages.length - 1].content
}