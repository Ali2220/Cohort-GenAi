import dotenv from 'dotenv';
dotenv.config(); // .env file se API keys (GROQ aur TAVILY) load karne ke liye
import Groq from 'groq-sdk';
import { tavily } from '@tavily/core';

const client = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });


// Ye main function hai jo user ka message leta hai aur AI se process karwata hai
export async function generate(userMessage) {
    const messages = [
        {
            role: "system",
            content: `You are a smart personal assistant.
                    If you know the answer to a question, answer it directly in plain English.
                    If the answer requires real-time, local, or up-to-date information, or if you don’t know the answer, use the available tools to find it.
                    You have access to the following tool:
                    webSearch(query: string): Use this to search the internet for current or unknown information.
                    Decide when to use your own knowledge and when to use the tool.
                    Do not mention the tool unless needed.

                    Examples:
                    Q: What is the capital of France?
                    A: The capital of France is Paris.

                    Q: What’s the weather in Karachi right now?
                    A: (use the search tool to find the latest weather)

                    Q: Who is the Prime Minister of Pakistan?
                    A: The current Prime Minister of Pakistan is Shehbaz Sharif.

                    Q: Tell me the latest IT news.
                    A: (use the search tool to get the latest news)

                    current date and time: ${new Date().toUTCString()}`
        }
    ];

    // User ka sawal history mein add kiya
    messages.push({
        role: "user",
        content: userMessage
    });

    // AGENTIC LOOP: Ye loop tab tak chalega jab tak AI final jawab nahi de deta
    // (Agar AI ko tool chahiye, to wo tool call karega aur phir wapas is loop ke upar ayega)
    while (true) {
        const completions = await client.chat.completions.create({
            model: "openai/gpt-oss-120b",
            temperature: 0,
            messages: messages,
            tools: [
                {
                    type: "function",
                    function: {
                        name: "webSearch",
                        description: "Search the internet",
                        parameters: {
                            type: "object",
                            properties: {
                                query: {
                                    type: "string",
                                    description: "The search query to perform search on"
                                },
                            },
                            required: ["query"]
                        }
                    }
                }
            ],
            tool_choice: "auto", // AI khud faisla karega ke internet search karni hai ya nahi
        });

        // AI ka response nikaala
        const aiResponse = completions.choices[0].message;

        // AI ka ye response (chahe wo text ho ya tool call) history mein add kiya
        messages.push(aiResponse);

        // Check kiya ke kya AI ne koi tool call kiya hai?
        const toolCalls = aiResponse.tool_calls;

        // CASE A: Agar AI ko tool ki zaroorat NAHI hai (Final Answer mil gaya)
        if (!toolCalls) {
            // Seedha jawab return kar do frontend ko
            return aiResponse.content;
        }

        // CASE B: Agar AI ne Tool Call kiya hai (Matlab usay internet search karni hai)
        for (const tool of toolCalls) {
            const functionName = tool.function.name;
            const functionParams = tool.function.arguments;

            if (functionName === "webSearch") {
                // AI ke diye huye 'query' argument ko use karke internet search ki
                // JSON.parse is liye taake string se object ban jaye {query: "..."}
                const toolResult = await webSearch(JSON.parse(functionParams));

                // Search ka result history mein "tool" role ke sath add kiya
                // tool_call_id dena zaroori hai taake AI ko pata chale ye kis request ka answer hai
                messages.push({
                    role: "tool",
                    tool_call_id: tool.id,
                    name: functionName,
                    content: toolResult
                });
            }
        }
        // Yahan loop khatam nahi hua, balkay wapas upar jayega 
        // Ab AI ke paas purani history + tool results hain, wo final jawab dega.
    }
}


// Helper function: Tavily API ko call karke results ko text mein badalta hai

async function webSearch({ query }) {
    console.log("🔍 Calling Web Search for:", query);

    const response = await tvly.search(query);

    // Saare search results ka main content nikaal kar aik bara string bana diya
    const finalResult = response.results.map(result => result.content).join('\n\n');

    return finalResult;
}