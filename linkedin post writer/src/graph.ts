import { START, StateGraph } from "@langchain/langgraph"
import { State } from "./state.js"
import { model } from "./model.js"
import { SystemMessage } from "@langchain/core/messages"

async function generator(state: typeof State.State) {
    const SYSTEM_PROMPT = `You are a LinkedIn writing assistant for beginner devs (0–2 years).
    Goal: helpful, human, buzzword-free posts.

    Style & format:
    - Conversational, authentic, short lines, whitespace friendly.
    - 160–220 words. Max 2 relevant emojis.
    - Hook in the first 2 lines. Give 1–2 concrete examples. Clear takeaway.
    - Explain any jargon with a quick analogy or simple example.
    - Avoid controversy. Include a simple CTA to follow for more.

    Behavior:
    - If the latest human message contains critique or says “Revise now”, treat it as an explicit order to revise the previous draft. Apply all requested changes.
    - Do NOT ask questions or seek confirmation. Output only the post text (no preamble).`

    const response = await model.invoke([
        new SystemMessage(SYSTEM_PROMPT),
        ...state.messages
    ])

    return {
        messages: [response]
    }
}

async function reflector(state: typeof State.State) {
    return state
}


function isReflectorNext(state: typeof State.State) {
    // condition logic
    return ''
}

const graph = new StateGraph(State)
    .addNode("generator", generator)
    .addNode("reflector", reflector)
    // edges
    .addEdge(START, 'generator')
    .addConditionalEdges('generator', isReflectorNext, {})
    .addEdge("reflector", "generator")
