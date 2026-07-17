import dotenv from "dotenv"
dotenv.config()
import { ChatGroq } from "@langchain/groq"
import { MemorySaver, MessagesAnnotation, StateGraph } from "@langchain/langgraph"
import { initDB } from "./db.js"
import { addExpense } from "./tool.js"
import { ToolNode } from "@langchain/langgraph/prebuilt"
import type { AIMessage } from "@langchain/core/messages"

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

function shouldContinue(state: typeof MessagesAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage
    if (lastMessage?.tool_calls && lastMessage?.tool_calls.length) {
        return 'tools'
    }

    return "__end__"
}

const graph = new StateGraph(MessagesAnnotation)
    .addNode('callModel', callModel)
    .addNode('tools', toolNode)
    .addEdge("__start__", "callModel")
    .addConditionalEdges("callModel", shouldContinue, {
        "tools": "tools",
        "__end__": "__end__"
    })

const agent = graph.compile({ checkpointer: new MemorySaver() })

async function main() {
    const response = await agent.invoke({
        messages: [
            {
                role: "human",
                content: "add 3000 rs in my expense. I have bought grippers to play futsol."
            }
        ]
    },
    {
        configurable: {thread_id: "1"}
    }
)

    console.log(JSON.stringify(response));
    
}

main()