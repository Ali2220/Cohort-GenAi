import { START, StateGraph } from "@langchain/langgraph"
import { State } from "./state.js"
import { model } from "./model.js"
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages"

// NODE 1: GENERATOR (The AI Writer)
// Is function ka kaam pehla draft likhna ya Reflector ke feedback ki base par purane draft ko revise karna hai.
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

    // Model ko system prompt aur state ki poori message history pass ki ja rahi hai
    const response = await model.invoke([
        new SystemMessage(SYSTEM_PROMPT),
        ...state.messages
    ])

    // State update: Naya draft AIMessage ke tor par array mein add ho jayega
    return {
        messages: [response],
    }
}

// NODE 2: REFLECTOR
// Yeh function Generator ke likhe hue draft ko check karta hai aur galtiyan nikalta hai.
async function reflector(state: typeof State.State) {
    const SYSTEM_PROMPT = `You are a LinkedIn post critique. Your task is to give feedback on the previously generated post by the writer agent.

Check against:
1) Strong hook in 1–2 lines
2) Beginner-friendly clarity; explain jargon with analogy/example
3) Specific insights and concrete examples (not generic advice)
4) Skimmable formatting (short lines, whitespace)
5) Clear CTA to follow for more
6) 160–220 words, no emojis, authentic tone, no buzzwords, no controversy

Output format:
- If the post is absolutely perfect and needs no changes, output exactly one word: PASSED
- Otherwise, start with exactly: "Revise now. Apply ALL changes below. Output only the revised post text."
  Then list ONLY bullet-point FIXES. Do NOT write the post yourself.`

    // Message history ko reverse kar ke sab se aakhri AIMessage (Generator ka draft) nikal rahe hain
    const lastAiMessage = [...state.messages].reverse().find(m => m.getType() === 'ai')

    // Reflector sirf System rules aur us specific draft ko parh kar review dega
    const response = await model.invoke([
        new SystemMessage(SYSTEM_PROMPT),
        lastAiMessage as AIMessage
    ])

    console.log("Reflector Agent Result: ", response.content);

    // State update: Reflector ka jawab HumanMessage ke tor par save hoga taake Generator isay user ki instruction samjhe.
    // Sath hi revision counter +1 ho jayega.
    return {
        messages: [new HumanMessage(response.content as string)],
        revisions: state.revisions + 1
    }
}

// CONDITIONAL LOGIC
// Yeh function Reflector ke baad decide karta hai ke ab flow kahan jayega.
function shouldContinue(state: typeof State.State) {
    // Sab se aakhri message uthate hain (Jo Reflector ne abhi produce kiya hai)
    const lastMessage = state.messages[state.messages.length - 1]
    const lastContent = String(lastMessage?.content).trim()

    // Condition 1: Agar Reflector ne draft approve kar diya hai (Early Exit)
    if (lastContent === "PASSED") {
        console.log("✅ Critique Approved! Post is perfect.");
        return "__end__"
    }

    // Condition 2: Agar 5 attempts pure ho gaye hain toh mazeed API calls rok do (Infinite Loop Prevention)
    if (state.revisions >= 5) {
        console.log("⚠️ Max revisions reached (5/5). Stopping execution.");
        return "__end__"
    }

    // Condition 3: Agar draft fail hua aur attempts baki hain, toh dobara Generator par bhejo
    return 'generator'
}


// GRAPH CONSTRUCTION
export const graph = new StateGraph(State)
    .addNode("generator", generator)
    .addNode("reflector", reflector)

    // Step 1: User ki query milne ke baad seedha Generator ke paas jao
    .addEdge(START, 'generator')

    // Step 2: Generator apna draft laazmi Reflector ko dega evaluate karne ke liye
    .addEdge("generator", "reflector")

    // Step 3: Reflector check karne ke baad router function ke paas bhejega decision lene ke liye
    .addConditionalEdges('reflector', shouldContinue, {
        "__end__": "__end__",      // Flow rok do
        "generator": "generator"   // Wapas rewrite karne bhejo
    })