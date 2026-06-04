import { StateGraph } from '@langchain/langgraph'
import { StateAnnotation } from './state.js'
import { model } from './model.js'
import { json } from 'node:stream/consumers'

/**
 * Front Desk Support Node Function
 * Yeh function student ke sawal ka jawab bhi deta hai aur background mein 
 * faisla bhi karta hai ke baat ko kisi aur department mein transfer karna hai ya nahi.
 */
async function frontDeskSupport(state: typeof StateAnnotation.State) {
    
    // 1. Frontdesk Agent ka main system prompt (Guidelines aur Rules)
    const SYSTEM_PROMPT = `You are a frontline support staff for Systems Limited, an Ed-tech company that helps software developers excel in their careers through practical web development and Generative AI courses.

Guidelines:
- Be concise and professional in your responses.
- You can chat with students and help them with basic/general questions (like greetings or general info).
- If the student has a MARKETING query (promo codes, discounts, offers, and special campaigns), DO NOT answer directly. Ask the user to hold for a moment while you transfer them to Marketing Team.
- If the student has a LEARNING support query (courses, syllabus coverage, learning paths, and study strategies), DO NOT answer directly. Ask the user to hold for a moment while you transfer them to Learning support Team.`

    // First Model Call: Student ke liye aam zuban mein reply generate karna
    const supportResponse = await model.invoke([
        {
            role: "system",
            content: SYSTEM_PROMPT
        },
        ...state.messages // Saari purani chat history sath bhej di
    ])

    // 2. Router Agent ka System Prompt (Jo sirf back-end par faisla karega)
    const CATEGORIZATION_SYSTEM_PROMPT = `You are an expert customer support routing system.
    Your job is to detect whether a customer support representative is routing a user to a marketing team or learning support team, or if they are just responding conversationally.
    `

    // Router Agent ke liye Human Instructions (JSON format aur expected values)
    const CATEGORIZATION_HUMAN_PROMPT = `The previous conversation is an interaction between a customer support representative and a user. Extract, whether the representative is routing the user to a marketing team or learning support team, or whether they are just responding occasionally.
    Responding with a JSON object containing a single key called "nextRepresentative" with one of the following values:

    If they want to route the user to the marketing team, respond with "MARKETING".
    If they want to route the user to the learning support team, respond with "LEARNING".
    Otherwise, respond only with the word "RESPOND"
    `

    // Second Model Call: Faisla karne ke liye ke aage kahan jana hai
    const categorizationResponse = await model.invoke([
        {
            role: 'system',
            content: CATEGORIZATION_SYSTEM_PROMPT
        },
        ...state.messages, // Purani chat history 
        
        {
            role: 'human',
            content: CATEGORIZATION_HUMAN_PROMPT
        }
    ],
        {
            // Model ko majboor karna ke wo sirf aur sirf valid JSON return kare
            response_format: {
                type: 'json_object'
            }
        }
    )

    // LLM se aane wali JSON string ko JavaScript Object mein convert karna
    const categorizationOutput = JSON.parse(categorizationResponse.content as string)

    // LangGraph ki State ko update karna (Naya message list mein chala gaya aur decision variable mein)
    return {
        messages: [supportResponse],
        nextRepresentative: categorizationOutput.nextRepresentative
    }
}


async function marketingSupport(state: typeof StateAnnotation.State) {
    return state
}

async function learningSupport(state: typeof StateAnnotation.State) {
    return state
}


// build graph and add nodes
const graph = new StateGraph(StateAnnotation)
    .addNode('frontDeskSupport', frontDeskSupport)
    .addNode('marketingSupport', marketingSupport)
    .addNode('learningSupport', learningSupport)

    // Edges
    .addEdge('__start__', 'frontDeskSupport')
