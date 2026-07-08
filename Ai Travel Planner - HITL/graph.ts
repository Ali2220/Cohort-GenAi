import dotenv from "dotenv"
dotenv.config()
import { ChatGroq } from "@langchain/groq"
import { Annotation, interrupt, MessagesAnnotation, START, StateGraph } from "@langchain/langgraph"
import { AIMessage, HumanMessage, tool } from "langchain"
import { TavilySearch } from "@langchain/tavily"
import z from 'zod'
import { ToolNode } from "@langchain/langgraph/prebuilt"

// 1. LLM Model Setup: Groq API ka use karke Llama 3 model initialize kar rahe hain
const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY!,
    model: "llama-3.3-70b-versatile",
    temperature: 0.4, // Output ko thoda focused rakhne ke liye lower temperature
})

// 2. Tool Setup: Tavily Search tool banaya hai taake internet se real-time data nikal sakein
const tavilySearch = tool(
    async ({ query }) => {
        const tavilySearch = new TavilySearch({
            tavilyApiKey: process.env.TAVILY_API_KEY
        })
        return await tavilySearch._call({ query })
    },
    {
        name: 'tavily_search',
        description: 'Search web for real travel prices, hotels, flights, food costs',
        schema: z.object({ query: z.string() }) // Zod schema define karta hai ke tool ko 'query' string chahiye
    }
)

// 3. State Definition: Graph ki memory/state ka structure define kiya hai
const State = Annotation.Root({
    ...MessagesAnnotation.spec, // Chat history (messages array) ke liye
    destination: Annotation<string>(), // User kahan jana chahta hai
    days: Annotation<string>(), // Kitne din ka trip hai
    itinerary: Annotation<string>(), // AI jo plan banayega wo yahan save hoga
    humanDecision: Annotation<string>(), // User ka HITL response (yes/no)
    next: Annotation<string>() // Supervisor node ko batane ke liye ke agla step kya hai
})

// 4. Research Node: Ye node AI model ko call karta hai aur internet search karke itinerary banata hai
async function researchNode(state: typeof State.State) {
    const tools = [tavilySearch]
    const toolNode = new ToolNode(tools) // Tools ko graph node mein convert kiya
    const llmWithTools = model.bindTools(tools) // LLM ko bataya ke uske paas ye tools available hain

    // Safest way to get the user's prompt: Array mein aakhir se pehla 'human' message dhund rahe hain
    const lastHumanMsg = state.messages.findLast(
        (m) => m._getType() === "human" || (m as any).role === "human"
    );
    const userMessage = lastHumanMsg?.content || "";

    // AI ko strict instruction di ja rahi hai
    const prompt = `You are an expert travel planner. Look at the user request: "${userMessage}".
Extract the destination and number of days. If days are not mentioned, assume 3 days.
Use tavily_search to find real hotel prices, flight costs, and food budget for that specific place.
Then create a clear day-by-day itinerary with a total estimated budget.`;

    // Pehle AI ko prompt bheja
    const res = await llmWithTools.invoke([
        new HumanMessage(prompt)
    ])

    // Agar AI ne decide kiya ke use search tool use karna hai
    if (res.tool_calls?.length) {
        // Tool run karo (internet search)
        const toolRes = await toolNode.invoke({ messages: [res] })

        // Tool ke result aur pichli baaton ko milakar final answer generate karo
        const finalResponse = await model.invoke([
            new HumanMessage(prompt),
            res,
            ...toolRes.messages
        ])

        return {
            messages: [finalResponse], // Naya message state mein add karo
            itinerary: finalResponse.content as string // Itinerary ko state mein save karo
        }
    }

    // Agar tool use nahi hua toh direct response return kardo
    return {
        messages: [res],
        itinerary: res.content as string
    }
}

// 5. Human-in-the-Loop Node: Yahan execution pause ho jayegi user ki approval ke liye
async function hitlNode(state: typeof State.State) {
    // interrupt() call graph ko rok deta hai. Resume karne par jo value aayegi wo humanInput mein jayegi
    const humanInput = await interrupt({
        messages: `Trip ready!`,
    })

    return {
        humanDecision: humanInput // User ka input state mein save kar diya (e.g., 'yes' ya 'no')
    }
}

// 6. Action Node: User ke decision ke hisaab se final output generate karta hai
async function actionNode(state: typeof State.State) {
    const decision = state.humanDecision.toLowerCase().trim()

    // Agar user ne yes/y likha hai
    if (decision === "yes" || decision === "y") {
        return {
            messages: [new AIMessage(`✅ Booked! Enjoy your trip!`)]
        }
    }
    // Agar user ne no ya kuch aur likha hai
    return {
        messages: [new AIMessage('❌ Trip cancelled.')]
    }
}

// 7. Supervisor Node: Router ka kaam karta hai. Decide karta hai flow kahan jayega.
async function supervisorNode(state: typeof State.State) {
    if (!state.itinerary) return { next: "research" } // Agar plan nahi bana toh research node par bhejo
    if (!state.humanDecision) return { next: "hitl" } // Agar plan ban gaya hai par user approval nahi mili toh hitl par bhejo
    return { next: 'action' } // Dono kaam ho gaye toh action node par bhejo booking confirm/cancel karne ke liye
}

// 8. Graph Construction: Nodes aur unke beech ka rasta (edges) define kar rahe hain
export const graph = new StateGraph(State)
    .addNode('supervisor', supervisorNode)
    .addNode('research', researchNode)
    .addNode('hitl', hitlNode)
    .addNode('action', actionNode)
    // Execution START se supervisor par jayegi
    .addEdge(START, "supervisor")
    // Supervisor state ko dekh kar in teeno mein se kisi ek par route karega
    .addConditionalEdges("supervisor", (s) => s.next, {
        research: 'research',
        hitl: 'hitl',
        action: 'action',
    })
    // Research aur Hitl apna kaam khatam karke wapas supervisor ke paas jayenge check karne ke liye
    .addEdge("research", "supervisor")
    .addEdge("hitl", "supervisor")
    // Action node ke baad graph end ho jayega
    .addEdge("action", "__end__")