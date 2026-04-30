import dotenv from 'dotenv';
dotenv.config(); // .env file se API keys load karne ke liye
import Groq from 'groq-sdk';
import { tavily } from '@tavily/core';

// Groq SDK ko initialize kiya (LLM access)
const client = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Tavily SDK ko initialize kiya (Search Engine access)
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

export async function generate(userMessage) {

    const messages = [
        {
            role: "system",
            content: `You are a helpful assistant. If you need to find current information, use the webSearch tool. Always provide a clear answer after receiving tool results.
                `
        }
    ];

    messages.push({
        role: "user",
        content: userMessage
    });

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
            tool_choice: "auto", // AI khud faisla karega ke search karni hai ya nahi
        });

        // AI ka raw response history mein save kar liya
        const aiResponse = completions.choices[0].message;
        messages.push(aiResponse);

        const toolCalls = aiResponse.tool_calls;

        // AGAR AI KO TOOL KI ZAROORAT NAHI:
        if (!toolCalls) {
            return completions.choices[0].message.content
        }

        // AGAR AI NE TOOL CALL KIYA HAI:
        for (const tool of toolCalls) {
            const functionName = tool.function.name;
            const functionParams = tool.function.arguments;

            if (functionName === "webSearch") {
                // Search function ko call kiya AI ke diye huye arguments ke sath
                const toolResult = await webSearch(JSON.parse(functionParams));

                // Search ka result history mein "tool" role ke sath add kiya
                // Ye zaroori hai taake AI isay parh kar final jawab de sakay
                messages.push({
                    role: "tool",
                    tool_call_id: tool.id,
                    name: functionName,
                    content: toolResult
                });
            }
        }
        // Yahan se loop wapas upar jayega aur AI ko search results mil chuke honge
    }


}


// Helper function jo Tavily API use karke internet se data lata hai

async function webSearch({ query }) {
    console.log("🔍 Calling Web Search for:", query);

    const response = await tvly.search(query);

    // Tamam search results ke content ko aik lambay text mein join kar diya
    const finalResult = response.results.map(result => result.content).join('\n\n');

    return finalResult;
}