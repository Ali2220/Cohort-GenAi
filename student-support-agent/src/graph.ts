import { StateGraph } from '@langchain/langgraph'
import { StateAnnotation } from './state.js'
import { model } from './model.js'
import { ToolNode } from "@langchain/langgraph/prebuilt"
import { getOffers, retrieve_data } from './tools.js'
import type { AIMessage } from '@langchain/core/messages'

// TOOLS CONFIGURATION 
// Marketing Tools
const marketingTools = [getOffers]
const marketingToolNode = new ToolNode(marketingTools)

// Learning Tools
const learningTools = [retrieve_data]
const learningToolNode = new ToolNode(learningTools)

// NODE 1: FRONT DESK SUPPORT
async function frontDeskSupport(state: typeof StateAnnotation.State) {
    console.log("🛎️ Front Desk Support Node Triggered!");

    // Guidelines jo model ko batati hain ke kab baat khud karni hai aur kab transfer karni hai.
    const SYSTEM_PROMPT = `You are a frontline support staff for Systems Limited, an Ed-tech company that helps software developers excel in their careers through practical web development and Generative AI courses.

Guidelines:
- Be concise and professional in your responses.
- You can chat with students and help them with basic/general questions (like greetings or general info).
- If the student has a MARKETING query (promo codes, discounts, offers, and special campaigns, etc), DO NOT answer directly. Ask the user to hold for a moment while you transfer them to Marketing Team.
- If the student has a LEARNING support query (courses, syllabus coverage, learning paths, and study strategies, etc), DO NOT answer directly. Ask the user to hold for a moment while you transfer them to Learning support Team.`


    const supportResponse = await model.invoke([
        {
            role: "system",
            content: SYSTEM_PROMPT
        },
        ...state.messages // Purani sari history
    ])

    // Router Agent ka System Prompt (Jo sirf backend par routing ka faisla karega)
    const CATEGORIZATION_SYSTEM_PROMPT = `You are an expert customer support routing system.
    Your job is to detect whether a customer support representative is routing a user to a marketing team or learning support team, or if they are just responding conversationally.`

    // Router ko instructions di ja rahi hain ke JSON output generate kare
    const CATEGORIZATION_HUMAN_PROMPT = `The previous conversation is an interaction between a customer support representative and a user. Extract, whether the representative is routing the user to a marketing team or learning support team, or whether they are just responding occasionally.
    Responding with a JSON object containing a single key called "nextRepresentative" with one of the following values:

    If they want to route the user to the marketing team, respond with "MARKETING".
    If they want to route the user to the learning support team, respond with "LEARNING".
    Otherwise, respond only with the word "RESPOND"`

    /**
     * Second Model Call: Faisla karne ke liye ke aage kahan jana hai.
     * * @variable categorizationResponse (AIMessage Object containing JSON string)
     * Example Structure:
     * AIMessage {
     * content: '{"nextRepresentative": "MARKETING"}',
     * response_metadata: { ... }
     * }
     */
    const categorizationResponse = await model.invoke([
        {
            role: 'system',
            content: CATEGORIZATION_SYSTEM_PROMPT
        },
        ...state.messages,
        supportResponse, // Frontdesk ka naya reply bhi pass kiya taake router dekh sake ke kya transfer ka bola gaya hai
        {
            role: 'human',
            content: CATEGORIZATION_HUMAN_PROMPT
        }
    ],
        {
            response_format: {
                type: 'json_object' // Model ko force kiya ke sirf valid JSON de
            }
        }
    )

    /**
     * JSON string ko JavaScript Object mein convert kiya.
     * * @variable categorizationOutput (JS Object)
     * Example Structure:
     * { nextRepresentative: "MARKETING" }
     */
    const categorizationOutput = JSON.parse(categorizationResponse.content as string)

    /**
     * LangGraph State Update:
     * messages array mein 'supportResponse' append ho jayega.
     * nextRepresentative property mein string ('MARKETING', 'LEARNING', ya 'RESPOND') save ho jayegi.
     */
    return {
        messages: [supportResponse],
        nextRepresentative: categorizationOutput.nextRepresentative
    }
}


