import dotenv from "dotenv"
dotenv.config()
import { ChatGroq } from "@langchain/groq"
import { MemorySaver, MessagesAnnotation, StateGraph } from "@langchain/langgraph"
import { initDB } from "./db.js"
import { addExpense, getExpenses, generateChart } from "./tool.js"
import { ToolNode } from "@langchain/langgraph/prebuilt"
import type { AIMessage, ToolMessage } from "@langchain/core/messages"

// initialize DB
export const database = initDB('./expenses.db')

const tools = [addExpense, getExpenses, generateChart]

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
            content: `You are an expert AI Expense Tracking Assistant. Your job is to manage expenses and analyze spending data using tools.

Current DateTime: ${new Date().toISOString()}

--- TOOL SELECTION GUIDELINES ---

1. 'add_expense':
   - Call this tool when the user wants to log, add, or record a new expense.
   - Extract title and amount accurately. If date is not provided, assume today's date in YYYY-MM-DD format.

2. 'get_expenses':
   - Call this tool when the user asks to see, list, query, or check their expenses in TEXT format for a specific date range.
   - Do NOT call this tool if the user explicitly asks for charts, graphs, or visual trends.

3. 'generate_chart':
   - Call this tool ONLY when the user explicitly requests a chart, graph, visualization, or visual breakdown (e.g., "visualize", "show graph", "chart my spending").
   - You MUST extract:
     - 'from': Start date (YYYY-MM-DD)
     - 'to': End date (YYYY-MM-DD)
     - 'groupBy': Choose strictly between 'date', 'week', or 'month'.
       * 'date' -> For short ranges (e.g., <= 14 days or daily breakdown)
       * 'week' -> For medium ranges (e.g., 1-2 months or weekly breakdown)
       * 'month' -> For long ranges (e.g., 3+ months, yearly analysis)

--- DATE CALCULATION RULES ---
- Always calculate relative time queries based on 'Current DateTime' above.
- Example: If current date is 2026-07-23:
  * "this month" -> from: '2026-07-01', to: '2026-07-31'
  * "last month" -> from: '2026-06-01', to: '2026-06-30'
  * "last 7 days" -> calculate exact date 7 days prior to today.
- All date arguments passed to tools MUST strictly be in 'YYYY-MM-DD' format.

Be concise, accurate, and always select the correct tool based on user intent.`
        },
        ...state.messages
    ]);

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
    const lastMessage = state.messages[state.messages.length - 1] as ToolMessage

    const message = JSON.parse(lastMessage.content as string)

    if (message.type === "chart") {
        return "__end__"
    }

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
        "__end__": "__end__",
        "callModel": "callModel"
    })

export const agent = graph.compile({ checkpointer: new MemorySaver() })

// async function main() {
//     const response = await agent.stream({
//         messages: [
//             {
//                 role: "human",
//                 content: "show me a chart of my expenses for the last 3 months, grouped by month"
//             }
//         ]
//     },
//         {
//             configurable: { thread_id: "1" },
//             streamMode: "messages"
//         }
//     )

//     for await (const [messageChunk] of response) {
//         const text = messageChunk.content

//         if (text) {
//             process.stdout.write(text as string)
//         }
//     }

// }

// main()