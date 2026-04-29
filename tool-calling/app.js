import dotenv from 'dotenv';
dotenv.config(); // .env file se API keys load karne ke liye
import Groq from 'groq-sdk';
import { tavily } from '@tavily/core';
import readLine from 'node:readline/promises'; // Terminal se input lene ke liye

// Groq SDK ko initialize kiya (LLM access)
const client = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Tavily SDK ko initialize kiya (Search Engine access)
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

async function main() {
    // Terminal input/output interface banaya
    const rl = readLine.createInterface({ input: process.stdin, output: process.stdout });

    // Messages array: Ye hamari puri conversation history store karega
    const messages = [
        {
            role: "system",
            content: `You are a smart personal assistant who answers the asked questions.
                You have access to following tools:
                1. webSearch({query}: {query: string}) // Search the latest information and real-time data on the internet
                `
        }
    ];

    // OUTER LOOP: Ye loop chalta rahega jab tak user "exit" nahi likhta
    while (true) {
        const question = await rl.question("You: "); // User se sawal poocha

        if (question.toLowerCase() === "exit") {
            break; // Loop khatam
        }

        // User ka sawal history mein add kiya
        messages.push({
            role: "user",
            content: question
        });

        // INNER LOOP (Agentic Loop): Ye loop tab tak chalega jab tak AI tools use kar raha hai
        while (true) {
            // LLM ko current history aur tools ki list bheji
            const completions = await client.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                temperature: 0, // Zero temperature taake jawab factual aur consistent ho
                messages: messages,
                tools: [
                    {
                        type: "function",
                        function: {
                            name: "webSearch",
                            description: "Search the latest information and real-time data on the internet",
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
                // To final jawab console par dikhao aur inner loop se bahar nikal jao
                console.log(`Assistant: ${aiResponse.content}`);
                break;
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

    rl.close(); // Input band kiya
}

main();

/**
 * Helper function jo Tavily API use karke internet se data lata hai
 */
async function webSearch({ query }) {
    console.log("🔍 Calling Web Search for:", query);

    const response = await tvly.search(query);

    // Tamam search results ke content ko aik lambay text mein join kar diya
    const finalResult = response.results.map(result => result.content).join('\n\n');

    return finalResult;
}