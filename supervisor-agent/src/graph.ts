import { END, START, StateGraph } from "@langchain/langgraph"
import { model } from "./model.ts"
import { State } from "./state.ts"
import { calendarAgent } from "./agents/calendarAgent.ts"
import { emailAgent } from "./agents/emailAgent.ts"

async function supervisor(state: typeof State.State) {
    const SYSTEM_PROMPT = `You are a personal assistant supervisor coordinating two specialist agents:
1. calendarAgent — Handles scheduling, meetings, and checking availability.
2. emailAgent — Handles composing and sending professional emails.

Analyze the conversation history carefully:
- If the user wants to schedule something and it hasn't been done yet, call "calendarAgent".
- If the user wants to send an email and it hasn't been done yet, call "emailAgent".
- If an agent has already executed and fulfilled its part, check if the other agent is needed.
- If ALL tasks requested by the user are fully completed, respond with "FINISH".

Respond with ONLY a JSON object:
{
    "nextAgent": "calendarAgent" | "emailAgent" | "FINISH",
    "reasoning": "Brief explanation of your decision"
}`

    const response = await model.invoke([
        {
            role: 'system',
            content: SYSTEM_PROMPT
        },
        ...state.messages,
    ])

    let decision: any
    try {
        const content = response.content as string
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        decision = JSON.parse(jsonMatch ? jsonMatch[0] : '{}')
    } catch {
        decision = { nextAgent: "FINISH" }
    }

    if (decision.nextAgent === "FINISH") {
        const summaryPrompt = `You are a polite personal assistant. Summarize the actions that have been successfully completed in a friendly closing message to the user based on the history. Do not call any tools.`;

        const finalResponse = await model.invoke([
            {
                role: "system",
                content: summaryPrompt
            },
            ...state.messages
        ])

        return {
            nextAgent: "FINISH",
            messages: [finalResponse]
        }
    }

    return {
        nextAgent: decision.nextAgent,
    }
}

function routeAgent(state: typeof State.State) {
    return state.nextAgent
}

export const graph = new StateGraph(State)
    .addNode('supervisor', supervisor)
    .addNode('calendarAgent', calendarAgent)
    .addNode('emailAgent', emailAgent)

    .addEdge(START, "supervisor")
    .addConditionalEdges("supervisor", routeAgent, {
        FINISH: END,
        calendarAgent: "calendarAgent",
        emailAgent: "emailAgent"
    })
    .addEdge("calendarAgent", "supervisor")
    .addEdge("emailAgent", "supervisor")