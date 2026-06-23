import dotenv from 'dotenv'
dotenv.config()
import type { graphState, QuestionAnswer } from "./state.js";
import { TavilySearch } from "@langchain/tavily"
import { HumanMessage, type AIMessage } from '@langchain/core/messages';

// Tavily search instance configuration (Har single query par max 2 links layega)
const tavilySearch = new TavilySearch({
    maxResults: 2,
    tavilyApiKey: process.env.TAVILY_API_KEY!
})

// ==========================================
// 🔍 NODE: SEARCH EXECUTOR
// ==========================================
export async function searchExecutor(state: typeof graphState.State) {

    // 1️⃣ lastMessage: State ki history se sab se aakhri message nikalta hai.
    // Yeh hamare 'responder' node ka structured output hota hai jo string format mein hota hai.
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage
    // 📂 Kaisa dikhta hai:
    // lastMessage = AIMessage {
    //   content: '{"answer": "...", "reflection": {...}, "searchQueries": ["query1", "query2"]}'
    // }

    // 2️⃣ parsed: Raw string JSON ko JavaScript Object mein convert karta hai.
    // Iske andar ab humein typed access mil jata hai (answer, reflection, searchQueries).
    const parsed = JSON.parse(lastMessage.content as string) as QuestionAnswer
    // 📂 Kaisa dikhta hai:
    // parsed = {
    //   answer: "Quantum computing uses qubits...",
    //   reflection: { missing: "Needs details on Shor's algorithm.", superfluous: "Remove introductory history." },
    //   searchQueries: ["Shor's algorithm quantum computing", "latest quantum processors 2026"]
    // }

    // 3️⃣ searchResult: Tavily API ko batched arrays bhej kar parallel search results lata hai.
    // TypeScript overloads ka issue bypass karne ke liye 'as any' use kiya gaya hai.
    const searchResult = await tavilySearch.batch(
        parsed.searchQueries.map((query) => ({ query })) as any
    )
    // 📂 Kaisa dikhta hai (Tavily ka raw output array):
    // searchResult = [
    //   { 
    //     results: [
    //       { title: "Shor's Guide", url: "https://site1.com", content: "Shor's algorithm factors integers..." },
    //       { title: "Quantum Math", url: "https://site2.com", content: "Discovered by Peter Shor..." }
    //     ] 
    //   },
    //   { 
    //     results: [
    //       { title: "IBM 2026 Chips", url: "https://site3.com", content: "IBM reveals 2000 qubit processor..." }
    //     ] 
    //   }
    // ]

    // 4️⃣ cleanResults: Ek khali array jismein hum faltu keys filter out kar ke sirf kaam ka data save karenge.
    const cleanResults = []

    // 5️⃣ Nested Loops: Har query aur uske corresponding search results ko mix kar ke clean array banana.
    for (let i = 0; i < parsed.searchQueries.length; i++) {
        const query = parsed.searchQueries[i] // Current loop ki specific string query
        const searchOutput = searchResult[i]  // Us specific query ka Tavily se aaya hua array object

        // Safe check: Agar kisi query ka result na aaye toh crash na ho, khali array mil jaye
        const results = searchOutput?.results || []

        // Har webpage result mein se sirf 'content' aur 'url' nikal kar map karna
        for (const result of results) {
            cleanResults.push({
                query: query,
                content: result.content || "",
                url: result.url || ""
            })
        }
    }
    // 📂 Loops ke baad cleanResults kaisa dikhta hai:
    // cleanResults = [
    //   { query: "Shor's algorithm quantum computing", content: "Shor's algorithm factors integers...", url: "https://site1.com" },
    //   { query: "Shor's algorithm quantum computing", content: "Discovered by Peter Shor...", url: "https://site2.com" },
    //   { query: "latest quantum processors 2026", content: "IBM reveals 2000 qubit processor...", url: "https://site3.com" }
    // ]

    // 6️⃣ Return Statement: Extracted data ko stringify kar ke HumanMessage ke tor par return karna.
    // Yeh graph state ke 'messages' channel mein append ho jayega taake 'revisor' node ise parh sake.
    return {
        messages: [new HumanMessage(JSON.stringify({ searchResults: cleanResults }))]
    }
    // 📂 Final state addition kaisa dikhta hai:
    // messages: [
    //   HumanMessage { content: '{"searchResults": [{"query": "...", "content": "...", "url": "..."}]}' }
    // ]
}