// NODE 2: MARKETING SUPPORT (WITH TOOLS)
async function marketingSupport(state: typeof StateAnnotation.State) {
    console.log("🚀 Marketing Team Support Node Activated!");

    // Model ke sath marketing tools ko bind kar diya taake model tool calling kar sake
    const llmWithTools = model.bindTools(marketingTools)

    const systemPrompt = `You are an enthusiastic Marketing Support Specialist for Systems Limited (Web Dev & Gen AI courses). Your job is to assist students with fees, discounts, promos, and installments.

Rules:
- Tool Usage: Always use tools to fetch live data for any price or discount query. Never guess or hallucinate codes.
- Grounded Answers: Base your response strictly on retrieved tool data. If tools lack information, politely transfer to a human representative.
- Tone & Style: Be persuasive, energetic, and natural. Never mention tools, databases, or background searches to the user; just deliver the facts smoothly.`

    /**
     * ⚠️ IMPORTANT TRIMMING LOGIC:
     * Front desk ne kaha tha: "Please hold while I transfer you..." 
     * Agar marketing agent ko wo message bhi bhej diya jaye, to marketing agent confuse ho sakta hai 
     * ya sochega ke jawab to pehle hi mil chuka hai. Isliye hum aakhri AI message (Frontdesk ka reply) 
     * history se temporarily delete/slice kar dete hain taake Marketing Agent sirf user ka asal sawal dekhe.
     */
    let trimmedHistory = state.messages

    // Agar aakhri message AI ka hai (jo ke Front Desk ka tha), to usay hata do
    if (trimmedHistory.at(-1)?.getType() === 'ai') {
        trimmedHistory = trimmedHistory.slice(0, -1)
    }

    /**
     * Marketing Agent ki LLM Call.
     * * @variable marketingResponse (AIMessage Object)
     * * 🌟 Case A (Agar model ko tool chalana hai):
     * AIMessage {
     * content: "",
     * tool_calls: [
     * {
     * name: "getOffers",
     * args: {},
     * id: "call_abc123"
     * }
     * ]
     * }
     * * 🌟 Case B (Agar model ke paas tool ka data aa chuka hai aur wo final jawab de raha hai):
     * AIMessage {
     * content: "Great news! We have an active sale. Use code SUMMER-CODE-20 for 20% off!",
     * tool_calls: []
     * }
     */
    const marketingResponse = await llmWithTools.invoke([
        {
            role: 'system',
            content: systemPrompt
        },
        ...trimmedHistory // Sirf user ka sawal aur pichli genuine history jayegi
    ])

    // State mein marketing agent ka response save karwa diya (chahe wo tool call ho ya text message)
    return {
        messages: [marketingResponse]
    }
}


// NODE 3: LEARNING SUPPORT
async function learningSupport(state: typeof StateAnnotation.State) {
    console.log("🧠 Learning Team Support Node Activated!");
    const SYSTEM_PROMPT = `You are an expert Learning Support Assistant. Your primary goal is to help users understand complex concepts, answer their queries, and provide accurate learning materials.

To fulfill your role, you have access to the 'retrieve_data' tool. Follow these strict operational guidelines:

1. TOOL USAGE LIMIT: If the user's query requires external knowledge, call the 'retrieve_data' tool.
2. RELEVANCY CHECK & RETRIES: 
   - Evaluate the tool's output carefully.
   - If the data returned by 'retrieve_data' is NOT relevant to the user's query, you may refine your search parameters and try again.
   - MAXIMUM LIMIT: You are strictly allowed to call the 'retrieve_data' tool a MAXIMUM OF 3 TIMES if the results keep coming up irrelevant.
3. FALLBACK: If after 3 attempts you still cannot find relevant data, DO NOT call the tool again. Instead, politely inform the user that you couldn't retrieve the exact data, and answer their query to the best of your existing knowledge or guide them on next steps.

Tone: Keep your responses highly encouraging, clear, educational, and structured for easy learning.`

    let trimmedHistory = state.messages

    if (trimmedHistory.at(-1)?.getType() === 'ai') {
        trimmedHistory = trimmedHistory.slice(0, -1)
    }

    const llmWithTools = model.bindTools(learningTools)

    const learningResponse = await llmWithTools.invoke([
        {
            role: 'system',
            content: SYSTEM_PROMPT
        },
        ...trimmedHistory
    ])

    return {
        messages: [learningResponse]
    }
}


