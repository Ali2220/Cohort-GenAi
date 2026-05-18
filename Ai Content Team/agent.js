import dotenv from 'dotenv'
dotenv.config()
import { Annotation, END, START, StateGraph } from "@langchain/langgraph"
import { ChatGroq } from "@langchain/groq"
import { TavilySearch } from '@langchain/tavily'

// StateGraph ke andar ghoomne wale data ka dhaanacha (structure) tayyar karna
const state = Annotation.Root({
    topic: Annotation({ reducer: (x, y) => y, default: () => "" }),       // Blog ka main topic
    research: Annotation({ reducer: (x, y) => y, default: () => "" }),    // Tavily search se aya raw data
    draft: Annotation({ reducer: (x, y) => y, default: () => "" }),       // Writer ka generate kiya hua text
    feedback: Annotation({ reducer: (x, y) => y, default: () => "" }),    // Editor ki braye / corrections
    status: Annotation({ reducer: (x, y) => y, default: () => "pending" }), // Post ka status: 'pending', 'need revision', ya 'approved'
})

const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.3-70b-versatile",
    temperature: 0.7 
})

// Tavily Search instance jo internet se data nikal kar dega
const search = new TavilySearch({
    maxResults: 2
})


// NODE 1: Researcher
async function researchNode(state) {
    console.log(`[1/3] 🔍 Researching topic: "${state.topic}"...`);
    
    // Tavily tool ko call karke topic search karna
    const searchResult = await search.invoke({ query: state.topic })
    
    // State ki 'research' field ko update karna
    return { research: searchResult }
}

// NODE 2: Writer
async function writerNode(state) {
    console.log(`[2/3] ✍️ Writer is crafting/revising the blog post...`);

    let prompt = `You are an expert blogger. Write a short, engaging 2-paragraph blog post about "${state.topic}". 
    Use this research data: ${state.research}.`

    if (state.feedback && state.status !== "approved") {
        prompt += `\n\nCRITICAL: Your previous draft was rejected. Please fix it based on the editor's feedback: ${state.feedback}`
    }

    const response = await model.invoke(prompt)
    
    // State ki 'draft' field ko naye text se update karna
    return { draft: response.content }
}

// NODE 3: Editor 
async function editorNode(state) {
    console.log(`[3/3] 📝 Editor is reviewing the draft...`);
    
    let prompt = `You are a strict senior editor. Review this blog draft:
    "${state.draft}"
    
    CRITERIA: The blog must be professional, easy to understand, and engaging.
    
    DIRECTIONS:
    1. If the draft is excellent and needs NO changes, reply with exactly one word: APPROVED
    2. If it needs improvements, write a short, clear critique explaining what to fix. (Be specific so the writer can fix it).`

    const response = await model.invoke(prompt)
    const resultText = response.content.trim()

    // Check karna ke kya editor ne "APPROVED" ka lafz istemal kiya hai
    if (resultText.toUpperCase().includes("APPROVED")) {
        console.log(`✅ Editor Approved the draft!`);
        return { status: 'approved', feedback: "All Good!" }
    } else {
        // Agar ghalti nikli to status change karna aur feedback save karna
        return { status: 'need revision', feedback: resultText }
    }
}

// Yeh function tay karta hai ke agla kadam kya hoga
function shouldContinue(state) {
    if (state.status === "approved") {
        return '__end__'
    }
    
    return 'writer'
}

// GRAPH 
const workflow = new StateGraph(state)
    // Nodes
    .addNode("researcher", researchNode)
    .addNode("writer", writerNode)
    .addNode("editor", editorNode)

    // Edges
    .addEdge(START, "researcher")     
    .addEdge("researcher", "writer")  
    .addEdge("writer", "editor")      
    .addConditionalEdges("editor", shouldContinue,
        {
            "__end__": END,      
            "writer": "writer"   
        }
    )

const app = workflow.compile()

async function main() {
    try {
        // Graph ko initialize karna aur chalana
        const finalResult = await app.invoke(
            { topic: "Impact of AI Agents on MERN Stack Developers in 2026" },
            // recursionLimit: 10 ka matlab hai agar 10 steps tak bhi editor approve nahi karta,
            // to infinite loop se bachne ke liye code khud hi ruk jaye.
            { recursionLimit: 15 } 
        )

        console.log("\n==========================================");
        console.log("FINAL APPROVED BLOG POST:");
        console.log("==========================================\n");
        console.log(finalResult.draft); // Final pass shuda content print karna
        
    } catch (error) {
        // LangGraph ka apna recursion limit error handle karna
        if (error.lc_error_code === 'GRAPH_RECURSION_LIMIT') {
            console.log("\n⚠️ Graph stopped: Reached the execution step limit without approval.");
        } else {
            console.error("An unexpected error occurred:", error);
        }
    }
}

main()