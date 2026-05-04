import dotenv from 'dotenv';
dotenv.config(); // .env file se API keys (GROQ aur TAVILY) load karne ke liye
import Groq from 'groq-sdk';
import { tavily } from '@tavily/core';
import NodeCache from 'node-cache';

// --- Initialization ---

// Groq SDK client setup
const client = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Tavily Search API setup
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

// NodeCache setup: Chat history ko RAM mein save rakhne ke liye
// stdTTL: 86400 seconds (24 ghante) tak data rahega
const cache = new NodeCache({ stdTTL: 60 * 60 * 24 });


//  Main function: User ka message aur session ID (threadId) leta hai
//  aur AI se process karwa kar final response deta hai.

export async function generate(userMessage, threadId) {

    // System Prompt: AI ki personality aur rules define karta hai
    const baseMessages = [
        {
            role: "system",
            content: `You are a smart personal assistant.
                    If you know the answer, answer directly.
                    If you don't know or need real-time info, use the webSearch tool.
                    Current date and time: ${new Date().toUTCString()}`
        }
    ];

    // 1. Cache se purani history nikaalein, agar nahi hai to baseMessages (System Prompt) use karein
    const messages = cache.get(threadId) ?? [...baseMessages];

    // 2. User ka naya sawal history array mein add karein
    messages.push({
        role: "user",
        content: userMessage
    });

    // --- Agentic Loop Configuration ---
    // Infinite loop se bachne ke liye limit set ki hai (max 10 baar AI tool call kar sakta hai)
    const MAX_RETRIES = 10;
    let count = 0;

    /**
     * AGENTIC LOOP:
     * Ye loop tab tak chalta hai jab tak AI tool calls khatam karke final jawab na de de.
     */
    while (true) {
        // Safe-exit condition
        if (count > MAX_RETRIES) {
            return 'I could not find the result, please try again.';
        }
        count++;

        // AI Model ko poori history aur tools ki list bhej rahe hain
        const completions = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0, // Consistent answers ke liye 0 rakha hai
            messages: messages,
            tools: [
                {
                    type: "function",
                    function: {
                        name: "webSearch",
                        description: "Search the internet for real-time or unknown info",
                        parameters: {
                            type: "object",
                            properties: {
                                query: {
                                    type: "string",
                                    description: "The search query"
                                },
                            },
                            required: ["query"]
                        }
                    }
                }
            ],
            tool_choice: "auto", // AI khud decide karega kab search karni hai
        });

        const aiResponse = completions.choices[0].message;

        // AI ka response (text ya tool call) history mein add karein taake AI ko context yaad rahe
        messages.push(aiResponse);

        const toolCalls = aiResponse.tool_calls;

        // CASE A: Agar AI ne koi tool call nahi kiya (Final Answer mil gaya) ---
        if (!toolCalls) {
            // Final updated history ko cache mein save karein
            cache.set(threadId, messages);
            return aiResponse.content;
        }

        // CASE B: Agar AI ne Tool Call kiya hai (Internet search ki request) ---
        for (const tool of toolCalls) {
            const functionName = tool.function.name;
            const functionParams = tool.function.arguments;

            if (functionName === "webSearch") {
                // Tool call ke arguments ko parse karke search function chalana
                const toolResult = await webSearch(JSON.parse(functionParams));

                // Search ka result "role: tool" ke sath history mein save karna
                // tool_call_id dena lazmi hai taake AI ko pata chale ye kis request ka result hai
                messages.push({
                    role: "tool",
                    tool_call_id: tool.id,
                    name: functionName,
                    content: toolResult
                });
            }
        }
        // Loop dobara chalega aur AI ab search results dekh kar final jawab taiyar karega
    }
}


// Helper Function: Tavily API ko call karke search results return karta hai

async function webSearch({ query }) {
    console.log("🔍 Fetching from Web:", query);

    const response = await tvly.search(query);

    // Saare results ke content ko merge karke aik string banana taake AI asani se parh sake
    const finalResult = response.results
        .map(result => `Source: ${result.url}\nContent: ${result.content}`)
        .join('\n\n');

    return finalResult;
}