import dotenv from "dotenv"
dotenv.config()
import { ChatGroq } from "@langchain/groq"
import { MemorySaver, MessagesAnnotation, StateGraph } from "@langchain/langgraph"
import { initDB } from "./db.js"
import { addExpense, getExpenses } from "./tool.js"
import { ToolNode } from "@langchain/langgraph/prebuilt"
import type { AIMessage, ToolMessage } from "@langchain/core/messages"

// initialize DB
export const database = initDB('./expenses.db')

const tools = [addExpense, getExpenses]

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
            Call get_expenses tool to get the expenses from DB according to given date.
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

function shouldEnd(state: typeof MessagesAnnotation.State) {
    // const lastMessage = state.messages[state.messages.length - 1] as ToolMessage
    // if (lastMessage.name === "generate_chart") {
    //     return "__end__"
    // }

    return "callModel"
}

const graph = new StateGraph(MessagesAnnotation)
    .addNode('callModel', callModel)
    .addNode('tools', toolNode)
    .addEdge("__start__", "callModel")
    .addConditionalEdges("callModel", shouldContinue, {
        "tools": "tools",
        "__end__": "__end__"
    })
    .addConditionalEdges('tools', shouldEnd, {
        // "__end__": "__end__",
        "callModel": "callModel"
    })

const agent = graph.compile({ checkpointer: new MemorySaver() })

async function main() {
    const response = await agent.invoke({
        messages: [
            {
                role: "human",
                content: "How much I spent this month ?"
            }
        ]
    },
        {
            configurable: { thread_id: "1" }
        }
    )

    console.log(JSON.stringify(response, null, 2));

}

main()