// CONDITIONAL ROUTING FUNCTIONS
/**
 * Front Desk ke baad yeh function faisla karta hai ke kis department ke pass jana hai.
 * Based on: state.nextRepresentative
 */
function routingFunction(state: typeof StateAnnotation.State) {
    if (state.nextRepresentative.includes("MARKETING")) {
        return 'marketingSupport' // Marketing node par bhej do
    } else if (state.nextRepresentative.includes("LEARNING")) {
        return 'learningSupport'  // Learning node par bhej do
    } else {
        return "__end__"          // Baat khatam, chat end kar do
    }
}

/**
 * Marketing Node ke baad yeh function check karta hai ke kya LLM ne tool call generate ki hai?
 * Based on: state.messages ka sab se aakhri message
 */
function isMarketingToolNext(state: typeof StateAnnotation.State) {
    // Sab se aakhri message nikal kar as AIMessage cast kiya
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage

    // Agar last message ke andar 'tool_calls' array mojud hai aur khali nahi hai
    if (lastMessage.tool_calls?.length) {
        console.log("🎯 Model wants to call a tool. Redirecting to ToolNode!");
        return 'marketingTools' // Graph ko ToolNode ('marketingTools') par bhej do
    } else {
        console.log("💬 Model generated a final text response. Ending flow!");
        return '__end__'        // Agar koi tool call nahi hai, to jawab mukammal hai -> End graph
    }
}

function isLearningToolNext(state: typeof StateAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage

    if (lastMessage.tool_calls?.length) {
        return 'learningTools'
    }

    return '__end__'
}

// Building Graph
const graph = new StateGraph(StateAnnotation)
    // Nodes Registered
    .addNode('frontDeskSupport', frontDeskSupport)
    .addNode('marketingSupport', marketingSupport)
    .addNode('learningSupport', learningSupport)
    .addNode('marketingTools', marketingToolNode) // Tool execution node
    .addNode('learningTools', learningToolNode)
    // Step 1: Start hamesha Front Desk se hoga
    .addEdge('__start__', 'frontDeskSupport')

    // Step 2: Front Desk ke baad Router chalega (Conditional Edge)
    .addConditionalEdges('frontDeskSupport', routingFunction, {
        marketingSupport: 'marketingSupport',
        learningSupport: "learningSupport",
        "__end__": "__end__"
    })

    // Step 3: Marketing Node chalne ke baad check hoga ke Tool chalana hai ya End karna hai
    .addConditionalEdges('marketingSupport', isMarketingToolNext, {
        marketingTools: 'marketingTools', // Agar tool chalana hai to 'marketingTools' node par bhejo
        __end__: '__end__'               // Agar normal message hai to chat end kar do
    })

    .addConditionalEdges('learningSupport', isLearningToolNext, {
        'learningTools': 'learningTools',
        '__end__': '__end__'
    })

    .addEdge('learningTools', 'learningSupport')

    // Step 4: Tool chalne ke baad wapas Marketing Node par bhejo taake LLM tool ka output parh sake! (Loop)
    .addEdge('marketingTools', 'marketingSupport')

// Graph compile ho kar execution ke liye tayar hai
const app = graph.compile()


//  MAIN EXECUTION (RUNNING THE GRAPH)
async function main() {
    // User ka coupon/discount ka input bhej kar graph stream start ki
    const stream = await app.stream({
        messages: [
            {
                role: 'human',
                content: 'In which language gen-ai course is taught ?'
            }
        ]
    });

    /**
     * Stream ka Loop: Har node jab apna kaam khatam karega, uska output screen par print hoga.
     * * @variable value (Object)
     * Example of chunk printed in loop:
     * {
     * frontDeskSupport: {
     * messages: [ AIMessage { content: 'Please hold...' } ],
     * nextRepresentative: 'MARKETING'
     * }
     * }
     */
    for await (const value of stream) {
        console.log("----Steps----");
        console.log(value);
        console.log("----Steps----");
    }
}

main()